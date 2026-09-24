import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Server } from "socket.io";
import { normalizeCard, makeCardIndex } from "../src/game/cardAdapter.js";
import { createMatch, validateDeck } from "../src/game/state.js";
import { applyGameAction } from "../src/game/reducer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadCardIndex() {
  const dataDir = path.join(root, "src", "data");
  const rawCards = fs.readdirSync(dataDir)
    .filter((name) => name.toLowerCase().endsWith(".json"))
    .sort((a, b) => {
      const aBase = a.toLowerCase() === "cards.json";
      const bBase = b.toLowerCase() === "cards.json";
      if (aBase !== bBase) return aBase ? -1 : 1;
      return a.localeCompare(b);
    })
    .flatMap((name) => {
      const parsed = JSON.parse(fs.readFileSync(path.join(dataDir, name), "utf8"));
      return Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.cards) ? parsed.cards : []);
    });

  const uniqueCards = new Map();
  for (const raw of rawCards) {
    const card = normalizeCard(raw);
    if (card.id && card.id !== "unknown") uniqueCards.set(card.id, card);
  }
  return makeCardIndex([...uniqueCards.values()]);
}

export async function createBattleSpiritsServer(options = {}) {
  const cardIndex = loadCardIndex();
  const port = Number(options.port ?? process.env.PORT ?? 3001);
  const host = String(options.host ?? process.env.HOST ?? "0.0.0.0");
  const corsOrigin = options.corsOrigin ?? process.env.CORS_ORIGIN ?? "*";
  const rooms = new Map();
  const matchmakingQueue = [];
  const matchmakingPairs = new Map();
  const matchmakingSocketPair = new Map();

  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({
        ok: true,
        version: "3.2.5",
        rooms: rooms.size,
        cards: cardIndex.size,
        matchmakingQueued: matchmakingQueue.length,
        matchmakingPairs: matchmakingPairs.size,
        host,
        port
      }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const io = new Server(server, {
    cors: {
      origin: corsOrigin,
      methods: ["GET", "POST"]
    }
  });

  io.engine.on("connection_error", (error) => {
    console.error("[socket.io connection_error]", {
      code: error.code,
      message: error.message,
      context: error.context
    });
  });

  function code() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  }

  function resumeToken() {
    return crypto.randomBytes(24).toString("base64url");
  }

  function publicProfile(profile = {}) {
    return {
      name: String(profile.displayName || profile.name || "Jogador").slice(0, 40),
      username: String(profile.username || "").slice(0, 24),
      playerColor: /^#[0-9a-f]{6}$/i.test(String(profile.playerColor || "")) ? profile.playerColor : null,
      avatar: typeof profile.avatar === "string" ? profile.avatar.slice(0, 250000) : null
    };
  }

  function sanitizeMatch(match, viewerPlayerId) {
    if (!match) return null;
    const clone = structuredClone(match);
    for (const [playerId, player] of Object.entries(clone.players)) {
      if (playerId !== viewerPlayerId) {
        player.hand = player.hand.map((card) => ({ instanceId: card.instanceId, hidden: true }));
        player.deck = player.deck.map((card) => ({ instanceId: card.instanceId, hidden: true }));
        if (player.burst) player.burst = { instanceId: player.burst.instanceId, hidden: true, faceDown: true };
      }
    }
    return clone;
  }

  function roomSummary(room, viewerId) {
    const players = Object.fromEntries(
      Object.entries(room.players).map(([id, player]) => [
        id,
        player ? { profile: player.profile, connected: Boolean(player.socketId) } : null
      ])
    );

    return {
      code: room.code,
      hostPlayerId: "player1",
      viewerPlayerId: viewerId,
      started: Boolean(room.match),
      players,
      chat: (room.chat || []).slice(-100),
      match: sanitizeMatch(room.match, viewerId)
    };
  }

  function emitRoom(room) {
    for (const [playerId, player] of Object.entries(room.players)) {
      if (!player?.socketId) continue;
      io.to(player.socketId).emit("room:state", roomSummary(room, playerId));
    }
  }

  function findRoomBySocket(socketId) {
    for (const room of rooms.values()) {
      for (const [playerId, player] of Object.entries(room.players)) {
        if (player?.socketId === socketId) return { room, playerId };
      }
    }
    return null;
  }

  function removeFromMatchmakingQueue(socketId) {
    let removed = false;
    for (let index = matchmakingQueue.length - 1; index >= 0; index -= 1) {
      if (matchmakingQueue[index] !== socketId) continue;
      matchmakingQueue.splice(index, 1);
      removed = true;
    }
    return removed;
  }

  function cleanupMatchmakingPair(pairId, { deleteRoom = false } = {}) {
    const pair = matchmakingPairs.get(pairId);
    if (!pair) return null;

    if (pair.timeout) clearTimeout(pair.timeout);

    matchmakingSocketPair.delete(pair.hostSocketId);
    matchmakingSocketPair.delete(pair.guestSocketId);
    matchmakingPairs.delete(pairId);

    if (deleteRoom && pair.roomCode) {
      const room = rooms.get(pair.roomCode);
      if (room && !room.match) {
        rooms.delete(pair.roomCode);
        io.sockets.sockets.get(pair.hostSocketId)?.leave(pair.roomCode);
        io.sockets.sockets.get(pair.guestSocketId)?.leave(pair.roomCode);
      }
    }

    return pair;
  }

  function failMatchmakingPair(pairId, sourceSocketId, error) {
    const pair = matchmakingPairs.get(pairId);
    if (!pair) return false;

    const message = String(error || "A partida rápida foi interrompida.");
    for (const socketId of [pair.hostSocketId, pair.guestSocketId]) {
      if (socketId === sourceSocketId) continue;
      io.to(socketId).emit("matchmaking:failed", { pairId, error: message });
    }

    cleanupMatchmakingPair(pairId, { deleteRoom: true });
    return true;
  }

  function createMatchmakingPair(hostSocketId, guestSocketId) {
    const pairId = crypto.randomUUID();
    const pair = {
      pairId,
      hostSocketId,
      guestSocketId,
      roomCode: null,
      stage: "paired",
      createdAt: Date.now(),
      timeout: null
    };

    pair.timeout = setTimeout(() => {
      const current = matchmakingPairs.get(pairId);
      if (!current) return;

      const error = "Tempo limite ao preparar a partida rápida. Tente procurar novamente.";
      io.to(current.hostSocketId).emit("matchmaking:failed", { pairId, error });
      io.to(current.guestSocketId).emit("matchmaking:failed", { pairId, error });
      cleanupMatchmakingPair(pairId, { deleteRoom: true });
    }, 45_000);
    pair.timeout.unref?.();

    matchmakingPairs.set(pairId, pair);
    matchmakingSocketPair.set(hostSocketId, pairId);
    matchmakingSocketPair.set(guestSocketId, pairId);

    io.to(hostSocketId).emit("matchmaking:host", { pairId });
    io.to(guestSocketId).emit("matchmaking:guest", { pairId });

    return pair;
  }

  function takeQueuedOpponent(excludeSocketId) {
    while (matchmakingQueue.length) {
      const socketId = matchmakingQueue.shift();
      if (!socketId || socketId === excludeSocketId) continue;
      if (matchmakingSocketPair.has(socketId)) continue;
      if (findRoomBySocket(socketId)) continue;

      const queuedSocket = io.sockets.sockets.get(socketId);
      if (!queuedSocket?.connected) continue;
      return socketId;
    }

    return null;
  }

  function onSafe(socket, eventName, handler) {
    socket.on(eventName, (payload = {}, ack = () => {}) => {
      const reply = typeof ack === "function" ? ack : () => {};
      try {
        const result = handler(payload ?? {}, reply);
        if (result && typeof result.then === "function") {
          result.catch((error) => {
            console.error(`[${eventName}]`, error);
            reply({ ok: false, error: "Erro interno do servidor. Consulte o Battle Spirits Server." });
          });
        }
      } catch (error) {
        console.error(`[${eventName}]`, error);
        reply({ ok: false, error: "Erro interno do servidor. Consulte o Battle Spirits Server." });
      }
    });
  }

  io.on("connection", (socket) => {
    console.log(`[socket.io] conectado ${socket.id} via ${socket.conn.transport.name}`);
    socket.conn.once("upgrade", () => {
      console.log(`[socket.io] ${socket.id} upgrade para ${socket.conn.transport.name}`);
    });

    onSafe(socket, "matchmaking:join", (_payload, ack) => {
      if (findRoomBySocket(socket.id)) {
        return ack({ ok: false, error: "Saia da sala atual antes de procurar outra partida." });
      }

      const existingPairId = matchmakingSocketPair.get(socket.id);
      if (existingPairId) {
        return ack({ ok: true, status: "matched", pairId: existingPairId });
      }

      if (matchmakingQueue.includes(socket.id)) {
        socket.emit("matchmaking:status", { status: "searching" });
        return ack({ ok: true, status: "searching" });
      }

      const opponentSocketId = takeQueuedOpponent(socket.id);
      if (!opponentSocketId) {
        matchmakingQueue.push(socket.id);
        socket.emit("matchmaking:status", { status: "searching" });
        return ack({ ok: true, status: "searching" });
      }

      const pair = createMatchmakingPair(opponentSocketId, socket.id);
      ack({ ok: true, status: "matched", pairId: pair.pairId });
    });

    onSafe(socket, "matchmaking:roomReady", (payload, ack) => {
      const pairId = String(payload.pairId || "");
      const pair = matchmakingPairs.get(pairId);
      if (!pair || pair.hostSocketId !== socket.id) {
        return ack({ ok: false, error: "Par de matchmaking inválido ou expirado." });
      }

      const roomCode = String(payload.code || "").trim().toUpperCase();
      const room = rooms.get(roomCode);
      if (!room || room.players.player1?.socketId !== socket.id) {
        return ack({ ok: false, error: "A sala criada para a partida rápida não foi encontrada." });
      }

      pair.roomCode = roomCode;
      pair.stage = "room-ready";
      io.to(pair.guestSocketId).emit("matchmaking:room", { pairId, code: roomCode });
      ack({ ok: true });
    });

    onSafe(socket, "matchmaking:joined", (payload, ack) => {
      const pairId = String(payload.pairId || "");
      const pair = matchmakingPairs.get(pairId);
      if (!pair || pair.guestSocketId !== socket.id) {
        return ack({ ok: false, error: "Par de matchmaking inválido ou expirado." });
      }

      const room = pair.roomCode ? rooms.get(pair.roomCode) : null;
      if (!room || room.players.player2?.socketId !== socket.id) {
        return ack({ ok: false, error: "A entrada na sala da partida rápida não foi confirmada." });
      }

      pair.stage = "joined";
      io.to(pair.hostSocketId).emit("matchmaking:start", { pairId, code: pair.roomCode });
      ack({ ok: true });
    });

    onSafe(socket, "matchmaking:cancel", (_payload, ack) => {
      const removedFromQueue = removeFromMatchmakingQueue(socket.id);
      const pairId = matchmakingSocketPair.get(socket.id);

      if (pairId) {
        failMatchmakingPair(pairId, socket.id, "O outro jogador cancelou a busca.");
      }

      ack({ ok: true, removedFromQueue, cancelledPair: Boolean(pairId) });
    });

    onSafe(socket, "matchmaking:abort", (payload, ack) => {
      removeFromMatchmakingQueue(socket.id);
      const pairId = String(payload.pairId || matchmakingSocketPair.get(socket.id) || "");
      const reason = String(payload.reason || "A partida rápida foi interrompida.");

      if (pairId) {
        failMatchmakingPair(pairId, socket.id, reason);
      }

      ack({ ok: true });
    });
    onSafe(socket, "room:create", (payload, ack) => {
      const validation = validateDeck(payload.deck || [], cardIndex);
      if (!validation.ok) return ack({ ok: false, error: validation.errors.join(" ") });
      let roomCode = code();
      while (rooms.has(roomCode)) roomCode = code();
      const room = {
        code: roomCode,
        players: {
          player1: { socketId: socket.id, profile: publicProfile(payload.profile), deck: payload.deck, resumeToken: resumeToken() },
          player2: null
        },
        match: null,
        chat: [],
        createdAt: Date.now()
      };
      rooms.set(roomCode, room);
      socket.join(roomCode);
      ack({ ok: true, code: roomCode, playerId: "player1", resumeToken: room.players.player1.resumeToken, state: roomSummary(room, "player1") });
      emitRoom(room);
    });

    onSafe(socket, "room:join", (payload, ack) => {
      const roomCode = String(payload.code || "").trim().toUpperCase();
      const room = rooms.get(roomCode);
      if (!room) return ack({ ok: false, error: "Sala não encontrada." });
      if (room.players.player2) return ack({ ok: false, error: "Sala cheia." });
      const validation = validateDeck(payload.deck || [], cardIndex);
      if (!validation.ok) return ack({ ok: false, error: validation.errors.join(" ") });
      room.players.player2 = { socketId: socket.id, profile: publicProfile(payload.profile), deck: payload.deck, resumeToken: resumeToken() };
      socket.join(roomCode);
      ack({ ok: true, code: roomCode, playerId: "player2", resumeToken: room.players.player2.resumeToken, state: roomSummary(room, "player2") });
      emitRoom(room);
    });

    onSafe(socket, "room:resume", (payload, ack) => {
      const roomCode = String(payload.code || "").trim().toUpperCase();
      const playerId = payload.playerId === "player2" ? "player2" : "player1";
      const room = rooms.get(roomCode);
      const player = room?.players?.[playerId];
      if (!room || !player || !payload.resumeToken || player.resumeToken !== payload.resumeToken) {
        return ack({ ok: false, error: "Não foi possível retomar esta sessão." });
      }
      player.socketId = socket.id;
      socket.join(roomCode);
      ack({ ok: true, state: roomSummary(room, playerId) });
      emitRoom(room);
    });

    onSafe(socket, "room:start", (payload, ack) => {
      const found = findRoomBySocket(socket.id);
      if (!found) return ack({ ok: false, error: "Você não está em uma sala." });
      const { room, playerId } = found;
      if (playerId !== "player1") return ack({ ok: false, error: "Apenas o host inicia a partida." });
      if (!room.players.player2) return ack({ ok: false, error: "Aguardando o segundo jogador." });
      const firstPlayerId = payload.firstPlayerId === "player2" ? "player2" : "player1";
      room.match = createMatch({
        player1: { ...room.players.player1.profile, deck: room.players.player1.deck },
        player2: { ...room.players.player2.profile, deck: room.players.player2.deck },
        firstPlayerId,
        cardIndex
      });
      emitRoom(room);

      const pairId = matchmakingSocketPair.get(socket.id);
      if (pairId) cleanupMatchmakingPair(pairId);

      ack({ ok: true });
    });

    onSafe(socket, "room:chat", (payload, ack) => {
      const found = findRoomBySocket(socket.id);
      if (!found) return ack({ ok:false, error:"Sala não encontrada." });
      const text = String(payload.text || "").trim().slice(0, 500);
      if (!text) return ack({ ok:false, error:"Mensagem vazia." });
      const { room, playerId } = found;
      const message = {
        id: crypto.randomUUID(),
        playerId,
        name: room.players[playerId]?.profile?.name || "Jogador",
        text,
        createdAt: Date.now()
      };
      room.chat = [...(room.chat || []).slice(-99), message];
      emitRoom(room);
      ack({ ok:true, message });
    });

    onSafe(socket, "game:action", (payload, ack) => {
      const found = findRoomBySocket(socket.id);
      if (!found) return ack({ ok: false, error: "Sala não encontrada." });
      const { room, playerId } = found;
      if (!room.match) return ack({ ok: false, error: "Partida ainda não iniciada." });
      const result = applyGameAction(room.match, payload.action, playerId, cardIndex);
      if (!result.ok) return ack(result);
      room.match = result.match;
      emitRoom(room);
      ack({ ok: true, manualResolutionNeeded: result.manualResolutionNeeded, notes: result.notes });
    });

    socket.on("disconnect", (reason) => {
      console.log(`[socket.io] desconectado ${socket.id}: ${reason}`);

      removeFromMatchmakingQueue(socket.id);
      const pairId = matchmakingSocketPair.get(socket.id);
      if (pairId) {
        failMatchmakingPair(pairId, socket.id, "O outro jogador desconectou durante o matchmaking.");
      }

      const found = findRoomBySocket(socket.id);
      if (!found) return;
      found.room.players[found.playerId].socketId = null;
      emitRoom(found.room);
      setTimeout(() => {
        const room = rooms.get(found.room.code);
        if (!room) return;
        const anyConnected = Object.values(room.players).filter(Boolean).some((p) => p.socketId);
        if (!anyConnected) rooms.delete(room.code);
      }, 30 * 60 * 1000).unref?.();
    });
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const api = {
    server,
    io,
    rooms,
    cardIndex,
    port,
    host,
    getStats() {
      const connectedPlayers = [...rooms.values()].reduce((sum, room) => {
        return sum + Object.values(room.players).filter((p) => p?.socketId).length;
      }, 0);
      return {
        running: server.listening,
        port,
        host,
        cards: cardIndex.size,
        rooms: rooms.size,
        connectedPlayers,
        matchmakingQueued: matchmakingQueue.length,
        matchmakingPairs: matchmakingPairs.size
      };
    },
    async stop() {
      await new Promise((resolve) => io.close(() => resolve()));
      if (server.listening) await new Promise((resolve) => server.close(() => resolve()));
    }
  };

  return api;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) {
  createBattleSpiritsServer().then((instance) => {
    console.log(`Battle Spirits online server listening on :${instance.port} with ${instance.cardIndex.size} cards.`);
  }).catch((error) => {
    console.error("Falha ao iniciar Battle Spirits Server:", error);
    process.exitCode = 1;
  });
}
