import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import {
  fileURLToPath
} from "node:url";

import {
  Server
} from "socket.io";

import {
  normalizeCard,
  makeCardIndex
} from "../src/game/cardAdapter.js";

import {
  createMatch,
  validateDeck
} from "../src/game/state.js";

import {
  applyGameAction
} from "../src/game/reducer.js";

import {
  registerMatchmaking
} from "./matchmaking.mjs";

const __dirname =
  path.dirname(
    fileURLToPath(
      import.meta.url
    )
  );

const root =
  path.resolve(
    __dirname,
    ".."
  );

const dataDir =
  path.join(
    root,
    "src",
    "data"
  );

const rawCards =
  fs
    .readdirSync(
      dataDir
    )
    .filter(
      (name) =>
        name
          .toLowerCase()
          .endsWith(
            ".json"
          )
    )
    .flatMap(
      (name) => {
        const parsed =
          JSON.parse(
            fs.readFileSync(
              path.join(
                dataDir,
                name
              ),
              "utf8"
            )
          );

        return Array.isArray(
          parsed
        )
          ? parsed
          : Array.isArray(
              parsed?.cards
            )
            ? parsed.cards
            : [];
      }
    );

const uniqueCards =
  new Map();

for (
  const raw of
  rawCards
) {
  const card =
    normalizeCard(
      raw
    );

  if (
    card.id &&
    card.id !==
      "unknown"
  ) {
    uniqueCards.set(
      card.id,
      card
    );
  }
}

const cardIndex =
  makeCardIndex([
    ...uniqueCards.values()
  ]);

const PORT =
  Number(
    process.env.PORT ||
      3001
  );

const CORS_ORIGIN =
  process.env
    .CORS_ORIGIN ||
  "*";

const server =
  http.createServer(
    (req, res) => {
      if (
        req.url ===
        "/health"
      ) {
        res.writeHead(
          200,
          {
            "content-type":
              "application/json"
          }
        );

        res.end(
          JSON.stringify({
            ok: true,
            rooms:
              rooms.size,
            cards:
              cardIndex.size
          })
        );

        return;
      }

      res.writeHead(
        404
      );

      res.end();
    }
  );

const io =
  new Server(
    server,
    {
      cors: {
        origin:
          CORS_ORIGIN
      }
    }
  );

const rooms =
  new Map();

function code() {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  return Array.from(
    {
      length: 6
    },
    () =>
      alphabet[
        Math.floor(
          Math.random() *
            alphabet.length
        )
      ]
  ).join("");
}

function resumeToken() {
  return crypto
    .randomBytes(24)
    .toString(
      "base64url"
    );
}

function normalizePlayerColor(
  value
) {
  const color =
    String(
      value || ""
    ).trim();

  if (
    /^#[0-9a-fA-F]{6}$/.test(
      color
    )
  ) {
    return color;
  }

  return null;
}

function publicProfile(
  profile = {}
) {
  return {
    name:
      String(
        profile.name ||
          "Jogador"
      ).slice(
        0,
        40
      ),

    avatar:
      typeof profile.avatar ===
      "string"
        ? profile.avatar.slice(
            0,
            250000
          )
        : null,

    playerColor:
      normalizePlayerColor(
        profile.playerColor
      )
  };
}

function sanitizeMatch(
  match,
  viewerPlayerId
) {
  if (!match) {
    return null;
  }

  const clone =
    structuredClone(
      match
    );

  for (
    const [
      playerId,
      player
    ] of
    Object.entries(
      clone.players
    )
  ) {
    if (
      playerId !==
      viewerPlayerId
    ) {
      player.hand =
        player.hand.map(
          (card) => ({
            instanceId:
              card.instanceId,

            hidden:
              true
          })
        );

      if (
        player.burst
      ) {
        player.burst = {
          instanceId:
            player.burst
              .instanceId,

          hidden:
            true,

          faceDown:
            true
        };
      }
    }
  }

  return clone;
}

