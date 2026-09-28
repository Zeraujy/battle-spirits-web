import { MatchMode } from "../../src/online/domain/matchModes.js";
import { MatchStatus, PlayerConnectionState, isTerminalMatchStatus } from "../../src/online/domain/matchStatus.js";
import { MAX_MATCH_PLAYERS, PLAYER_IDS } from "../../src/online/domain/onlineConstants.js";
import { MatchPlayer } from "./MatchPlayer.js";

function cloneState(value) {
  if (value == null) return value;
  return structuredClone(value);
}

export class MatchSession {
  constructor({
    matchId,
    mode = MatchMode.CASUAL,
    status = MatchStatus.WAITING,
    players = [],
    gameState = null,
    metadata = {},
    createdAt = Date.now()
  } = {}) {
    if (!matchId) throw new TypeError("MatchSession requires matchId.");

    this.matchId = String(matchId);
    this.mode = mode;
    this.status = status;
    this.players = new Map();
    this.gameState = gameState;
    this.metadata = { ...metadata };
    this.createdAt = createdAt;
    this.startedAt = null;
    this.finishedAt = null;
    this.stateVersion = 0;
    this.serverSequence = 0;
    this.lastUpdatedAt = createdAt;

    for (const player of players) this.addPlayer(player);
  }

  addPlayer(player) {
    if (this.players.size >= MAX_MATCH_PLAYERS) throw new RangeError("MatchSession is full.");
    const normalized = player instanceof MatchPlayer ? player : new MatchPlayer(player);
    if (!PLAYER_IDS.includes(normalized.playerId)) throw new TypeError(`Unsupported playerId: ${normalized.playerId}`);
    if (this.players.has(normalized.playerId)) throw new Error(`Player already exists: ${normalized.playerId}`);
    this.players.set(normalized.playerId, normalized);
    return normalized;
  }

  getPlayer(playerId) {
    return this.players.get(playerId) || null;
  }

  getPlayerBySocket(socketId) {
    if (!socketId) return null;
    return [...this.players.values()].find((player) => player.socketId === socketId) || null;
  }

  getPlayerBySessionToken(token) {
    if (!token) return null;
    return [...this.players.values()].find((player) => player.sessionToken === token) || null;
  }

  touch() {
    this.lastUpdatedAt = Date.now();
    return this;
  }

  setStatus(status) {
    this.status = status;
    if (status === MatchStatus.ACTIVE && !this.startedAt) this.startedAt = Date.now();
    if (isTerminalMatchStatus(status) && !this.finishedAt) this.finishedAt = Date.now();
    this.touch();
    return this;
  }

  commitGameState(gameState) {
    if (!gameState) throw new TypeError("gameState is required.");
    this.gameState = gameState;
    this.stateVersion += 1;
    this.serverSequence += 1;
    this.touch();
    return this.stateVersion;
  }

  start(gameState) {
    if (this.players.size !== MAX_MATCH_PLAYERS) throw new Error("MatchSession requires two players before start.");
    this.commitGameState(gameState);
    this.setStatus(MatchStatus.ACTIVE);
    return this;
  }

  replaceGameState(gameState) {
    return this.commitGameState(gameState);
  }

  beginReconnect(playerId, options) {
    const player = this.getPlayer(playerId);
    if (!player) throw new Error(`Unknown MatchPlayer: ${playerId}`);
    player.beginReconnect(options);
    if (!isTerminalMatchStatus(this.status)) this.setStatus(MatchStatus.RECONNECTING);
    return player;
  }

  reconnectPlayer(playerId, socketId, token) {
    const player = this.getPlayer(playerId);
    if (!player || !player.canReconnect(token)) return null;
    player.connect(socketId);
    const allConnected = [...this.players.values()].every((entry) => entry.connectionState === PlayerConnectionState.CONNECTED);
    if (allConnected && this.gameState && !isTerminalMatchStatus(this.status)) this.setStatus(MatchStatus.ACTIVE);
    return player;
  }

  finish(gameState = this.gameState) {
    if (gameState && gameState !== this.gameState) this.commitGameState(gameState);
    else {
      this.stateVersion += 1;
      this.serverSequence += 1;
      this.touch();
    }
    this.setStatus(MatchStatus.FINISHED);
    return this;
  }

  cancel() {
    this.setStatus(MatchStatus.CANCELLED);
    return this;
  }

  snapshot({ includePrivatePlayers = false, includeGameState = true } = {}) {
    return {
      matchId: this.matchId,
      mode: this.mode,
      status: this.status,
      stateVersion: this.stateVersion,
      serverSequence: this.serverSequence,
      lastUpdatedAt: this.lastUpdatedAt,
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      finishedAt: this.finishedAt,
      metadata: { ...this.metadata },
      players: Object.fromEntries(
        [...this.players.entries()].map(([playerId, player]) => [playerId, player.snapshot({ includePrivate: includePrivatePlayers })])
      ),
      ...(includeGameState ? { gameState: cloneState(this.gameState) } : {})
    };
  }
}
