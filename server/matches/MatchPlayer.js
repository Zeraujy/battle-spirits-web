import { PlayerConnectionState, DisconnectReason } from "../../src/online/domain/matchStatus.js";
import { DEFAULT_RECONNECT_WINDOW_MS } from "../../src/online/domain/onlineConstants.js";

function cloneDeck(deck) {
  return Array.isArray(deck) ? deck.map((card) => ({ ...card })) : [];
}

function cloneDeckSnapshot(snapshot) {
  if (!snapshot) return null;
  return {
    snapshotId: snapshot.snapshotId || null,
    deckId: snapshot.deckId || null,
    deckName: snapshot.deckName || "Deck",
    coverCardId: snapshot.coverCardId || null,
    cardCount: Number(snapshot.cardCount || 0),
    fingerprint: snapshot.fingerprint || null,
    lockedAt: Number(snapshot.lockedAt || 0) || null,
    cards: cloneDeck(snapshot.cards)
  };
}

export class MatchPlayer {
  constructor({
    playerId,
    socketId = null,
    profile = {},
    deck = [],
    deckId = null,
    deckSnapshot = null,
    resumeToken = null,
    sessionToken = resumeToken,
    connectionState = null,
    reconnectDeadline = null
  } = {}) {
    if (!playerId) throw new TypeError("MatchPlayer requires playerId.");

    this.playerId = playerId;
    this.socketId = socketId;
    this.profile = { ...profile };
    this.deckSnapshot = cloneDeckSnapshot(deckSnapshot);
    this.deck = this.deckSnapshot ? cloneDeck(this.deckSnapshot.cards) : cloneDeck(deck);
    this.deckId = this.deckSnapshot?.deckId || deckId || null;
    this.sessionToken = sessionToken || resumeToken || null;
    // Legacy alias kept while room payloads still use resumeToken.
    this.resumeToken = this.sessionToken;
    this.connectionState = connectionState || (socketId ? PlayerConnectionState.CONNECTED : PlayerConnectionState.DISCONNECTED);
    this.connectedAt = socketId ? Date.now() : null;
    this.disconnectedAt = socketId ? null : Date.now();
    this.reconnectDeadline = reconnectDeadline || null;
    this.disconnectReason = null;
    this.lastAcknowledgedStateVersion = null;
  }

  connect(socketId) {
    if (!socketId) throw new TypeError("socketId is required to connect a MatchPlayer.");
    this.socketId = socketId;
    this.connectionState = PlayerConnectionState.CONNECTED;
    this.connectedAt = Date.now();
    this.disconnectedAt = null;
    this.reconnectDeadline = null;
    this.disconnectReason = null;
    return this;
  }

  disconnect(reason = DisconnectReason.SOCKET_DISCONNECT) {
    this.socketId = null;
    this.connectionState = PlayerConnectionState.DISCONNECTED;
    this.disconnectedAt = Date.now();
    this.disconnectReason = reason;
    return this;
  }

  beginReconnect({
    reason = DisconnectReason.SOCKET_DISCONNECT,
    reconnectWindowMs = DEFAULT_RECONNECT_WINDOW_MS,
    now = Date.now()
  } = {}) {
    this.socketId = null;
    this.connectionState = PlayerConnectionState.RECONNECTING;
    this.disconnectedAt = now;
    this.reconnectDeadline = now + Math.max(0, Number(reconnectWindowMs) || 0);
    this.disconnectReason = reason;
    return this;
  }

  canReconnect(token, now = Date.now()) {
    if (!token || !this.sessionToken || token !== this.sessionToken) return false;
    if (this.connectionState !== PlayerConnectionState.RECONNECTING && this.connectionState !== PlayerConnectionState.DISCONNECTED) return false;
    if (this.reconnectDeadline && now > this.reconnectDeadline) return false;
    return true;
  }

  acknowledgeStateVersion(value) {
    const version = Number(value);
    if (Number.isInteger(version) && version >= 0) this.lastAcknowledgedStateVersion = version;
    return this.lastAcknowledgedStateVersion;
  }

  markReconnecting() {
    this.connectionState = PlayerConnectionState.RECONNECTING;
    return this;
  }

  markTimedOut() {
    this.socketId = null;
    this.connectionState = PlayerConnectionState.TIMED_OUT;
    if (!this.disconnectedAt) this.disconnectedAt = Date.now();
    this.reconnectDeadline = null;
    return this;
  }

  markLeft() {
    this.socketId = null;
    this.connectionState = PlayerConnectionState.LEFT;
    if (!this.disconnectedAt) this.disconnectedAt = Date.now();
    this.reconnectDeadline = null;
    this.disconnectReason = DisconnectReason.PLAYER_LEFT;
    return this;
  }

  snapshot({ includePrivate = false } = {}) {
    return {
      playerId: this.playerId,
      profile: { ...this.profile },
      deckId: this.deckId,
      connectionState: this.connectionState,
      connected: Boolean(this.socketId),
      reconnectDeadline: this.reconnectDeadline,
      disconnectedAt: this.disconnectedAt,
      ...(includePrivate ? {
        socketId: this.socketId,
        sessionToken: this.sessionToken,
        resumeToken: this.resumeToken,
        deck: cloneDeck(this.deck),
        deckSnapshot: cloneDeckSnapshot(this.deckSnapshot),
        lastAcknowledgedStateVersion: this.lastAcknowledgedStateVersion,
        disconnectReason: this.disconnectReason
      } : {})
    };
  }
}