function roomSummary(
  room,
  viewerId
) {
  const players =
    Object.fromEntries(
      Object.entries(
        room.players
      ).map(
        ([
          id,
          player
        ]) => [
          id,

          player
            ? {
                profile:
                  player.profile,

                connected:
                  Boolean(
                    player.socketId
                  )
              }
            : null
        ]
      )
    );

  return {
    code:
      room.code,

    hostPlayerId:
      "player1",

    viewerPlayerId:
      viewerId,

    started:
      Boolean(
        room.match
      ),

    players,

    match:
      sanitizeMatch(
        room.match,
        viewerId
      )
  };
}

function emitRoom(
  room
) {
  for (
    const [
      playerId,
      player
    ] of
    Object.entries(
      room.players
    )
  ) {
    if (
      !player?.socketId
    ) {
      continue;
    }

    io
      .to(
        player.socketId
      )
      .emit(
        "room:state",
        roomSummary(
          room,
          playerId
        )
      );
  }
}

function findRoomBySocket(
  socketId
) {
  for (
    const room of
    rooms.values()
  ) {
    for (
      const [
        playerId,
        player
      ] of
      Object.entries(
        room.players
      )
    ) {
      if (
        player?.socketId ===
        socketId
      ) {
        return {
          room,
          playerId
        };
      }
    }
  }

  return null;
}

function onSafe(
  socket,
  eventName,
  handler
) {
  socket.on(
    eventName,
    (
      payload = {},
      ack = () => {}
    ) => {
      const reply =
        typeof ack ===
        "function"
          ? ack
          : () => {};

      try {
        const result =
          handler(
            payload ??
              {},
            reply
          );

        if (
          result &&
          typeof result.then ===
            "function"
        ) {
          result.catch(
            (error) => {
              console.error(
                `[${eventName}]`,
                error
              );

              reply({
                ok: false,
                error:
                  "Erro interno do servidor. Consulte o terminal do servidor."
              });
            }
          );
        }
      } catch (
        error
      ) {
        console.error(
          `[${eventName}]`,
          error
        );

        reply({
          ok: false,
          error:
            "Erro interno do servidor. Consulte o terminal do servidor."
        });
      }
    }
  );
}

/*
 * MATCHMAKING v2.3.0
 *
 * Apenas encontra dois jogadores.
 * A partida continuará usando
 * room:create / room:join / room:start.
 */
registerMatchmaking(
  io
);

