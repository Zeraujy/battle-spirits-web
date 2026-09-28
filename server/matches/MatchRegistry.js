import { MatchSession } from "./MatchSession.js";

export class MatchRegistry {
  constructor() {
    this.sessions = new Map();
  }

  register(session) {
    if (!(session instanceof MatchSession)) throw new TypeError("MatchRegistry only accepts MatchSession instances.");
    if (this.sessions.has(session.matchId)) throw new Error(`MatchSession already registered: ${session.matchId}`);
    this.sessions.set(session.matchId, session);
    return session;
  }

  get(matchId) {
    return this.sessions.get(String(matchId)) || null;
  }

  has(matchId) {
    return this.sessions.has(String(matchId));
  }

  delete(matchId) {
    return this.sessions.delete(String(matchId));
  }

  findBySessionToken(token) {
    if (!token) return null;
    for (const session of this.sessions.values()) {
      const player = session.getPlayerBySessionToken(token);
      if (player) return { session, player };
    }
    return null;
  }

  findBySocket(socketId) {
    for (const session of this.sessions.values()) {
      const player = session.getPlayerBySocket(socketId);
      if (player) return { session, player };
    }
    return null;
  }

  list() {
    return [...this.sessions.values()];
  }

  get size() {
    return this.sessions.size;
  }
}
