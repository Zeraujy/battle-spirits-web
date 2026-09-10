import crypto from "node:crypto";

const queue = [];
const pairs = new Map();

function createPairId() {
  return crypto
    .randomBytes(12)
    .toString("hex");
}

function removeFromQueue(
  socketId
) {
  let index =
    queue.indexOf(
      socketId
    );

  while (
    index !== -1
  ) {
    queue.splice(
      index,
      1
    );

    index =
      queue.indexOf(
        socketId
      );
  }
}

function isConnected(
  io,
  socketId
) {
  return io.sockets.sockets.has(
    socketId
  );
}

function findPairBySocket(
  socketId
) {
  for (
    const pair of
    pairs.values()
  ) {
    if (
      pair.hostSocketId ===
        socketId ||
      pair.guestSocketId ===
        socketId
    ) {
      return pair;
    }
  }

  return null;
}

function otherSocketId(
  pair,
  socketId
) {
  if (
    pair.hostSocketId ===
    socketId
  ) {
    return pair.guestSocketId;
  }

  return pair.hostSocketId;
}

function failPair(
  io,
  pair,
  sourceSocketId,
  reason
) {
  if (!pair) {
    return;
  }

  const other =
    otherSocketId(
      pair,
      sourceSocketId
    );

  if (
    other &&
    isConnected(
      io,
      other
    )
  ) {
    io
      .to(other)
      .emit(
        "matchmaking:failed",
        {
          error:
            reason ||
            "A busca foi interrompida."
        }
      );
  }

  pairs.delete(
    pair.id
  );
}

export function registerMatchmaking(
  io
) {
  io.on(
    "connection",
    (socket) => {
      socket.on(
        "matchmaking:join",
        (
          _payload = {},
          ack = () => {}
        ) => {
          removeFromQueue(
            socket.id
          );

          const existingPair =
            findPairBySocket(
              socket.id
            );

          if (
            existingPair
          ) {
            return ack({
              ok: false,
              error:
                "Você já está sendo conectado a outro jogador."
            });
          }

          /*
           * Remove jogadores que já
           * desconectaram da fila.
           */
          for (
            let i =
              queue.length -
              1;
            i >= 0;
            i -= 1
          ) {
            if (
              !isConnected(
                io,
                queue[i]
              )
            ) {
              queue.splice(
                i,
                1
              );
            }
          }

          const opponent =
            queue.find(
              (id) =>
                id !==
                socket.id
            );

          if (
            !opponent
          ) {
            queue.push(
              socket.id
            );

            socket.emit(
              "matchmaking:status",
              {
                status:
                  "searching"
              }
            );

            return ack({
              ok: true,
              searching:
                true
            });
          }

          removeFromQueue(
            opponent
          );

          const pairId =
            createPairId();

          const pair = {
            id: pairId,

            hostSocketId:
              opponent,

            guestSocketId:
              socket.id,

            code: null,

            createdAt:
              Date.now()
          };

          pairs.set(
            pairId,
            pair
          );

          io
            .to(
              opponent
            )
            .emit(
              "matchmaking:host",
              {
                pairId
              }
            );

          socket.emit(
            "matchmaking:guest",
            {
              pairId
            }
          );

          ack({
            ok: true,
            matched:
              true,
            pairId
          });
        }
      );

      /*
       * O host criou a sala
       * usando room:create.
       */
      socket.on(
        "matchmaking:roomReady",
        (
          payload = {},
          ack = () => {}
        ) => {
          const pair =
            pairs.get(
              payload.pairId
            );

          if (!pair) {
            return ack({
              ok: false,
              error:
                "Pareamento expirado."
            });
          }

          if (
            pair.hostSocketId !==
            socket.id
          ) {
            return ack({
              ok: false,
              error:
                "Somente o host pode informar a sala."
            });
          }

          const code =
            String(
              payload.code ||
                ""
            )
              .trim()
              .toUpperCase();

          if (!code) {
            return ack({
              ok: false,
              error:
                "Código de sala inválido."
            });
          }

          pair.code =
            code;

          io
            .to(
              pair.guestSocketId
            )
            .emit(
              "matchmaking:room",
              {
                pairId:
                  pair.id,

                code
              }
            );

          ack({
            ok: true
          });
        }
      );

      /*
       * O guest entrou usando
       * room:join.
       *
       * Agora avisamos o host
       * para usar room:start.
       */
      socket.on(
        "matchmaking:joined",
        (
          payload = {},
          ack = () => {}
        ) => {
          const pair =
            pairs.get(
              payload.pairId
            );

          if (!pair) {
            return ack({
              ok: false,
              error:
                "Pareamento expirado."
            });
          }

          if (
            pair.guestSocketId !==
            socket.id
          ) {
            return ack({
              ok: false,
              error:
                "Jogador inválido."
            });
          }

          io
            .to(
              pair.hostSocketId
            )
            .emit(
              "matchmaking:start",
              {
                pairId:
                  pair.id
              }
            );

          ack({
            ok: true
          });

          /*
           * Não precisamos mais
           * manter o pareamento.
           * A sala original passa
           * a controlar a partida.
           */
          setTimeout(
            () => {
              pairs.delete(
                pair.id
              );
            },
            15000
          ).unref?.();
        }
      );

      socket.on(
        "matchmaking:abort",
        (
          payload = {},
          ack = () => {}
        ) => {
          const pair =
            pairs.get(
              payload.pairId
            );

          failPair(
            io,
            pair,
            socket.id,
            payload.reason ||
              "O outro jogador não conseguiu entrar na partida."
          );

          removeFromQueue(
            socket.id
          );

          ack({
            ok: true
          });
        }
      );

      socket.on(
        "matchmaking:cancel",
        (
          _payload = {},
          ack = () => {}
        ) => {
          removeFromQueue(
            socket.id
          );

          const pair =
            findPairBySocket(
              socket.id
            );

          if (pair) {
            failPair(
              io,
              pair,
              socket.id,
              "O outro jogador cancelou a busca."
            );
          }

          ack({
            ok: true
          });
        }
      );

      socket.on(
        "disconnect",
        () => {
          removeFromQueue(
            socket.id
          );

          const pair =
            findPairBySocket(
              socket.id
            );

          if (pair) {
            failPair(
              io,
              pair,
              socket.id,
              "O outro jogador desconectou durante a busca."
            );
          }
        }
      );
    }
  );
}

export default registerMatchmaking;