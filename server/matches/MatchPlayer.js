import { PlayerConnectionState } from "../../src/online/domain/matchStatus.js";

function cloneDeck(deck) {
  return Array.isArray(deck) ? deck.map((card) => ({ ...card })) : [];
}

export class MatchPlayer {
  constructor({ playerId, socketId = null, profile = {}, deck = [], deckId = null, resumeToken = null } = {}) {
    if (!playerId) throw new TypeError("MatchPlayer requires playerId.");

    this.playerId = playerId;
    this.socketId = socketId;
    this.profile = { ...profile };
    this.deck = cloneDeck(deck);
    this.deckId = deckId || null;
    this.resumeToken = resumeToken || null;
    this.connectionState = socketId ? PlayerConnectionState.CONNECTED : PlayerConnectionState.DISCONNECTED;
    this.connectedAt = socketId ? Date.now() : null;
    this.disconnectedAt = socketId ? null : Date.now();
  }

  connect(socketId) {
    if (!socketId) throw new TypeError("socketId is required to connect a MatchPlayer.");
    this.socketId = socketId;
    this.connectionState = PlayerConnectionState.CONNECTED;
    this.connectedAt = Date.now();
    this.disconnectedAt = null;
    return this;
  }

  disconnect() {
    this.socketId = null;
    this.connectionState = PlayerConnectionState.DISCONNECTED;
    this.disconnectedAt = Date.now();
    return this;
  }

  markReconnecting() {
    this.connectionState = PlayerConnectionState.RECONNECTING;
    return this;
  }

  markTimedOut() {
    this.socketId = null;
    this.connectionState = PlayerConnectionState.TIMED_OUT;
    if (!this.disconnectedAt) this.disconnectedAt = Date.now();
    return this;
  }

  markLeft() {
    this.socketId = null;
    this.connectionState = PlayerConnectionState.LEFT;
    if (!this.disconnectedAt) this.disconnectedAt = Date.now();
    return this;
  }

  snapshot({ includePrivate = false } = {}) {
    return {
      playerId: this.playerId,
      profile: { ...this.profile },
      deckId: this.deckId,
      connectionState: this.connectionState,
      connected: Boolean(this.socketId),
      ...(includePrivate ? {
        socketId: this.socketId,
        resumeToken: this.resumeToken,
        deck: cloneDeck(this.deck)
      } : {})
    };
  }
}