io.on(
  "connection",
  (socket) => {
    onSafe(
      socket,
      "room:create",
      (
        payload,
        ack
      ) => {
        const validation =
          validateDeck(
            payload.deck ||
              [],
            cardIndex
          );

        if (
          !validation.ok
        ) {
          return ack({
            ok: false,
            error:
              validation.errors.join(
                " "
              )
          });
        }

        let roomCode =
          code();

        while (
          rooms.has(
            roomCode
          )
        ) {
          roomCode =
            code();
        }

        const room = {
          code:
            roomCode,

          players: {
            player1: {
              socketId:
                socket.id,

              profile:
                publicProfile(
                  payload.profile
                ),

              deck:
                payload.deck,

              resumeToken:
                resumeToken()
            },

            player2:
              null
          },

          match:
            null,

          createdAt:
            Date.now()
        };

        rooms.set(
          roomCode,
          room
        );

        socket.join(
          roomCode
        );

        ack({
          ok: true,

          code:
            roomCode,

          playerId:
            "player1",

          resumeToken:
            room.players
              .player1
              .resumeToken,

          state:
            roomSummary(
              room,
              "player1"
            )
        });

        emitRoom(
          room
        );
      }
    );

    onSafe(
      socket,
      "room:join",
      (
        payload,
        ack
      ) => {
        const roomCode =
          String(
            payload.code ||
              ""
          )
            .trim()
            .toUpperCase();

        const room =
          rooms.get(
            roomCode
          );

        if (!room) {
          return ack({
            ok: false,
            error:
              "Sala não encontrada."
          });
        }

        if (
          room.players
            .player2
        ) {
          return ack({
            ok: false,
            error:
              "Sala cheia."
          });
        }

        const validation =
          validateDeck(
            payload.deck ||
              [],
            cardIndex
          );

        if (
          !validation.ok
        ) {
          return ack({
            ok: false,
            error:
              validation.errors.join(
                " "
              )
          });
        }

        room.players.player2 = {
          socketId:
            socket.id,

          profile:
            publicProfile(
              payload.profile
            ),

          deck:
            payload.deck,

          resumeToken:
            resumeToken()
        };

        socket.join(
          roomCode
        );

        ack({
          ok: true,

          code:
            roomCode,

          playerId:
            "player2",

          resumeToken:
            room.players
              .player2
              .resumeToken,

          state:
            roomSummary(
              room,
              "player2"
            )
        });

        emitRoom(
          room
        );
      }
    );

    onSafe(
      socket,
      "room:resume",
      (
        payload,
        ack
      ) => {
        const roomCode =
          String(
            payload.code ||
              ""
          )
            .trim()
            .toUpperCase();

        const playerId =
          payload.playerId ===
          "player2"
            ? "player2"
            : "player1";

        const room =
          rooms.get(
            roomCode
          );

        const player =
          room
            ?.players
            ?.[playerId];

        if (
          !room ||
          !player ||
          !payload.resumeToken ||
          player.resumeToken !==
            payload.resumeToken
        ) {
          return ack({
            ok: false,
            error:
              "Não foi possível retomar esta sessão."
          });
        }

        player.socketId =
          socket.id;

        socket.join(
          roomCode
        );

        ack({
          ok: true,

          state:
            roomSummary(
              room,
              playerId
            )
        });

        emitRoom(
          room
        );
      }
    );

    onSafe(
      socket,
      "room:start",
      (
        payload,
        ack
      ) => {
        const found =
          findRoomBySocket(
            socket.id
          );

        if (!found) {
          return ack({
            ok: false,
            error:
              "Você não está em uma sala."
          });
        }

        const {
          room,
          playerId
        } = found;

        if (
          playerId !==
          "player1"
        ) {
          return ack({
            ok: false,
            error:
              "Apenas o host inicia a partida."
          });
        }

        if (
          !room.players
            .player2
        ) {
          return ack({
            ok: false,
            error:
              "Aguardando o segundo jogador."
          });
        }

        const firstPlayerId =
          payload.firstPlayerId ===
          "player2"
            ? "player2"
            : "player1";

        room.match =
          createMatch({
            player1: {
              ...room.players
                .player1
                .profile,

              deck:
                room.players
                  .player1
                  .deck
            },

            player2: {
              ...room.players
                .player2
                .profile,

              deck:
                room.players
                  .player2
                  .deck
            },

            firstPlayerId,

            cardIndex
          });

        emitRoom(
          room
        );

        ack({
          ok: true
        });
      }
    );

    onSafe(
      socket,
      "game:action",
      (
        payload,
        ack
      ) => {
        const found =
          findRoomBySocket(
            socket.id
          );

        if (!found) {
          return ack({
            ok: false,
            error:
              "Sala não encontrada."
          });
        }

        const {
          room,
          playerId
        } = found;

        if (
          !room.match
        ) {
          return ack({
            ok: false,
            error:
              "Partida ainda não iniciada."
          });
        }

        const result =
          applyGameAction(
            room.match,
            payload.action,
            playerId,
            cardIndex
          );

        if (
          !result.ok
        ) {
          return ack(
            result
          );
        }

        room.match =
          result.match;

        emitRoom(
          room
        );

        ack({
          ok: true,

          manualResolutionNeeded:
            result.manualResolutionNeeded,

          notes:
            result.notes
        });
      }
    );

    socket.on(
      "disconnect",
      () => {
        const found =
          findRoomBySocket(
            socket.id
          );

        if (!found) {
          return;
        }

        found
          .room
          .players[
            found.playerId
          ]
          .socketId =
          null;

        emitRoom(
          found.room
        );

        setTimeout(
          () => {
            const room =
              rooms.get(
                found
                  .room
                  .code
              );

            if (!room) {
              return;
            }

            const anyConnected =
              Object
                .values(
                  room.players
                )
                .filter(
                  Boolean
                )
                .some(
                  (player) =>
                    player.socketId
                );

            if (
              !anyConnected
            ) {
              rooms.delete(
                room.code
              );
            }
          },
          30 *
            60 *
            1000
        ).unref?.();
      }
    );
  }
);

server.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Battle Spirits online server listening on :${PORT} with ${cardIndex.size} cards.`
    );
  }
);