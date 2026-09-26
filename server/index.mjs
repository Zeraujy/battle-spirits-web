import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Server } from "socket.io";
import { createClient } from "@supabase/supabase-js";
import { normalizeCard, makeCardIndex } from "../src/game/cardAdapter.js";
import { createMatch, validateDeck } from "../src/game/state.js";
import { applyGameAction } from "../src/game/reducer.js";
import {
  normalizeCustomMatchSettings,
  resolveFirstPlayerId,
  deckValidationOptionsForSettings
} from "../src/online/customMatchSettings.js";

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
  const rankedQueue = [];
  const rankedBySocket = new Map();
  const lobbyPresence = new Map();
  const rankedSeason = "S0";
  const supabaseUrl = String(options.supabaseUrl ?? process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "");
  const supabaseServiceKey = String(options.supabaseServiceKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");
  const rankedSupabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false, autoRefreshToken: false } }) : null;

  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({
        ok: true,
        version: "3.9.8",
        rooms: rooms.size,
        cards: cardIndex.size,
        matchmakingQueued: matchmakingQueue.length,
        matchmakingPairs: matchmakingPairs.size,
        rankedQueued: rankedQueue.length,
        rankedReady: Boolean(rankedSupabase),
        host,
        port
      }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const io = new Server(server, {
    // Online identity is intentionally tiny in v3.3.1e. Keep a conservative
    // transport ceiling so an accidental banner/base64 profile cannot flood
    // the room server.
    maxHttpBufferSize: 512 * 1024,
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

  const ONLINE_AVATAR_MAX_CHARS = 120_000;
  const ONLINE_PROFILE_MAX_JSON_CHARS = 160_000;
  const DATA_IMAGE_PATTERN = /^data:image\/(?:png|jpe?g|webp|gif);base64,/i;
  const REMOTE_IMAGE_PATTERN = /^https?:\/\//i;

  function sanitizePublicAvatar(value) {
    if (typeof value !== "string") return null;
    const source = value.trim();
    if (!source) return null;
    if (REMOTE_IMAGE_PATTERN.test(source)) return source.length <= 2_048 ? source : null;
    if (DATA_IMAGE_PATTERN.test(source)) return source.length <= ONLINE_AVATAR_MAX_CHARS ? source : null;
    return null;
  }

  function validateOnlineProfilePayload(profile = {}) {
    let size = 0;
    try { size = JSON.stringify(profile || {}).length; }
    catch { return { ok: false, error: "Perfil Online inválido." }; }

    if (size > ONLINE_PROFILE_MAX_JSON_CHARS) {
      return {
        ok: false,
        error: "Não foi possível usar este perfil no Online. Atualize o jogo e tente novamente."
      };
    }

    return { ok: true };
  }

  function publicProfile(profile = {}) {
    return {
      name: String(profile.displayName || profile.name || "Jogador").replace(/\s+/g, " ").trim().slice(0, 40) || "Jogador",
      username: String(profile.username || "").replace(/\s+/g, " ").trim().slice(0, 24),
      playerColor: /^#[0-9a-f]{6}$/i.test(String(profile.playerColor || "")) ? profile.playerColor : null,
      avatar: sanitizePublicAvatar(profile.avatar)
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

  function normalizeRoomTitle(value, fallback = "Sala de Battle Spirits") {
    const clean = String(value || "").replace(/\s+/g, " ").trim().slice(0, 48);
    return clean || fallback;
  }

  function hashRoomPassword(value) {
    const password = String(value || "").slice(0, 128);
    if (!password) return null;
    return crypto.createHash("sha256").update(password).digest("hex");
  }

  function roomDirectoryEntry(room) {
    const host = room.players?.player1?.profile || {};
    return {
      code: room.code,
      title: room.settings?.title || "Sala de Battle Spirits",
      visibility: room.settings?.visibility || "private",
      locked: Boolean(room.settings?.passwordHash),
      spectatorsAllowed: Boolean(room.settings?.spectatorsAllowed),
      started: Boolean(room.match),
      createdAt: room.createdAt,
      host: {
        name: host.name || "Jogador",
        username: host.username || "",
        avatar: host.avatar || null
      },
      players: Object.values(room.players || {}).filter(Boolean).length,
      capacity: 2,
      custom: normalizeCustomMatchSettings(room.settings)
    };
  }

  function presenceStatus(socketId) {
    if (rankedBySocket.has(socketId)) return "ranked";
    if (matchmakingQueue.includes(socketId) || matchmakingSocketPair.has(socketId)) return "searching";
    const found = findRoomBySocket(socketId);
    if (found?.room?.match) return "in_match";
    if (found?.room) return "in_room";
    return "available";
  }

  function lobbySnapshot() {
    const publicRooms = [...rooms.values()]
      .filter((room) => room.settings?.visibility === "public" && Boolean(room.players?.player1?.socketId))
      .map(roomDirectoryEntry)
      .sort((a, b) => Number(a.started) - Number(b.started) || b.createdAt - a.createdAt);

    const players = [...lobbyPresence.entries()]
      .map(([socketId, value]) => ({
        id: socketId,
        profile: value.profile,
        status: presenceStatus(socketId)
      }))
      .sort((a, b) => {
        const order = { available: 0, searching: 1, in_room: 2, in_match: 3, ranked: 4 };
        return (order[a.status] ?? 9) - (order[b.status] ?? 9) || String(a.profile?.name || "").localeCompare(String(b.profile?.name || ""));
      });

    return {
      rooms: publicRooms,
      players,
      counts: {
        online: players.length,
        available: players.filter((item) => item.status === "available").length,
        publicRooms: publicRooms.length,
        activeMatches: [...rooms.values()].filter((room) => Boolean(room.match)).length
      },
      updatedAt: Date.now()
    };
  }

  function emitLobbySnapshot() {
    io.emit("lobby:snapshot", lobbySnapshot());
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
      match: sanitizeMatch(room.match, viewerId),
      ranked: room.ranked ? { season: room.ranked.season } : null,
      settings: {
        title: room.settings?.title || "Sala de Battle Spirits",
        visibility: room.settings?.visibility || "private",
        locked: Boolean(room.settings?.passwordHash),
        spectatorsAllowed: Boolean(room.settings?.spectatorsAllowed),
        ...normalizeCustomMatchSettings(room.settings)
      },
      turnClock: room.turnClock ? { ...room.turnClock } : null
    };
  }

  function clearTurnTimer(room) {
    if (room?.turnTimerHandle) clearTimeout(room.turnTimerHandle);
    if (room) {
      room.turnTimerHandle = null;
      room.turnClock = null;
    }
  }

  function syncTurnTimer(room, force = false) {
    if (!room?.match || room.match.winnerId || room.ranked) {
      clearTurnTimer(room);
      return;
    }
    const seconds = Number(room.settings?.turnTimerSeconds || 0);
    if (!seconds) {
      clearTurnTimer(room);
      return;
    }
    const key = `${room.match.id}:${room.match.turnNumber}:${room.match.activePlayerId}`;
    if (!force && room.turnClock?.key === key && room.turnTimerHandle) return;
    clearTurnTimer(room);
    const deadline = Date.now() + seconds * 1000;
    room.turnClock = {
      key,
      deadline,
      seconds,
      turnNumber: room.match.turnNumber,
      activePlayerId: room.match.activePlayerId
    };
    room.turnTimerHandle = setTimeout(() => {
      const current = rooms.get(room.code);
      if (!current?.match || current.match.winnerId || current.turnClock?.key !== key) return;
      const timedOutId = current.match.activePlayerId;
      const winnerId = timedOutId === "player1" ? "player2" : "player1";
      current.match = { ...current.match, winnerId, winnerReason: "turn_timeout" };
      clearTurnTimer(current);
      emitRoom(current);
      emitLobbySnapshot();
    }, seconds * 1000);
    room.turnTimerHandle.unref?.();
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



  function rankedProfileLabel(rp = 1000) {
    const value = Math.max(0, Number(rp || 0));
    const div = (floor) => value - floor >= 200 ? "I" : value - floor >= 100 ? "II" : "III";
    if (value >= 2400) return "MASTER";
    if (value >= 2100) return `DIAMOND ${div(2100)}`;
    if (value >= 1800) return `PLATINUM ${div(1800)}`;
    if (value >= 1500) return `GOLD ${div(1500)}`;
    if (value >= 1200) return `SILVER ${div(1200)}`;
    return `BRONZE ${div(900)}`;
  }

  function removeFromRankedQueue(socketId) {
    const index = rankedQueue.findIndex((entry) => entry.socketId === socketId);
    if (index < 0) return null;
    const [entry] = rankedQueue.splice(index, 1);
    rankedBySocket.delete(socketId);
    return entry;
  }

  async function rankedIdentity(accessToken) {
    if (!rankedSupabase) return { ok: false, error: "Ranked indisponível no momento." };
    const token = String(accessToken || "").trim();
    if (!token) return { ok: false, error: "Sessão Ranked inválida." };
    const { data, error } = await rankedSupabase.auth.getUser(token);
    if (error || !data?.user) return { ok: false, error: "Não foi possível validar sua conta Ranked." };
    return { ok: true, user: data.user };
  }

  async function ensureRankedProfile(userId) {
    const { data: found } = await rankedSupabase.from("bs_ranked_profiles")
      .select("user_id,season,rp,peak_rp,wins,losses,placements")
      .eq("user_id", userId).eq("season", rankedSeason).maybeSingle();
    if (found) return found;
    const row = { user_id: userId, season: rankedSeason, rp: 1000, peak_rp: 1000, wins: 0, losses: 0, placements: 0 };
    const { data, error } = await rankedSupabase.from("bs_ranked_profiles").insert(row).select().single();
    if (error) throw error;
    return data;
  }

  function rankedSearchWindow(entry) {
    const seconds = Math.max(0, (Date.now() - entry.queuedAt) / 1000);
    return Math.min(600, 150 + Math.floor(seconds / 20) * 50);
  }

  function findRankedOpponent(entry) {
    let bestIndex = -1;
    let bestGap = Infinity;
    for (let i = 0; i < rankedQueue.length; i += 1) {
      const candidate = rankedQueue[i];
      if (!candidate || candidate.socketId === entry.socketId || candidate.userId === entry.userId) continue;
      const gap = Math.abs(Number(candidate.rp) - Number(entry.rp));
      if (gap > Math.max(rankedSearchWindow(entry), rankedSearchWindow(candidate))) continue;
      if (gap < bestGap) { bestGap = gap; bestIndex = i; }
    }
    return bestIndex;
  }

  function createRankedRoom(a, b) {
    let roomCode = code();
    while (rooms.has(roomCode)) roomCode = code();
    const firstPlayerId = Math.random() < 0.5 ? "player1" : "player2";
    const room = {
      code: roomCode,
      players: {
        player1: { socketId: a.socketId, profile: publicProfile(a.profile), deck: a.deck, resumeToken: resumeToken() },
        player2: { socketId: b.socketId, profile: publicProfile(b.profile), deck: b.deck, resumeToken: resumeToken() }
      },
      match: null, chat: [], createdAt: Date.now(),
      ranked: { season: rankedSeason, settled: false, players: {
        player1: { userId: a.userId, rp: a.rp, deckId: a.deckId || null, deckName: a.deckName || "Deck" },
        player2: { userId: b.userId, rp: b.rp, deckId: b.deckId || null, deckName: b.deckName || "Deck" }
      } }
    };
    room.match = createMatch({
      player1: { ...room.players.player1.profile, deck: room.players.player1.deck },
      player2: { ...room.players.player2.profile, deck: room.players.player2.deck },
      firstPlayerId, cardIndex
    });
    rooms.set(roomCode, room);
    io.sockets.sockets.get(a.socketId)?.join(roomCode);
    io.sockets.sockets.get(b.socketId)?.join(roomCode);
    rankedBySocket.delete(a.socketId); rankedBySocket.delete(b.socketId);
    io.to(a.socketId).emit("ranked:matched", { code: roomCode, playerId: "player1", resumeToken: room.players.player1.resumeToken, opponentRank: rankedProfileLabel(b.rp) });
    io.to(b.socketId).emit("ranked:matched", { code: roomCode, playerId: "player2", resumeToken: room.players.player2.resumeToken, opponentRank: rankedProfileLabel(a.rp) });
    emitRoom(room);
    return room;
  }

  async function settleRankedRoom(room, winnerId, reason = "game") {
    if (!room?.ranked || room.ranked.settled || !winnerId || !rankedSupabase) return;
    const loserId = winnerId === "player1" ? "player2" : "player1";
    const winnerMeta = room.ranked.players[winnerId];
    const loserMeta = room.ranked.players[loserId];
    if (!winnerMeta || !loserMeta) return;

    const expectedWinner = 1 / (1 + Math.pow(10, (loserMeta.rp - winnerMeta.rp) / 400));
    const winDelta = Math.max(12, Math.round(32 * (1 - expectedWinner)));
    const lossDelta = -Math.max(12, Math.round(32 * expectedWinner));
    const winnerAfter = Math.max(0, Number(winnerMeta.rp) + winDelta);
    const loserAfter = Math.max(0, Number(loserMeta.rp) + lossDelta);
    const winnerProfile = room.players[winnerId]?.profile || {};
    const loserProfile = room.players[loserId]?.profile || {};

    const { error } = await rankedSupabase.rpc("bs_ranked_settle_match", {
      p_match_uid: String(room.match?.id || room.code),
      p_season: rankedSeason,
      p_winner_id: winnerMeta.userId,
      p_loser_id: loserMeta.userId,
      p_winner_before: Number(winnerMeta.rp),
      p_loser_before: Number(loserMeta.rp),
      p_winner_delta: winDelta,
      p_loser_delta: lossDelta,
      p_winner_name: winnerProfile.name || "Jogador",
      p_winner_username: winnerProfile.username || null,
      p_loser_name: loserProfile.name || "Jogador",
      p_loser_username: loserProfile.username || null,
      p_winner_deck_id: winnerMeta.deckId || null,
      p_winner_deck_name: winnerMeta.deckName || "Deck",
      p_loser_deck_id: loserMeta.deckId || null,
      p_loser_deck_name: loserMeta.deckName || "Deck",
      p_reason: reason
    });
    if (error) {
      console.error("[ranked:settle]", error);
      room.ranked.settleError = error.message;
      return;
    }

    room.ranked.settled = true;
    const winnerSocket = room.players[winnerId]?.socketId;
    const loserSocket = room.players[loserId]?.socketId;
    if (winnerSocket) io.to(winnerSocket).emit("ranked:result", { result: "win", rpBefore: winnerMeta.rp, rpAfter: winnerAfter, rpDelta: winDelta, rank: rankedProfileLabel(winnerAfter), reason });
    if (loserSocket) io.to(loserSocket).emit("ranked:result", { result: "loss", rpBefore: loserMeta.rp, rpAfter: loserAfter, rpDelta: lossDelta, rank: rankedProfileLabel(loserAfter), reason });
  }

  function onSafe(socket, eventName, handler) {
    socket.on(eventName, (payload = {}, ack = () => {}) => {
      const reply = typeof ack === "function" ? ack : () => {};
      try {
        const result = handler(payload ?? {}, reply);
        if (result && typeof result.then === "function") {
          result.catch((error) => {
            console.error(`[${eventName}]`, error);
            reply({ ok: false, error: "O Online encontrou um problema. Tente novamente." });
          });
        }
      } catch (error) {
        console.error(`[${eventName}]`, error);
        reply({ ok: false, error: "O Online encontrou um problema. Tente novamente." });
      }
    });
  }

  io.on("connection", (socket) => {
    console.log(`[socket.io] conectado ${socket.id} via ${socket.conn.transport.name}`);
    socket.conn.once("upgrade", () => {
      console.log(`[socket.io] ${socket.id} upgrade para ${socket.conn.transport.name}`);
    });

    onSafe(socket, "lobby:identify", (payload, ack) => {
      const validation = validateOnlineProfilePayload(payload?.profile);
      if (!validation.ok) return ack(validation);
      lobbyPresence.set(socket.id, { profile: publicProfile(payload?.profile), identifiedAt: Date.now() });
      const snapshot = lobbySnapshot();
      ack({ ok: true, snapshot });
      emitLobbySnapshot();
    });

    onSafe(socket, "lobby:list", (_payload, ack) => {
      ack({ ok: true, snapshot: lobbySnapshot() });
    });

    onSafe(socket, "ranked:join", async (payload, ack) => {
      if (findRoomBySocket(socket.id)) return ack({ ok: false, error: "Saia da sala atual antes de procurar Ranked." });
      if (rankedBySocket.has(socket.id)) return ack({ ok: true, status: "searching" });
      const identity = await rankedIdentity(payload.accessToken);
      if (!identity.ok) return ack(identity);
      const profileValidation = validateOnlineProfilePayload(payload.profile);
      if (!profileValidation.ok) return ack(profileValidation);
      const validation = validateDeck(payload.deck || [], cardIndex, { regulation: "official" });
      if (!validation.ok) return ack({ ok: false, error: validation.errors.join(" ") });
      const rankedProfile = await ensureRankedProfile(identity.user.id);
      const entry = { socketId: socket.id, userId: identity.user.id, rp: Number(rankedProfile.rp || 1000), profile: payload.profile, deck: payload.deck, deckId: String(payload.deckId || "").slice(0, 96) || null, deckName: String(payload.deckName || "Deck").slice(0, 120), queuedAt: Date.now() };
      const opponentIndex = findRankedOpponent(entry);
      if (opponentIndex < 0) {
        rankedQueue.push(entry); rankedBySocket.set(socket.id, entry);
        socket.emit("ranked:status", { status: "searching", rp: entry.rp, rank: rankedProfileLabel(entry.rp) });
        return ack({ ok: true, status: "searching", rp: entry.rp, rank: rankedProfileLabel(entry.rp) });
      }
      const [opponent] = rankedQueue.splice(opponentIndex, 1);
      rankedBySocket.delete(opponent.socketId);
      rankedBySocket.set(socket.id, entry);
      createRankedRoom(opponent, entry);
      ack({ ok: true, status: "matched" });
    });

    onSafe(socket, "ranked:cancel", (_payload, ack) => {
      const removed = removeFromRankedQueue(socket.id);
      ack({ ok: true, cancelled: Boolean(removed) });
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
        emitLobbySnapshot();
        return ack({ ok: true, status: "searching" });
      }

      const pair = createMatchmakingPair(opponentSocketId, socket.id);
      emitLobbySnapshot();
      ack({ ok: true, status: "matched", pairId: pair.pairId });
    });

    onSafe(socket, "matchmaking:roomReady", (payload, ack) => {
      const pairId = String(payload.pairId || "");
      const pair = matchmakingPairs.get(pairId);
      if (!pair || pair.hostSocketId !== socket.id) {
        return ack({ ok: false, error: "A busca expirou. Procure uma partida novamente." });
      }

      const roomCode = String(payload.code || "").trim().toUpperCase();
      const room = rooms.get(roomCode);
      if (!room || room.players.player1?.socketId !== socket.id) {
        return ack({ ok: false, error: "A partida rápida não está mais disponível. Procure novamente." });
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
        return ack({ ok: false, error: "A busca expirou. Procure uma partida novamente." });
      }

      const room = pair.roomCode ? rooms.get(pair.roomCode) : null;
      if (!room || room.players.player2?.socketId !== socket.id) {
        return ack({ ok: false, error: "Não foi possível entrar na partida rápida. Tente novamente." });
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

      emitLobbySnapshot();
      ack({ ok: true, removedFromQueue, cancelledPair: Boolean(pairId) });
    });

    onSafe(socket, "matchmaking:abort", (payload, ack) => {
      removeFromMatchmakingQueue(socket.id);
      removeFromRankedQueue(socket.id);
      const pairId = String(payload.pairId || matchmakingSocketPair.get(socket.id) || "");
      const reason = String(payload.reason || "A partida rápida foi interrompida.");

      if (pairId) {
        failMatchmakingPair(pairId, socket.id, reason);
      }

      emitLobbySnapshot();
      ack({ ok: true });
    });
    onSafe(socket, "room:create", (payload, ack) => {
      const profileValidation = validateOnlineProfilePayload(payload.profile);
      if (!profileValidation.ok) return ack(profileValidation);
      const customSettings = normalizeCustomMatchSettings(payload?.settings);
      const validation = validateDeck(payload.deck || [], cardIndex, deckValidationOptionsForSettings(customSettings));
      if (!validation.ok) return ack({ ok: false, error: validation.errors.join(" ") });
      let roomCode = code();
      while (rooms.has(roomCode)) roomCode = code();
      const visibility = payload?.settings?.visibility === "public" ? "public" : "private";
      const room = {
        code: roomCode,
        players: {
          player1: { socketId: socket.id, profile: publicProfile(payload.profile), deck: payload.deck, resumeToken: resumeToken() },
          player2: null
        },
        settings: {
          title: normalizeRoomTitle(payload?.settings?.title, `${publicProfile(payload.profile).name} · Casual`),
          visibility,
          passwordHash: hashRoomPassword(payload?.settings?.password),
          spectatorsAllowed: Boolean(payload?.settings?.spectatorsAllowed),
          ...customSettings
        },
        match: null,
        chat: [],
        createdAt: Date.now()
      };
      rooms.set(roomCode, room);
      socket.join(roomCode);
      ack({ ok: true, code: roomCode, playerId: "player1", resumeToken: room.players.player1.resumeToken, state: roomSummary(room, "player1") });
      emitRoom(room);
      emitLobbySnapshot();
    });

    onSafe(socket, "room:join", (payload, ack) => {
      const profileValidation = validateOnlineProfilePayload(payload.profile);
      if (!profileValidation.ok) return ack(profileValidation);
      const roomCode = String(payload.code || "").trim().toUpperCase();
      const room = rooms.get(roomCode);
      if (!room) return ack({ ok: false, error: "Sala não encontrada." });
      if (room.players.player2) return ack({ ok: false, error: "Sala cheia." });
      if (room.settings?.passwordHash && hashRoomPassword(payload?.password) !== room.settings.passwordHash) {
        return ack({ ok: false, error: "Senha da sala incorreta." });
      }
      const validation = validateDeck(payload.deck || [], cardIndex, deckValidationOptionsForSettings(room.settings));
      if (!validation.ok) return ack({ ok: false, error: validation.errors.join(" ") });
      room.players.player2 = { socketId: socket.id, profile: publicProfile(payload.profile), deck: payload.deck, resumeToken: resumeToken() };
      socket.join(roomCode);
      ack({ ok: true, code: roomCode, playerId: "player2", resumeToken: room.players.player2.resumeToken, state: roomSummary(room, "player2") });
      emitRoom(room);
      emitLobbySnapshot();
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
      if (player.rankedDisconnectTimer) { clearTimeout(player.rankedDisconnectTimer); player.rankedDisconnectTimer = null; }
      socket.join(roomCode);
      ack({ ok: true, state: roomSummary(room, playerId) });
      emitRoom(room);
      emitLobbySnapshot();
    });

    onSafe(socket, "room:start", (payload, ack) => {
      const found = findRoomBySocket(socket.id);
      if (!found) return ack({ ok: false, error: "Você não está em uma sala." });
      const { room, playerId } = found;
      if (playerId !== "player1") return ack({ ok: false, error: "Apenas o host inicia a partida." });
      if (!room.players.player2) return ack({ ok: false, error: "Aguardando o segundo jogador." });
      const firstPlayerId = resolveFirstPlayerId(room.settings);
      room.match = createMatch({
        player1: { ...room.players.player1.profile, deck: room.players.player1.deck },
        player2: { ...room.players.player2.profile, deck: room.players.player2.deck },
        firstPlayerId,
        cardIndex
      });
      syncTurnTimer(room, true);
      emitRoom(room);
      emitLobbySnapshot();

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

    onSafe(socket, "room:rematch", (payload, ack) => {
      const found = findRoomBySocket(socket.id);
      if (!found) return ack({ ok: false, error: "Sala não encontrada." });
      const { room, playerId } = found;
      if (!room.match?.winnerId) return ack({ ok: false, error: "A partida ainda não terminou." });
      if (room.ranked) return ack({ ok: false, error: "Ranked exige uma nova busca." });

      room.rematchVotes = { ...(room.rematchVotes || {}), [playerId]: true };
      io.to(room.code).emit("room:rematch-status", { votes: room.rematchVotes });
      const accepted = Boolean(room.rematchVotes.player1 && room.rematchVotes.player2);
      if (!accepted) return ack({ ok: true, started: false });

      const firstPlayerId = resolveFirstPlayerId(room.settings);
      room.match = createMatch({
        player1: { ...room.players.player1.profile, deck: room.players.player1.deck },
        player2: { ...room.players.player2.profile, deck: room.players.player2.deck },
        firstPlayerId,
        cardIndex
      });
      room.rematchVotes = {};
      syncTurnTimer(room, true);
      io.to(room.code).emit("room:rematch-started", { firstPlayerId, matchId: room.match.id });
      emitRoom(room);
      ack({ ok: true, started: true });
    });

    onSafe(socket, "game:action", async (payload, ack) => {
      const found = findRoomBySocket(socket.id);
      if (!found) return ack({ ok: false, error: "Sala não encontrada." });
      const { room, playerId } = found;
      if (!room.match) return ack({ ok: false, error: "Partida ainda não iniciada." });
      if (payload?.action?.type === "MULLIGAN" && room.settings?.mulliganEnabled === false) {
        return ack({ ok: false, error: "Mulligan desativado nas configurações desta sala." });
      }
      const result = applyGameAction(room.match, payload.action, playerId, cardIndex);
      if (!result.ok) return ack(result);
      room.match = result.match;
      if (room.ranked && room.match?.winnerId) await settleRankedRoom(room, room.match.winnerId, room.match.winnerReason || "game");
      syncTurnTimer(room);
      emitRoom(room);
      ack({ ok: true, manualResolutionNeeded: result.manualResolutionNeeded, notes: result.notes });
    });

    socket.on("disconnect", (reason) => {
      console.log(`[socket.io] desconectado ${socket.id}: ${reason}`);

      lobbyPresence.delete(socket.id);
      removeFromMatchmakingQueue(socket.id);
      removeFromRankedQueue(socket.id);
      const pairId = matchmakingSocketPair.get(socket.id);
      if (pairId) {
        failMatchmakingPair(pairId, socket.id, "O outro jogador desconectou durante o matchmaking.");
      }

      const found = findRoomBySocket(socket.id);
      if (!found) { emitLobbySnapshot(); return; }
      found.room.players[found.playerId].socketId = null;
      if (found.room.ranked && found.room.match && !found.room.match.winnerId) {
        const disconnectedId = found.playerId;
        const opponentId = disconnectedId === "player1" ? "player2" : "player1";
        found.room.players[disconnectedId].rankedDisconnectTimer = setTimeout(async () => {
          const room = rooms.get(found.room.code);
          if (!room?.ranked || room.match?.winnerId || room.players[disconnectedId]?.socketId) return;
          room.match = { ...room.match, winnerId: opponentId, winnerReason: "ranked_disconnect" };
          await settleRankedRoom(room, opponentId, "disconnect");
          emitRoom(room);
        }, 90_000);
        found.room.players[disconnectedId].rankedDisconnectTimer.unref?.();
      }
      emitRoom(found.room);
      emitLobbySnapshot();
      setTimeout(() => {
        const room = rooms.get(found.room.code);
        if (!room) return;
        const anyConnected = Object.values(room.players).filter(Boolean).some((p) => p.socketId);
        if (!anyConnected) {
          clearTurnTimer(room);
          rooms.delete(room.code);
          emitLobbySnapshot();
        }
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
        matchmakingPairs: matchmakingPairs.size,
        rankedQueued: rankedQueue.length,
        rankedReady: Boolean(rankedSupabase),
        lobbyOnline: lobbyPresence.size,
        publicRooms: [...rooms.values()].filter((room) => room.settings?.visibility === "public").length
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
