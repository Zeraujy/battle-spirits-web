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
import { MatchMode } from "../src/online/domain/matchModes.js";
import { QueueStatus, QueueType } from "../src/online/domain/queueTypes.js";
import { DisconnectReason, PlayerConnectionState } from "../src/online/domain/matchStatus.js";
import { DEFAULT_RECONNECT_WINDOW_MS } from "../src/online/domain/onlineConstants.js";
import { MatchRegistry, createMatchSession, createDeckSnapshot, validateDeckSnapshot, deckSnapshotPresentation, createPrivateMatchDescriptor, RematchRequest, sanitizeMatchForViewer } from "./matches/index.js";
import { createStateEnvelope, validateClientStateVersion } from "./matches/stateSync.js";
import { ReconnectManager } from "./connections/ReconnectManager.js";
import { Matchmaker, MatchmakingQueue, QueueEntry, ReadyCheckRegistry, RankedMatchmaker } from "./matchmaking/index.js";
import { finalizeMatchResult, buildServerMatchHistoryRecords, persistServerMatchHistory } from "./results/index.js";
import { AbandonPolicy, DisconnectPolicy } from "./policies/index.js";
import { ChallengeRegistry } from "./challenges/index.js";
import { OnlineEventGuard, OnlineGuardCode, constantTimeTokenEqual } from "./security/index.js";

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
  const casualQueue = new MatchmakingQueue({ queueType: QueueType.CASUAL });
  const casualMatchmaker = new Matchmaker({ queue: casualQueue });
  let readyCheckRegistry = null;
  const rankedSeason = "S0";
  const rankedQueue = new MatchmakingQueue({ queueType: QueueType.RANKED });
  let rankedMatchmaker = null;
  const lobbyPresence = new Map();
  const socketRoomIndex = new Map();
  const matchRegistry = new MatchRegistry();
  const reconnectManager = new ReconnectManager({ reconnectWindowMs: DEFAULT_RECONNECT_WINDOW_MS });
  const abandonPolicy = new AbandonPolicy();
  const disconnectPolicy = new DisconnectPolicy({ reconnectWindowMs: DEFAULT_RECONNECT_WINDOW_MS });
  const onlineEventGuard = new OnlineEventGuard();
  let challengeRegistry = null;
  let lastLobbySnapshotSignature = "";
  const supabaseUrl = String(options.supabaseUrl ?? process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "");
  const supabaseServiceKey = String(options.supabaseServiceKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");
  const rankedSupabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false, autoRefreshToken: false } }) : null;

  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({
        ok: true,
        version: "5.0.2",
        rooms: rooms.size,
        cards: cardIndex.size,
        matchmakingQueued: casualQueue.size,
        readyChecks: readyCheckRegistry?.size || 0,
        rankedQueued: rankedQueue.size,
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

  function roomMatchMode(room) {
    if (room?.ranked) return MatchMode.RANKED;
    if (room?.friendChallenge) return MatchMode.FRIEND;
    if (room?.privateMatch) return MatchMode.PRIVATE;
    return MatchMode.CASUAL;
  }

  function getRoomMatchSession(room) {
    if (!room?.matchSessionId) return null;
    return matchRegistry.get(room.matchSessionId);
  }

  function attachRoomMatchSession(room, { replace = false } = {}) {
    if (!room?.match) return null;
    const current = getRoomMatchSession(room);
    if (current && !replace && current.matchId === String(room.match.id)) return current;
    if (current) matchRegistry.delete(current.matchId);

    const session = createMatchSession({
      matchId: room.match.id,
      mode: roomMatchMode(room),
      metadata: { roomCode: room.code },
      players: Object.entries(room.players || {}).filter(([, player]) => Boolean(player)).map(([playerId, player]) => ({
        playerId,
        socketId: player.socketId || null,
        profile: player.profile || {},
        deck: player.deckSnapshot?.cards || player.deck || [],
        deckId: player.deckSnapshot?.deckId || room.ranked?.players?.[playerId]?.deckId || null,
        deckSnapshot: player.deckSnapshot || null,
        sessionToken: player.resumeToken || null
      }))
    });
    session.start(room.match);
    matchRegistry.register(session);
    room.matchSessionId = session.matchId;
    room.match = session.gameState;
    return session;
  }

  function authoritativeMatch(room) {
    return getRoomMatchSession(room)?.gameState || room?.match || null;
  }

  function commitAuthoritativeMatch(room, nextMatch) {
    if (!room || !nextMatch) return null;
    const session = getRoomMatchSession(room) || attachRoomMatchSession(room);
    if (!session) {
      room.match = nextMatch;
      return null;
    }
    session.replaceGameState(nextMatch);
    room.match = session.gameState;
    return session;
  }

  function roomMatchSync(room) {
    const session = getRoomMatchSession(room);
    if (!session) return null;
    const envelope = createStateEnvelope(session, { gameState: null });
    if (!envelope) return null;
    const { gameState: _gameState, ...sync } = envelope;
    return sync;
  }

  function beginRoomReconnect(room, playerId, reason = DisconnectReason.SOCKET_DISCONNECT) {
    const session = getRoomMatchSession(room);
    const legacyPlayer = room?.players?.[playerId];
    if (!legacyPlayer) return null;
    if (!session) {
      legacyPlayer.connectionState = PlayerConnectionState.RECONNECTING;
      legacyPlayer.reconnectDeadline = Date.now() + DEFAULT_RECONNECT_WINDOW_MS;
      return null;
    }
    const player = session.getPlayer(playerId);
    if (!player) return null;
    reconnectManager.begin(player, reason);
    legacyPlayer.connectionState = player.connectionState;
    legacyPlayer.reconnectDeadline = player.reconnectDeadline;
    return player;
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
    if (rankedQueue.hasSocket(socketId)) return "ranked";
    if (casualQueue.hasSocket(socketId) || readyCheckRegistry?.getBySocket(socketId)) return "searching";
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
    const snapshot = lobbySnapshot();
    const signature = JSON.stringify({
      rooms: snapshot.rooms,
      players: snapshot.players,
      counts: snapshot.counts
    });
    if (signature === lastLobbySnapshotSignature) return;
    lastLobbySnapshotSignature = signature;
    io.emit("lobby:snapshot", snapshot);
  }

  function roomSummary(room, viewerId, { includeChat = true } = {}) {
    const session = getRoomMatchSession(room);
    const players = Object.fromEntries(
      Object.entries(room.players).map(([id, player]) => {
        if (!player) return [id, null];
        const sessionPlayer = session?.getPlayer(id);
        return [id, {
          profile: player.profile,
          connected: Boolean(player.socketId),
          connectionState: sessionPlayer?.connectionState || player.connectionState || (player.socketId ? PlayerConnectionState.CONNECTED : PlayerConnectionState.DISCONNECTED),
          reconnectDeadline: sessionPlayer?.reconnectDeadline || player.reconnectDeadline || null
        }];
      })
    );
    const match = authoritativeMatch(room);

    return {
      code: room.code,
      hostPlayerId: "player1",
      viewerPlayerId: viewerId,
      started: Boolean(match),
      players,
      ...(includeChat ? { chat: (room.chat || []).slice(-100) } : {}),
      match: sanitizeMatchForViewer(match, viewerId),
      matchSync: roomMatchSync(room),
      matchHistoryRecord: room.matchHistory?.matchId === match?.id ? room.matchHistory.records?.[viewerId] || null : null,
      ranked: room.ranked ? { season: room.ranked.season } : null,
      matchMode: roomMatchMode(room),
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
    room.turnTimerHandle = setTimeout(async () => {
      const current = rooms.get(room.code);
      if (!current?.match || current.match.winnerId || current.turnClock?.key !== key) return;
      const timedOutId = current.match.activePlayerId;
      const winnerId = timedOutId === "player1" ? "player2" : "player1";
      commitAuthoritativeMatch(current, { ...authoritativeMatch(current), winnerId, winnerReason: "turn_timeout" });
      getRoomMatchSession(current)?.finish(authoritativeMatch(current));
      await settleRoomHistory(current);
      clearTurnTimer(current);
      emitRoom(current);
      emitLobbySnapshot();
    }, seconds * 1000);
    room.turnTimerHandle.unref?.();
  }

  function emitRoom(room, { includeChat = false } = {}) {
    for (const [playerId, player] of Object.entries(room.players)) {
      if (!player?.socketId) continue;
      io.to(player.socketId).emit("room:state", roomSummary(room, playerId, { includeChat }));
    }
  }

  function indexRoomSocket(socketId, roomCode, playerId) {
    if (!socketId || !roomCode || !playerId) return;
    socketRoomIndex.set(socketId, { roomCode, playerId });
  }

  function findRoomBySocket(socketId) {
    const indexed = socketRoomIndex.get(socketId);
    if (!indexed) return null;
    const room = rooms.get(indexed.roomCode);
    const player = room?.players?.[indexed.playerId];
    if (!room || player?.socketId !== socketId) {
      socketRoomIndex.delete(socketId);
      return null;
    }
    return { room, playerId: indexed.playerId };
  }

  function removeFromCasualQueue(socketId) {
    return casualQueue.removeBySocket(socketId);
  }

  function emitCasualQueueStatus(entry, message = "searching") {
    if (!entry) return;
    io.to(entry.socketId).emit("matchmaking:status", {
      status: QueueStatus.SEARCHING,
      queueType: QueueType.CASUAL,
      joinedAt: entry.joinedAt,
      message
    });
  }

  function emitReadyCheck(session) {
    for (const entry of session.entries()) {
      const snapshot = session.snapshotFor(entry.socketId);
      if (snapshot) io.to(entry.socketId).emit("matchmaking:readyCheck", snapshot);
    }
  }

  function emitReadyCheckStatus(session) {
    for (const entry of session.entries()) {
      const snapshot = session.snapshotFor(entry.socketId);
      if (snapshot) io.to(entry.socketId).emit("matchmaking:readyStatus", snapshot);
    }
  }

  function requeueReadyCheckEntries(session, { excludeSocketId = null, readyOnly = false } = {}) {
    const entries = readyOnly ? session.readyEntries() : session.entries();
    for (const entry of entries) {
      if (entry.socketId === excludeSocketId) continue;
      const queuedSocket = io.sockets.sockets.get(entry.socketId);
      if (!queuedSocket?.connected || findRoomBySocket(entry.socketId)) continue;
      const queuedEntry = casualQueue.enqueue(entry.requeue(Date.now()));
      emitCasualQueueStatus(queuedEntry, "searching");
    }
  }

  function createCasualMatchmakingRoom(entries, readyCheckId) {
    const [firstEntry, secondEntry] = entries;
    if (!firstEntry || !secondEntry) return null;

    const firstSocket = io.sockets.sockets.get(firstEntry.socketId);
    const secondSocket = io.sockets.sockets.get(secondEntry.socketId);
    if (!firstSocket?.connected || !secondSocket?.connected) return null;

    const lockOptions = deckValidationOptionsForSettings({ ruleset: "eternal" });
    const firstLock = createDeckSnapshot({
      deck: firstEntry.deck,
      deckId: firstEntry.deckId,
      deckName: firstEntry.deckName,
      coverCardId: firstEntry.coverCardId
    }, cardIndex, lockOptions);
    const secondLock = createDeckSnapshot({
      deck: secondEntry.deck,
      deckId: secondEntry.deckId,
      deckName: secondEntry.deckName,
      coverCardId: secondEntry.coverCardId
    }, cardIndex, lockOptions);

    if (!firstLock.ok || !secondLock.ok) return null;
    if (!validateDeckSnapshot(firstLock.snapshot, cardIndex, lockOptions).ok) return null;
    if (!validateDeckSnapshot(secondLock.snapshot, cardIndex, lockOptions).ok) return null;

    let roomCode = code();
    while (rooms.has(roomCode)) roomCode = code();

    const room = {
      code: roomCode,
      players: {
        player1: {
          socketId: firstEntry.socketId,
          userId: firstEntry.metadata?.userId || null,
          profile: publicProfile(firstEntry.profile),
          deck: firstLock.snapshot.cards.map((entry) => ({ ...entry })),
          deckSnapshot: firstLock.snapshot,
          resumeToken: resumeToken()
        },
        player2: {
          socketId: secondEntry.socketId,
          userId: secondEntry.metadata?.userId || null,
          profile: publicProfile(secondEntry.profile),
          deck: secondLock.snapshot.cards.map((entry) => ({ ...entry })),
          deckSnapshot: secondLock.snapshot,
          resumeToken: resumeToken()
        }
      },
      settings: {
        title: "Casual Matchmaking",
        visibility: "private",
        passwordHash: null,
        spectatorsAllowed: false,
        ...normalizeCustomMatchSettings({
          firstPlayerMode: "random",
          turnTimerSeconds: 0,
          mulliganEnabled: true,
          ruleset: "eternal"
        })
      },
      match: null,
      chat: [],
      createdAt: Date.now(),
      matchmaking: {
        queueType: QueueType.CASUAL,
        readyCheckId,
        deckLocked: true
      }
    };

    const firstPlayerId = resolveFirstPlayerId(room.settings);
    room.match = createMatch({
      player1: { ...room.players.player1.profile, deck: room.players.player1.deck },
      player2: { ...room.players.player2.profile, deck: room.players.player2.deck },
      firstPlayerId,
      cardIndex
    });
    attachRoomMatchSession(room, { replace: true });
    rooms.set(roomCode, room);

    indexRoomSocket(firstEntry.socketId, roomCode, "player1");
    indexRoomSocket(secondEntry.socketId, roomCode, "player2");
    firstSocket.join(roomCode);
    secondSocket.join(roomCode);

    const sessionPayload = (playerId, opponentId) => ({
      readyCheckId,
      code: roomCode,
      playerId,
      resumeToken: room.players[playerId].resumeToken,
      opponentProfile: room.players[opponentId].profile,
      preMatch: {
        matchId: room.match.id,
        queueType: QueueType.CASUAL,
        player: {
          profile: room.players[playerId].profile,
          deck: deckSnapshotPresentation(room.players[playerId].deckSnapshot)
        },
        opponent: {
          profile: room.players[opponentId].profile,
          deck: deckSnapshotPresentation(room.players[opponentId].deckSnapshot)
        }
      },
      matchSync: roomMatchSync(room)
    });

    io.to(firstEntry.socketId).emit("matchmaking:matched", sessionPayload("player1", "player2"));
    io.to(secondEntry.socketId).emit("matchmaking:matched", sessionPayload("player2", "player1"));

    syncTurnTimer(room, true);
    emitRoom(room, { includeChat: true });
    emitLobbySnapshot();
    return room;
  }

  function createFriendChallengeRoom(request, challengedPayload = {}) {
    if (!request?.challengerDeck) return null;
    const challengerSocket = io.sockets.sockets.get(request.challengerSocketId);
    const challengedSocket = io.sockets.sockets.get(request.challengedSocketId);
    if (!challengerSocket?.connected || !challengedSocket?.connected) return null;

    const lockOptions = deckValidationOptionsForSettings({ ruleset: "eternal" });
    const challengerLock = createDeckSnapshot(request.challengerDeck, cardIndex, lockOptions);
    const challengedLock = createDeckSnapshot({
      deck: challengedPayload.deck,
      deckId: challengedPayload.deckId,
      deckName: challengedPayload.deckName,
      coverCardId: challengedPayload.coverCardId
    }, cardIndex, lockOptions);
    if (!challengerLock.ok || !challengedLock.ok) return null;
    if (!validateDeckSnapshot(challengerLock.snapshot, cardIndex, lockOptions).ok) return null;
    if (!validateDeckSnapshot(challengedLock.snapshot, cardIndex, lockOptions).ok) return null;

    let roomCode = code();
    while (rooms.has(roomCode)) roomCode = code();
    const challengedPresence = lobbyPresence.get(request.challengedSocketId);
    const room = {
      code: roomCode,
      players: {
        player1: {
          socketId: request.challengerSocketId,
          userId: request.challengerUserId || null,
          profile: publicProfile(request.challengerProfile),
          deck: challengerLock.snapshot.cards.map((entry) => ({ ...entry })),
          deckSnapshot: challengerLock.snapshot,
          resumeToken: resumeToken()
        },
        player2: {
          socketId: request.challengedSocketId,
          userId: request.challengedUserId || null,
          profile: publicProfile(challengedPayload.profile || challengedPresence?.profile || {}),
          deck: challengedLock.snapshot.cards.map((entry) => ({ ...entry })),
          deckSnapshot: challengedLock.snapshot,
          resumeToken: resumeToken()
        }
      },
      settings: {
        title: "Friend Challenge",
        visibility: "private",
        passwordHash: null,
        spectatorsAllowed: false,
        ...normalizeCustomMatchSettings({ firstPlayerMode: "random", turnTimerSeconds: 0, mulliganEnabled: true, ruleset: "eternal" })
      },
      privateMatch: createPrivateMatchDescriptor({ roomCode }),
      friendChallenge: {
        challengeId: request.challengeId,
        challengerUserId: request.challengerUserId,
        challengedUserId: request.challengedUserId
      },
      match: null,
      chat: [],
      createdAt: Date.now()
    };

    const firstPlayerId = resolveFirstPlayerId(room.settings);
    room.match = createMatch({
      player1: { ...room.players.player1.profile, deck: room.players.player1.deck },
      player2: { ...room.players.player2.profile, deck: room.players.player2.deck },
      firstPlayerId,
      cardIndex
    });
    attachRoomMatchSession(room, { replace: true });
    rooms.set(roomCode, room);
    indexRoomSocket(request.challengerSocketId, roomCode, "player1");
    indexRoomSocket(request.challengedSocketId, roomCode, "player2");
    challengerSocket.join(roomCode);
    challengedSocket.join(roomCode);

    const matchedPayload = (playerId, opponentId) => ({
      challengeId: request.challengeId,
      code: roomCode,
      playerId,
      resumeToken: room.players[playerId].resumeToken,
      matchSync: roomMatchSync(room),
      preMatch: {
        matchId: room.match.id,
        queueType: "friend",
        player: { profile: room.players[playerId].profile, deck: deckSnapshotPresentation(room.players[playerId].deckSnapshot) },
        opponent: { profile: room.players[opponentId].profile, deck: deckSnapshotPresentation(room.players[opponentId].deckSnapshot) }
      }
    });

    io.to(request.challengerSocketId).emit("challenge:matched", matchedPayload("player1", "player2"));
    io.to(request.challengedSocketId).emit("challenge:matched", matchedPayload("player2", "player1"));
    syncTurnTimer(room, true);
    emitRoom(room, { includeChat: true });
    emitLobbySnapshot();
    return room;
  }

  function beginReadyCheck(entries) {
    const session = readyCheckRegistry.create(entries);
    emitReadyCheck(session);
    emitLobbySnapshot();
    return session;
  }

  function attemptCasualPairing() {
    while (casualQueue.size >= 2) {
      const pair = casualMatchmaker.takePair();
      if (!pair) break;

      const validEntries = pair.filter((entry) => {
        const queuedSocket = io.sockets.sockets.get(entry.socketId);
        return Boolean(queuedSocket?.connected) && !findRoomBySocket(entry.socketId) && !readyCheckRegistry.getBySocket(entry.socketId);
      });

      if (validEntries.length !== 2) {
        for (const entry of validEntries) casualQueue.enqueue(entry.requeue(Date.now()));
        continue;
      }

      beginReadyCheck(validEntries);
    }
  }

  function cancelReadyCheckForSocket(socketId, reason = "A confirmação da partida foi cancelada.") {
    const session = readyCheckRegistry.cancelBySocket(socketId);
    if (!session) return false;

    for (const entry of session.entries()) {
      if (entry.socketId === socketId) continue;
      io.to(entry.socketId).emit("matchmaking:failed", {
        code: "READY_CHECK_CANCELLED",
        error: reason,
        requeued: true
      });
    }
    requeueReadyCheckEntries(session, { excludeSocketId: socketId });
    attemptCasualPairing();
    emitLobbySnapshot();
    return true;
  }

  readyCheckRegistry = new ReadyCheckRegistry({
    onExpire(session) {
      for (const entry of session.entries()) {
        const wasReady = session.readyEntries().some((readyEntry) => readyEntry.socketId === entry.socketId);
        io.to(entry.socketId).emit("matchmaking:failed", {
          code: "READY_CHECK_EXPIRED",
          error: wasReady
            ? "O outro jogador não confirmou a partida a tempo. A procurar novamente..."
            : "A confirmação da partida expirou.",
          requeued: wasReady
        });
      }
      requeueReadyCheckEntries(session, { readyOnly: true });
      attemptCasualPairing();
      emitLobbySnapshot();
    }
  });



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
    return rankedQueue.removeBySocket(socketId);
  }

  async function rankedIdentity(accessToken) {
    if (!rankedSupabase) return { ok: false, error: "Ranked indisponível no momento." };
    const token = String(accessToken || "").trim();
    if (!token) return { ok: false, error: "Sessão Ranked inválida." };
    const { data, error } = await rankedSupabase.auth.getUser(token);
    if (error || !data?.user) return { ok: false, error: "Não foi possível validar sua conta Ranked." };
    return { ok: true, user: data.user };
  }

  async function onlineAccountIdentity(accessToken) {
    if (!rankedSupabase) return { ok: false, error: "Recursos de conta indisponíveis no momento." };
    const token = String(accessToken || "").trim();
    if (!token) return { ok: false, error: "Entre na sua conta para usar desafios de amigos." };
    const { data, error } = await rankedSupabase.auth.getUser(token);
    if (error || !data?.user) return { ok: false, error: "Não foi possível validar sua conta." };
    return { ok: true, user: data.user };
  }

  async function areFriends(userIdA, userIdB) {
    if (!rankedSupabase || !userIdA || !userIdB || userIdA === userIdB) return false;
    const { data, error } = await rankedSupabase
      .from("bs_friendships")
      .select("id")
      .eq("status", "accepted")
      .or(`and(requester_id.eq.${userIdA},addressee_id.eq.${userIdB}),and(requester_id.eq.${userIdB},addressee_id.eq.${userIdA})`)
      .limit(1);
    return !error && Array.isArray(data) && data.length > 0;
  }

  challengeRegistry = new ChallengeRegistry({
    expiresInMs: 30_000,
    onExpire(request) {
      io.to(request.challengerSocketId).emit("challenge:failed", { challengeId: request.challengeId, code: "CHALLENGE_EXPIRED", error: "O desafio expirou." });
      io.to(request.challengedSocketId).emit("challenge:failed", { challengeId: request.challengeId, code: "CHALLENGE_EXPIRED", error: "O desafio expirou." });
    }
  });

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

  function rankedSearchWindow(entry, now = Date.now()) {
    const seconds = Math.max(0, (Number(now) - Number(entry.joinedAt || now)) / 1000);
    return Math.min(600, 150 + Math.floor(seconds / 20) * 50);
  }

  rankedMatchmaker = new RankedMatchmaker({
    queue: rankedQueue,
    season: rankedSeason,
    searchWindow: rankedSearchWindow
  });

  function createRankedRoom(matchContext) {
    const [a, b] = matchContext.entries();
    const lockOptions = { regulation: "official" };
    const aLock = createDeckSnapshot({
      deck: a.deck,
      deckId: a.deckId,
      deckName: a.deckName,
      coverCardId: a.coverCardId
    }, cardIndex, lockOptions);
    const bLock = createDeckSnapshot({
      deck: b.deck,
      deckId: b.deckId,
      deckName: b.deckName,
      coverCardId: b.coverCardId
    }, cardIndex, lockOptions);

    if (!aLock.ok || !bLock.ok) return null;
    if (!validateDeckSnapshot(aLock.snapshot, cardIndex, lockOptions).ok) return null;
    if (!validateDeckSnapshot(bLock.snapshot, cardIndex, lockOptions).ok) return null;

    let roomCode = code();
    while (rooms.has(roomCode)) roomCode = code();
    const firstPlayerId = Math.random() < 0.5 ? "player1" : "player2";
    const aUserId = a.metadata?.userId || null;
    const bUserId = b.metadata?.userId || null;
    const room = {
      code: roomCode,
      players: {
        player1: {
          socketId: a.socketId,
          userId: aUserId,
          profile: publicProfile(a.profile),
          deck: aLock.snapshot.cards.map((entry) => ({ ...entry })),
          deckSnapshot: aLock.snapshot,
          resumeToken: resumeToken()
        },
        player2: {
          socketId: b.socketId,
          userId: bUserId,
          profile: publicProfile(b.profile),
          deck: bLock.snapshot.cards.map((entry) => ({ ...entry })),
          deckSnapshot: bLock.snapshot,
          resumeToken: resumeToken()
        }
      },
      match: null,
      chat: [],
      createdAt: Date.now(),
      ranked: {
        season: rankedSeason,
        settled: false,
        settling: false,
        context: matchContext.snapshot(),
        players: {
          player1: { userId: aUserId, rp: Number(a.rating || 1000), deckId: aLock.snapshot.deckId, deckName: aLock.snapshot.deckName },
          player2: { userId: bUserId, rp: Number(b.rating || 1000), deckId: bLock.snapshot.deckId, deckName: bLock.snapshot.deckName }
        }
      }
    };
    room.match = createMatch({
      player1: { ...room.players.player1.profile, deck: room.players.player1.deck },
      player2: { ...room.players.player2.profile, deck: room.players.player2.deck },
      firstPlayerId, cardIndex
    });
    attachRoomMatchSession(room, { replace: true });
    rooms.set(roomCode, room);
    indexRoomSocket(a.socketId, roomCode, "player1");
    indexRoomSocket(b.socketId, roomCode, "player2");
    io.sockets.sockets.get(a.socketId)?.join(roomCode);
    io.sockets.sockets.get(b.socketId)?.join(roomCode);

    const matchedPayload = (playerId, opponentId) => ({
      code: roomCode,
      playerId,
      resumeToken: room.players[playerId].resumeToken,
      opponentRank: rankedProfileLabel(room.ranked.players[opponentId].rp),
      matchSync: roomMatchSync(room),
      preMatch: {
        matchId: room.match.id,
        queueType: QueueType.RANKED,
        player: { profile: room.players[playerId].profile, deck: deckSnapshotPresentation(room.players[playerId].deckSnapshot) },
        opponent: { profile: room.players[opponentId].profile, deck: deckSnapshotPresentation(room.players[opponentId].deckSnapshot) }
      }
    });

    io.to(a.socketId).emit("ranked:matched", matchedPayload("player1", "player2"));
    io.to(b.socketId).emit("ranked:matched", matchedPayload("player2", "player1"));
    emitRoom(room);
    return room;
  }

  async function settleRankedRoom(room, winnerId, reason = "game") {
    if (!room?.ranked || room.ranked.settled || room.ranked.settling || !winnerId) return null;
    room.ranked.settling = true;
    const match = authoritativeMatch(room);
    const result = await finalizeMatchResult({
      ranked: room.ranked,
      match,
      roomCode: room.code,
      winnerId,
      reason,
      season: rankedSeason,
      supabase: rankedSupabase,
      players: room.players
    });

    if (!result.ok) {
      room.ranked.settling = false;
      room.ranked.settleError = result.error || result.code || "Ranked result failed.";
      console.error("[ranked:settle]", room.ranked.settleError);
      return result;
    }

    room.ranked.settled = true;
    room.ranked.settling = false;
    room.ranked.settledAt = Date.now();
    room.ranked.serverResult = {
      winnerId: result.winnerId,
      loserId: result.loserId,
      reason: result.reason
    };

    const winnerSocket = room.players[result.winnerId]?.socketId;
    const loserSocket = room.players[result.loserId]?.socketId;
    const winnerPayload = { ...result.winner, rank: rankedProfileLabel(result.winner.rpAfter), reason: result.reason };
    const loserPayload = { ...result.loser, rank: rankedProfileLabel(result.loser.rpAfter), reason: result.reason };
    if (winnerSocket) io.to(winnerSocket).emit("ranked:result", winnerPayload);
    if (loserSocket) io.to(loserSocket).emit("ranked:result", loserPayload);
    return result;
  }

  async function settleRoomHistory(room) {
    const match = authoritativeMatch(room);
    if (!room || !match?.winnerId) return null;
    if (room.matchHistory?.matchId === match.id) return room.matchHistory;

    const session = getRoomMatchSession(room);
    const records = buildServerMatchHistoryRecords({ room, session, cardIndex, finishedAt: session?.finishedAt || Date.now() });
    if (!records) return null;

    const persistence = await persistServerMatchHistory({
      supabase: rankedSupabase,
      room,
      records
    });

    room.matchHistory = {
      matchId: match.id,
      records,
      settledAt: Date.now(),
      persistence: { ok: persistence.ok, persisted: persistence.persisted || 0, skipped: persistence.skipped || 0 }
    };
    return room.matchHistory;
  }

  function onlineActivityForSocket(socketId) {
    if (findRoomBySocket(socketId)) return "room";
    if (readyCheckRegistry?.getBySocket(socketId)) return "ready_check";
    if (casualQueue.hasSocket(socketId)) return "casual_queue";
    if (rankedQueue.hasSocket(socketId)) return "ranked_queue";
    if (challengeRegistry?.getBySocket(socketId)) return "challenge";
    return null;
  }

  function rejectActivityConflict(socketId, allowed = []) {
    const activity = onlineActivityForSocket(socketId);
    if (!activity || allowed.includes(activity)) return null;
    return {
      ok: false,
      code: "ACTIVITY_CONFLICT",
      error: "Conclua ou cancele a atividade Online atual antes de iniciar outra."
    };
  }

  async function resolveRankedDisconnectIfEligible(room, disconnectedPlayerId) {
    if (!room?.ranked || room.ranked.settled || room.ranked.settling) return null;
    const match = authoritativeMatch(room);
    if (!match || match.winnerId) return null;

    const opponentId = disconnectedPlayerId === "player1" ? "player2" : "player1";
    const opponent = room.players?.[opponentId];
    const session = getRoomMatchSession(room);
    const disconnectedSessionPlayer = session?.getPlayer(disconnectedPlayerId);
    const opponentSessionPlayer = session?.getPlayer(opponentId);

    const disconnectedTimedOut =
      disconnectedSessionPlayer?.connectionState === PlayerConnectionState.TIMED_OUT ||
      room.players?.[disconnectedPlayerId]?.connectionState === PlayerConnectionState.TIMED_OUT;
    if (!disconnectedTimedOut) return null;

    const opponentTimedOut =
      opponentSessionPlayer?.connectionState === PlayerConnectionState.TIMED_OUT ||
      opponent?.connectionState === PlayerConnectionState.TIMED_OUT;

    if (opponentTimedOut) {
      room.ranked.cancelled = true;
      room.ranked.cancelledAt = Date.now();
      room.ranked.cancelReason = "both_disconnected";
      session?.cancel();
      return { ok: false, code: "BOTH_PLAYERS_DISCONNECTED" };
    }

    if (!opponent?.socketId) return null;

    const resolution = disconnectPolicy.resolveTimeout({
      playerId: disconnectedPlayerId,
      playerIds: Object.keys(room.players || {})
    });
    if (!resolution.ok) return resolution;

    commitAuthoritativeMatch(room, {
      ...match,
      winnerId: resolution.winnerId,
      winnerReason: resolution.reason
    });
    getRoomMatchSession(room)?.finish(authoritativeMatch(room));
    const rankedResult = await settleRankedRoom(room, resolution.winnerId, resolution.reason);
    await settleRoomHistory(room);
    return rankedResult;
  }

  function onSafe(socket, eventName, handler) {
    socket.on(eventName, (payload = {}, ack = () => {}) => {
      const reply = typeof ack === "function" ? ack : () => {};
      const guard = onlineEventGuard.inspect(socket.id, eventName, payload);
      if (!guard.ok) {
        const isRateLimit = guard.code === OnlineGuardCode.RATE_LIMITED;
        return reply({
          ok: false,
          code: guard.code,
          error: isRateLimit
            ? "Muitas ações Online em pouco tempo. Aguarde um instante e tente novamente."
            : "Esta solicitação Online é maior do que o permitido.",
          ...(isRateLimit ? { retryAfterMs: guard.retryAfterMs } : {})
        });
      }
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

    onSafe(socket, "lobby:identify", async (payload, ack) => {
      const validation = validateOnlineProfilePayload(payload?.profile);
      if (!validation.ok) return ack(validation);
      let userId = null;
      const accessToken = String(payload?.accessToken || "").trim();
      if (accessToken) {
        const identity = await onlineAccountIdentity(accessToken);
        if (identity.ok) userId = identity.user.id;
      }
      lobbyPresence.set(socket.id, { profile: publicProfile(payload?.profile), userId, identifiedAt: Date.now() });
      const snapshot = lobbySnapshot();
      ack({ ok: true, snapshot, authenticated: Boolean(userId) });
      emitLobbySnapshot();
    });

    onSafe(socket, "lobby:list", (_payload, ack) => {
      ack({ ok: true, snapshot: lobbySnapshot() });
    });

    onSafe(socket, "challenge:send", async (payload, ack) => {
      if (findRoomBySocket(socket.id) || casualQueue.hasSocket(socket.id) || rankedQueue.hasSocket(socket.id) || readyCheckRegistry.getBySocket(socket.id)) {
        return ack({ ok: false, code: "CHALLENGE_UNAVAILABLE", error: "Saia da fila ou sala atual antes de desafiar um amigo." });
      }
      const sourcePresence = lobbyPresence.get(socket.id);
      const targetSocketId = String(payload?.targetSocketId || "");
      const targetPresence = lobbyPresence.get(targetSocketId);
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (!sourcePresence?.userId) return ack({ ok: false, code: "AUTH_REQUIRED", error: "Entre na sua conta para desafiar amigos." });
      if (!targetPresence?.userId || !targetSocket?.connected || targetSocketId === socket.id) {
        return ack({ ok: false, code: "CHALLENGE_UNAVAILABLE", error: "Este amigo não está disponível para um desafio." });
      }
      if (presenceStatus(targetSocketId) !== "available" || challengeRegistry.getBySocket(socket.id) || challengeRegistry.getBySocket(targetSocketId)) {
        return ack({ ok: false, code: "CHALLENGE_UNAVAILABLE", error: "Este amigo está ocupado no momento." });
      }
      if (!(await areFriends(sourcePresence.userId, targetPresence.userId))) {
        return ack({ ok: false, code: "FRIEND_REQUIRED", error: "Desafios diretos estão disponíveis apenas entre amigos." });
      }
      const profileValidation = validateOnlineProfilePayload(payload?.profile);
      if (!profileValidation.ok) return ack(profileValidation);
      const validation = validateDeck(payload?.deck || [], cardIndex, deckValidationOptionsForSettings({ ruleset: "eternal" }));
      if (!validation.ok) return ack({ ok: false, code: "DECK_INVALID", error: validation.errors.join(" ") });

      const request = challengeRegistry.create({
        challengerSocketId: socket.id,
        challengedSocketId: targetSocketId,
        challengerUserId: sourcePresence.userId,
        challengedUserId: targetPresence.userId,
        challengerProfile: publicProfile(payload?.profile || sourcePresence.profile),
        challengerDeck: {
          deck: payload.deck,
          deckId: String(payload?.deckId || "").slice(0, 96) || null,
          deckName: String(payload?.deckName || "Deck").slice(0, 120),
          coverCardId: String(payload?.coverCardId || "").slice(0, 128) || null
        }
      });

      io.to(targetSocketId).emit("challenge:incoming", request.snapshotFor(targetSocketId));
      io.to(socket.id).emit("challenge:status", request.snapshotFor(socket.id));
      ack({ ok: true, challenge: request.snapshotFor(socket.id) });
    });

    onSafe(socket, "challenge:accept", async (payload, ack) => {
      const request = challengeRegistry.get(payload?.challengeId);
      if (!request || request.challengedSocketId !== socket.id || !request.isPending()) {
        return ack({ ok: false, code: "CHALLENGE_EXPIRED", error: "Este desafio não está mais disponível." });
      }
      const sourcePresence = lobbyPresence.get(request.challengerSocketId);
      const targetPresence = lobbyPresence.get(socket.id);
      const challengerBusy = Boolean(findRoomBySocket(request.challengerSocketId) || casualQueue.hasSocket(request.challengerSocketId) || rankedQueue.hasSocket(request.challengerSocketId) || readyCheckRegistry.getBySocket(request.challengerSocketId));
      const challengedBusy = Boolean(findRoomBySocket(socket.id) || casualQueue.hasSocket(socket.id) || rankedQueue.hasSocket(socket.id) || readyCheckRegistry.getBySocket(socket.id));
      if (challengerBusy || challengedBusy) {
        challengeRegistry.delete(request.challengeId);
        return ack({ ok: false, code: "CHALLENGE_UNAVAILABLE", error: "Um dos jogadores já entrou em outra atividade Online." });
      }
      if (!sourcePresence?.userId || !targetPresence?.userId || !(await areFriends(sourcePresence.userId, targetPresence.userId))) {
        challengeRegistry.delete(request.challengeId);
        return ack({ ok: false, code: "FRIEND_REQUIRED", error: "Não foi possível validar este desafio de amizade." });
      }
      const validation = validateDeck(payload?.deck || [], cardIndex, deckValidationOptionsForSettings({ ruleset: "eternal" }));
      if (!validation.ok) return ack({ ok: false, code: "DECK_INVALID", error: validation.errors.join(" ") });
      if (!request.accept(socket.id)) return ack({ ok: false, code: "CHALLENGE_EXPIRED", error: "Este desafio expirou." });

      const room = createFriendChallengeRoom(request, {
        profile: payload?.profile || targetPresence.profile,
        deck: payload.deck,
        deckId: String(payload?.deckId || "").slice(0, 96) || null,
        deckName: String(payload?.deckName || "Deck").slice(0, 120),
        coverCardId: String(payload?.coverCardId || "").slice(0, 128) || null
      });
      challengeRegistry.delete(request.challengeId);
      if (!room) return ack({ ok: false, code: "MATCH_NOT_FOUND", error: "Não foi possível iniciar o desafio." });
      ack({ ok: true, code: room.code, status: "accepted" });
    });

    onSafe(socket, "challenge:decline", (payload, ack) => {
      const request = challengeRegistry.get(payload?.challengeId);
      if (!request || !request.decline(socket.id)) return ack({ ok: false, code: "CHALLENGE_EXPIRED", error: "Este desafio não está mais disponível." });
      io.to(request.challengerSocketId).emit("challenge:failed", { challengeId: request.challengeId, code: "CHALLENGE_DECLINED", error: "O desafio foi recusado." });
      challengeRegistry.delete(request.challengeId);
      ack({ ok: true });
    });

    onSafe(socket, "challenge:cancel", (payload, ack) => {
      const request = challengeRegistry.get(payload?.challengeId) || challengeRegistry.getBySocket(socket.id);
      if (!request || !request.cancel(socket.id)) return ack({ ok: false, code: "CHALLENGE_EXPIRED", error: "Este desafio não está mais disponível." });
      const otherSocketId = request.challengerSocketId === socket.id ? request.challengedSocketId : request.challengerSocketId;
      io.to(otherSocketId).emit("challenge:failed", { challengeId: request.challengeId, code: "CHALLENGE_CANCELLED", error: "O desafio foi cancelado." });
      challengeRegistry.delete(request.challengeId);
      ack({ ok: true });
    });

    onSafe(socket, "ranked:join", async (payload, ack) => {
      const conflict = rejectActivityConflict(socket.id, ["ranked_queue"]);
      if (conflict) return ack(conflict);
      if (findRoomBySocket(socket.id)) return ack({ ok: false, code: "ACTIVITY_CONFLICT", error: "Saia da sala atual antes de procurar Ranked." });
      const existing = rankedQueue.getBySocket(socket.id);
      if (existing) {
        return ack({ ok: true, status: QueueStatus.SEARCHING, rp: existing.rating, rank: rankedProfileLabel(existing.rating) });
      }
      const identity = await rankedIdentity(payload.accessToken);
      if (!identity.ok) return ack(identity);
      const profileValidation = validateOnlineProfilePayload(payload.profile);
      if (!profileValidation.ok) return ack(profileValidation);
      const validation = validateDeck(payload.deck || [], cardIndex, { regulation: "official" });
      if (!validation.ok) return ack({ ok: false, error: validation.errors.join(" ") });
      const duplicateAccountEntry = rankedQueue.entries.find((candidate) => candidate.metadata?.userId === identity.user.id);
      if (duplicateAccountEntry) {
        return ack({ ok: false, code: "RANKED_ACCOUNT_ALREADY_QUEUED", error: "Esta conta já está na fila Ranked." });
      }
      const rankedProfile = await ensureRankedProfile(identity.user.id);
      const entry = new QueueEntry({
        socketId: socket.id,
        queueType: QueueType.RANKED,
        rating: Number(rankedProfile.rp || 1000),
        profile: payload.profile,
        deck: payload.deck,
        deckId: String(payload.deckId || "").slice(0, 96) || null,
        deckName: String(payload.deckName || "Deck").slice(0, 120),
        coverCardId: payload.coverCardId || null,
        metadata: { userId: identity.user.id }
      });

      const context = rankedMatchmaker.takeMatch(entry);
      if (!context) {
        rankedQueue.enqueue(entry);
        socket.emit("ranked:status", { status: QueueStatus.SEARCHING, rp: entry.rating, rank: rankedProfileLabel(entry.rating) });
        emitLobbySnapshot();
        return ack({ ok: true, status: QueueStatus.SEARCHING, rp: entry.rating, rank: rankedProfileLabel(entry.rating) });
      }

      const room = createRankedRoom(context);
      if (!room) {
        for (const queuedEntry of context.entries()) {
          if (io.sockets.sockets.get(queuedEntry.socketId)?.connected) rankedQueue.enqueue(queuedEntry.requeue(Date.now()));
        }
        emitLobbySnapshot();
        return ack({ ok: false, code: "DECK_LOCK_FAILED", error: "Não foi possível bloquear os decks da partida Ranked." });
      }
      emitLobbySnapshot();
      ack({ ok: true, status: QueueStatus.MATCHED });
    });

    onSafe(socket, "ranked:cancel", (_payload, ack) => {
      const removed = removeFromRankedQueue(socket.id);
      ack({ ok: true, cancelled: Boolean(removed) });
    });

    onSafe(socket, "matchmaking:join", (payload, ack) => {
      const conflict = rejectActivityConflict(socket.id, ["casual_queue", "ready_check"]);
      if (conflict) return ack(conflict);
      if (findRoomBySocket(socket.id)) {
        return ack({ ok: false, error: "Saia da sala atual antes de procurar outra partida." });
      }
      if (rankedQueue.hasSocket(socket.id)) {
        return ack({ ok: false, error: "Saia da fila Ranked antes de procurar uma partida Casual." });
      }

      const existingReadyCheck = readyCheckRegistry.getBySocket(socket.id);
      if (existingReadyCheck) {
        return ack({ ok: true, status: QueueStatus.READY_CHECK, readyCheck: existingReadyCheck.snapshotFor(socket.id) });
      }

      const existingEntry = casualQueue.getBySocket(socket.id);
      if (existingEntry) {
        emitCasualQueueStatus(existingEntry);
        return ack({ ok: true, status: QueueStatus.SEARCHING, joinedAt: existingEntry.joinedAt });
      }

      const profileValidation = validateOnlineProfilePayload(payload?.profile);
      if (!profileValidation.ok) return ack(profileValidation);
      const validation = validateDeck(payload?.deck || [], cardIndex, deckValidationOptionsForSettings({ ruleset: "eternal" }));
      if (!validation.ok) return ack({ ok: false, code: "DECK_INVALID", error: validation.errors.join(" ") });

      const entry = casualQueue.enqueue(new QueueEntry({
        socketId: socket.id,
        queueType: QueueType.CASUAL,
        profile: publicProfile(payload.profile),
        deck: payload.deck,
        deckId: String(payload?.deckId || "").slice(0, 96) || null,
        deckName: String(payload?.deckName || "Deck").slice(0, 120),
        coverCardId: String(payload?.coverCardId || "").slice(0, 128) || null,
        metadata: { clientJoinedAt: Date.now(), userId: lobbyPresence.get(socket.id)?.userId || null }
      }));

      emitCasualQueueStatus(entry);
      emitLobbySnapshot();
      attemptCasualPairing();

      const readyCheck = readyCheckRegistry.getBySocket(socket.id);
      if (readyCheck) {
        return ack({ ok: true, status: QueueStatus.READY_CHECK, readyCheck: readyCheck.snapshotFor(socket.id) });
      }
      ack({ ok: true, status: QueueStatus.SEARCHING, joinedAt: entry.joinedAt });
    });

    onSafe(socket, "matchmaking:ready", (payload, ack) => {
      const readyCheckId = String(payload?.readyCheckId || "");
      const session = readyCheckRegistry.get(readyCheckId);
      if (!session || !session.hasSocket(socket.id)) {
        return ack({ ok: false, code: "READY_CHECK_EXPIRED", error: "A confirmação da partida expirou." });
      }
      if (Date.now() > session.deadline) {
        return ack({ ok: false, code: "READY_CHECK_EXPIRED", error: "A confirmação da partida expirou." });
      }

      session.markReady(socket.id);
      emitReadyCheckStatus(session);

      if (!session.isComplete()) {
        return ack({ ok: true, status: QueueStatus.READY_CHECK, readyCheck: session.snapshotFor(socket.id) });
      }

      const completed = readyCheckRegistry.complete(session.readyCheckId);
      if (!completed) {
        return ack({ ok: false, code: "READY_CHECK_EXPIRED", error: "A confirmação da partida expirou." });
      }

      const room = createCasualMatchmakingRoom(completed.entries(), completed.readyCheckId);
      if (!room) {
        for (const entry of completed.entries()) {
          io.to(entry.socketId).emit("matchmaking:failed", {
            code: "MATCH_NOT_FOUND",
            error: "Não foi possível iniciar a partida. A procurar novamente...",
            requeued: true
          });
        }
        requeueReadyCheckEntries(completed);
        attemptCasualPairing();
        emitLobbySnapshot();
        return ack({ ok: false, code: "MATCH_NOT_FOUND", error: "Não foi possível iniciar a partida." });
      }

      ack({ ok: true, status: QueueStatus.MATCHED, code: room.code });
    });

    onSafe(socket, "matchmaking:cancel", (_payload, ack) => {
      const removedEntry = removeFromCasualQueue(socket.id);
      const cancelledReadyCheck = cancelReadyCheckForSocket(
        socket.id,
        "O outro jogador cancelou a confirmação. A procurar novamente..."
      );
      emitLobbySnapshot();
      ack({ ok: true, removedFromQueue: Boolean(removedEntry), cancelledReadyCheck });
    });

    onSafe(socket, "matchmaking:abort", (payload, ack) => {
      const removedEntry = removeFromCasualQueue(socket.id);
      removeFromRankedQueue(socket.id);
      const reason = String(payload?.reason || "A partida rápida foi interrompida.");
      const cancelledReadyCheck = cancelReadyCheckForSocket(socket.id, reason);
      emitLobbySnapshot();
      ack({ ok: true, removedFromQueue: Boolean(removedEntry), cancelledReadyCheck });
    });
    onSafe(socket, "room:create", (payload, ack) => {
      const conflict = rejectActivityConflict(socket.id);
      if (conflict) return ack(conflict);
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
          player1: { socketId: socket.id, userId: lobbyPresence.get(socket.id)?.userId || null, profile: publicProfile(payload.profile), deck: payload.deck, deckId: String(payload?.deckId || "").slice(0, 96) || null, deckName: String(payload?.deckName || "Deck").slice(0, 120), coverCardId: String(payload?.coverCardId || "").slice(0, 128) || null, resumeToken: resumeToken() },
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
      if (visibility === "private") {
        room.privateMatch = createPrivateMatchDescriptor({ roomCode });
      }
      rooms.set(roomCode, room);
      indexRoomSocket(socket.id, roomCode, "player1");
      socket.join(roomCode);
      ack({ ok: true, code: roomCode, playerId: "player1", resumeToken: room.players.player1.resumeToken, state: roomSummary(room, "player1") });
      emitRoom(room, { includeChat: true });
      emitLobbySnapshot();
    });

    onSafe(socket, "room:join", (payload, ack) => {
      const conflict = rejectActivityConflict(socket.id);
      if (conflict) return ack(conflict);
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
      room.players.player2 = { socketId: socket.id, userId: lobbyPresence.get(socket.id)?.userId || null, profile: publicProfile(payload.profile), deck: payload.deck, deckId: String(payload?.deckId || "").slice(0, 96) || null, deckName: String(payload?.deckName || "Deck").slice(0, 120), coverCardId: String(payload?.coverCardId || "").slice(0, 128) || null, resumeToken: resumeToken() };
      indexRoomSocket(socket.id, roomCode, "player2");
      socket.join(roomCode);
      ack({ ok: true, code: roomCode, playerId: "player2", resumeToken: room.players.player2.resumeToken, state: roomSummary(room, "player2") });
      emitRoom(room, { includeChat: true });
      emitLobbySnapshot();
    });

    onSafe(socket, "room:resume", async (payload, ack) => {
      const roomCode = String(payload.code || "").trim().toUpperCase();
      const playerId = payload.playerId === "player2" ? "player2" : "player1";
      const room = rooms.get(roomCode);
      const player = room?.players?.[playerId];
      if (!room || !player || !payload.resumeToken || !constantTimeTokenEqual(player.resumeToken, payload.resumeToken)) {
        return ack({ ok: false, error: "Não foi possível retomar esta sessão." });
      }

      const session = getRoomMatchSession(room);
      if (session) {
        const sessionPlayer = session.getPlayer(playerId);
        if (!sessionPlayer || !reconnectManager.resume(sessionPlayer, socket.id, payload.resumeToken)) {
          return ack({ ok: false, error: "A janela de reconexão expirou.", code: "RECONNECT_FAILED", matchSync: roomMatchSync(room) });
        }
      }

      if (player.socketId && player.socketId !== socket.id) socketRoomIndex.delete(player.socketId);
      player.socketId = socket.id;
      player.connectionState = PlayerConnectionState.CONNECTED;
      player.reconnectDeadline = null;
      indexRoomSocket(socket.id, roomCode, playerId);
      if (player.rankedDisconnectTimer) { clearTimeout(player.rankedDisconnectTimer); player.rankedDisconnectTimer = null; }
      if (player.reconnectStateTimer) { clearTimeout(player.reconnectStateTimer); player.reconnectStateTimer = null; }
      socket.join(roomCode);
      if (room.ranked) {
        const opponentId = playerId === "player1" ? "player2" : "player1";
        await resolveRankedDisconnectIfEligible(room, opponentId);
      }
      const state = roomSummary(room, playerId);
      ack({ ok: true, state, matchSync: state.matchSync });
      emitRoom(room, { includeChat: true });
      emitLobbySnapshot();
    });

    onSafe(socket, "room:start", (payload, ack) => {
      const found = findRoomBySocket(socket.id);
      if (!found) return ack({ ok: false, error: "Você não está em uma sala." });
      const { room, playerId } = found;
      if (playerId !== "player1") return ack({ ok: false, error: "Apenas o host inicia a partida." });
      if (!room.players.player2) return ack({ ok: false, error: "Aguardando o segundo jogador." });
      const lockOptions = deckValidationOptionsForSettings(room.settings);
      for (const currentPlayerId of ["player1", "player2"]) {
        const currentPlayer = room.players[currentPlayerId];
        const lock = createDeckSnapshot({
          deck: currentPlayer.deck,
          deckId: currentPlayer.deckId || null,
          deckName: currentPlayer.deckName || "Deck",
          coverCardId: currentPlayer.coverCardId || null
        }, cardIndex, lockOptions);
        if (!lock.ok || !validateDeckSnapshot(lock.snapshot, cardIndex, lockOptions).ok) {
          return ack({ ok: false, code: "DECK_LOCK_FAILED", error: "Não foi possível bloquear os decks desta partida." });
        }
        currentPlayer.deckSnapshot = lock.snapshot;
        currentPlayer.deck = lock.snapshot.cards.map((entry) => ({ ...entry }));
      }

      const firstPlayerId = resolveFirstPlayerId(room.settings);
      room.match = createMatch({
        player1: { ...room.players.player1.profile, deck: room.players.player1.deck },
        player2: { ...room.players.player2.profile, deck: room.players.player2.deck },
        firstPlayerId,
        cardIndex
      });
      attachRoomMatchSession(room, { replace: true });
      syncTurnTimer(room, true);
      emitRoom(room, { includeChat: true });
      emitLobbySnapshot();


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
      emitRoom(room, { includeChat: true });
      ack({ ok:true, message });
    });

    onSafe(socket, "room:rematch", (_payload, ack) => {
      const found = findRoomBySocket(socket.id);
      if (!found) return ack({ ok: false, error: "Sala não encontrada." });
      const { room, playerId } = found;
      const currentMatch = authoritativeMatch(room);
      if (!currentMatch?.winnerId) return ack({ ok: false, error: "A partida ainda não terminou." });
      if (room.ranked) return ack({ ok: false, error: "Ranked exige uma nova busca." });

      if (!room.rematchRequest) {
        room.rematchRequest = new RematchRequest({ playerIds: Object.keys(room.players || {}).filter((id) => Boolean(room.players[id])) });
      }
      if (!room.rematchRequest.request(playerId)) {
        return ack({ ok: false, error: "Não foi possível registrar a revanche." });
      }

      const rematchState = room.rematchRequest.snapshot();
      io.to(room.code).emit("room:rematch-status", rematchState);
      if (!room.rematchRequest.isComplete()) return ack({ ok: true, started: false, rematch: rematchState });

      const previousMatchId = currentMatch.id;
      const firstPlayerId = resolveFirstPlayerId(room.settings);
      room.match = createMatch({
        player1: { ...room.players.player1.profile, deck: room.players.player1.deckSnapshot?.cards || room.players.player1.deck },
        player2: { ...room.players.player2.profile, deck: room.players.player2.deckSnapshot?.cards || room.players.player2.deck },
        firstPlayerId,
        cardIndex
      });
      attachRoomMatchSession(room, { replace: true });
      room.matchHistory = null;
      room.rematchRequest = null;
      syncTurnTimer(room, true);
      io.to(room.code).emit("room:rematch-started", { previousMatchId, firstPlayerId, matchId: room.match.id });
      emitRoom(room, { includeChat: true });
      ack({ ok: true, started: true, matchId: room.match.id });
    });

    onSafe(socket, "match:concede", async (_payload, ack) => {
      const found = findRoomBySocket(socket.id);
      if (!found) return ack({ ok: false, error: "Sala não encontrada." });
      const { room, playerId } = found;
      const match = authoritativeMatch(room);
      if (!room.ranked) return ack({ ok: false, error: "Concessão competitiva disponível apenas no Ranked." });
      if (!match || match.winnerId) return ack({ ok: false, error: "A partida já terminou." });

      const resolution = abandonPolicy.resolveConcede({ playerId, playerIds: Object.keys(room.players || {}) });
      if (!resolution.ok) return ack({ ok: false, error: "Não foi possível registrar a desistência." });

      commitAuthoritativeMatch(room, { ...match, winnerId: resolution.winnerId, winnerReason: resolution.reason });
      getRoomMatchSession(room)?.finish(authoritativeMatch(room));
      const result = await settleRankedRoom(room, resolution.winnerId, resolution.reason);
      await settleRoomHistory(room);
      emitRoom(room);
      ack({ ok: Boolean(result?.ok), reason: resolution.reason, matchSync: roomMatchSync(room) });
    });

    onSafe(socket, "game:action", async (payload, ack) => {
      const found = findRoomBySocket(socket.id);
      if (!found) return ack({ ok: false, error: "Sala não encontrada." });
      const { room, playerId } = found;
      const session = getRoomMatchSession(room) || attachRoomMatchSession(room);
      const match = authoritativeMatch(room);
      if (!match) return ack({ ok: false, error: "Partida ainda não iniciada." });
      if (payload?.action?.type === "MULLIGAN" && room.settings?.mulliganEnabled === false) {
        return ack({ ok: false, error: "Mulligan desativado nas configurações desta sala." });
      }
      if (session) {
        const syncValidation = validateClientStateVersion(session, payload?.stateVersion);
        if (!syncValidation.ok) {
          const state = roomSummary(room, playerId);
          return ack({
            ok: false,
            error: "O estado da partida foi atualizado. Sincronizando novamente.",
            code: "STALE_STATE",
            matchSync: state.matchSync,
            state
          });
        }
      }
      const result = applyGameAction(match, payload.action, playerId, cardIndex);
      if (!result.ok) return ack(result);
      const committedSession = commitAuthoritativeMatch(room, result.match);
      const authoritative = authoritativeMatch(room);
      if (authoritative?.winnerId) {
        committedSession?.finish(authoritative);
        if (room.ranked) {
          await settleRankedRoom(room, authoritative.winnerId, authoritative.winnerReason || "game");
        }
        await settleRoomHistory(room);
      }
      syncTurnTimer(room);
      emitRoom(room);
      const sync = roomMatchSync(room);
      committedSession?.getPlayer(playerId)?.acknowledgeStateVersion(sync?.stateVersion);
      ack({ ok: true, manualResolutionNeeded: result.manualResolutionNeeded, notes: result.notes, matchSync: sync });
    });

    socket.on("disconnect", (reason) => {
      console.log(`[socket.io] desconectado ${socket.id}: ${reason}`);
      onlineEventGuard.clearSocket(socket.id);

      const disconnectedChallenge = challengeRegistry?.cancelBySocket(socket.id);
      if (disconnectedChallenge) {
        const otherSocketId = disconnectedChallenge.challengerSocketId === socket.id
          ? disconnectedChallenge.challengedSocketId
          : disconnectedChallenge.challengerSocketId;
        io.to(otherSocketId).emit("challenge:failed", {
          challengeId: disconnectedChallenge.challengeId,
          code: "CHALLENGE_CANCELLED",
          error: "O outro jogador desconectou antes do desafio começar."
        });
      }
      lobbyPresence.delete(socket.id);
      removeFromCasualQueue(socket.id);
      removeFromRankedQueue(socket.id);
      cancelReadyCheckForSocket(
        socket.id,
        "O outro jogador desconectou durante a confirmação. A procurar novamente..."
      );

      const found = findRoomBySocket(socket.id);
      socketRoomIndex.delete(socket.id);
      if (!found) { emitLobbySnapshot(); return; }
      found.room.players[found.playerId].socketId = null;
      beginRoomReconnect(found.room, found.playerId, DisconnectReason.SOCKET_DISCONNECT);
      const reconnectingPlayer = found.room.players[found.playerId];
      if (reconnectingPlayer.reconnectStateTimer) clearTimeout(reconnectingPlayer.reconnectStateTimer);
      reconnectingPlayer.reconnectStateTimer = setTimeout(() => {
        const room = rooms.get(found.room.code);
        const legacyPlayer = room?.players?.[found.playerId];
        if (!room || !legacyPlayer || legacyPlayer.socketId) return;
        getRoomMatchSession(room)?.getPlayer(found.playerId)?.markTimedOut();
        legacyPlayer.connectionState = PlayerConnectionState.TIMED_OUT;
        legacyPlayer.reconnectDeadline = null;
        legacyPlayer.reconnectStateTimer = null;
        emitRoom(room);
      }, DEFAULT_RECONNECT_WINDOW_MS);
      reconnectingPlayer.reconnectStateTimer.unref?.();
      if (found.room.ranked && authoritativeMatch(found.room) && !authoritativeMatch(found.room).winnerId) {
        const disconnectedId = found.playerId;
        found.room.players[disconnectedId].rankedDisconnectTimer = setTimeout(async () => {
          const room = rooms.get(found.room.code);
          const match = authoritativeMatch(room);
          if (!room?.ranked || match?.winnerId || room.players[disconnectedId]?.socketId) return;
          const session = getRoomMatchSession(room);
          session?.getPlayer(disconnectedId)?.markTimedOut();
          room.players[disconnectedId].connectionState = PlayerConnectionState.TIMED_OUT;
          room.players[disconnectedId].reconnectDeadline = null;
          await resolveRankedDisconnectIfEligible(room, disconnectedId);
          emitRoom(room);
        }, disconnectPolicy.reconnectWindowMs);
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
          if (room.matchSessionId) matchRegistry.delete(room.matchSessionId);
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
    matchRegistry,
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
        matchmakingQueued: casualQueue.size,
        readyChecks: readyCheckRegistry?.size || 0,
        rankedQueued: rankedQueue.size,
        rankedReady: Boolean(rankedSupabase),
        lobbyOnline: lobbyPresence.size,
        publicRooms: [...rooms.values()].filter((room) => room.settings?.visibility === "public").length,
        authoritativeSessions: matchRegistry.size
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
