import { DEFAULT_READY_CHECK_WINDOW_MS } from "../../src/online/domain/onlineConstants.js";
import { ReadyCheckSession } from "./ReadyCheckSession.js";

export class ReadyCheckRegistry {
  constructor({ windowMs = DEFAULT_READY_CHECK_WINDOW_MS, onExpire = null } = {}) {
    this.windowMs = Math.max(1_000, Number(windowMs) || DEFAULT_READY_CHECK_WINDOW_MS);
    this.onExpire = typeof onExpire === "function" ? onExpire : null;
    this.sessions = new Map();
    this.bySocket = new Map();
    this.timers = new Map();
  }

  get size() {
    return this.sessions.size;
  }

  create(entries, { now = Date.now() } = {}) {
    const session = new ReadyCheckSession({ entries, createdAt: now, deadline: now + this.windowMs });
    this.sessions.set(session.readyCheckId, session);
    for (const entry of entries) this.bySocket.set(entry.socketId, session.readyCheckId);

    const timer = setTimeout(() => {
      const current = this.sessions.get(session.readyCheckId);
      if (!current) return;
      current.expire();
      this.delete(current.readyCheckId);
      this.onExpire?.(current);
    }, this.windowMs);
    timer.unref?.();
    this.timers.set(session.readyCheckId, timer);
    return session;
  }

  get(readyCheckId) {
    return this.sessions.get(String(readyCheckId || "")) || null;
  }

  getBySocket(socketId) {
    const id = this.bySocket.get(String(socketId || ""));
    return id ? this.get(id) : null;
  }

  delete(readyCheckId) {
    const id = String(readyCheckId || "");
    const session = this.sessions.get(id);
    if (!session) return null;
    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);
    this.timers.delete(id);
    this.sessions.delete(id);
    for (const entry of session.entries()) this.bySocket.delete(entry.socketId);
    return session;
  }

  cancelBySocket(socketId) {
    const session = this.getBySocket(socketId);
    if (!session) return null;
    session.cancel();
    this.delete(session.readyCheckId);
    return session;
  }

  complete(readyCheckId) {
    const session = this.get(readyCheckId);
    if (!session || !session.isComplete()) return null;
    this.delete(session.readyCheckId);
    return session;
  }
}
