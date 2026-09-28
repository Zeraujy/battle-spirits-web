import crypto from "node:crypto";

export const ReadyCheckStatus = Object.freeze({
  PENDING: "pending",
  COMPLETE: "complete",
  CANCELLED: "cancelled",
  EXPIRED: "expired"
});

export class ReadyCheckSession {
  constructor({ readyCheckId = crypto.randomUUID(), entries = [], createdAt = Date.now(), deadline } = {}) {
    if (!Array.isArray(entries) || entries.length !== 2) {
      throw new TypeError("ReadyCheckSession requires exactly two queue entries.");
    }

    this.readyCheckId = String(readyCheckId);
    this.createdAt = Number(createdAt) || Date.now();
    this.deadline = Number(deadline) || this.createdAt;
    this.status = ReadyCheckStatus.PENDING;
    this.participants = new Map(entries.map((entry) => [entry.socketId, { entry, ready: false, readyAt: null }]));
  }

  hasSocket(socketId) {
    return this.participants.has(String(socketId || ""));
  }

  markReady(socketId, at = Date.now()) {
    if (this.status !== ReadyCheckStatus.PENDING) return false;
    const participant = this.participants.get(String(socketId || ""));
    if (!participant) return false;
    participant.ready = true;
    participant.readyAt = Number(at) || Date.now();
    if (this.isComplete()) this.status = ReadyCheckStatus.COMPLETE;
    return true;
  }

  isComplete() {
    return [...this.participants.values()].every((participant) => participant.ready);
  }

  cancel() {
    if (this.status === ReadyCheckStatus.PENDING) this.status = ReadyCheckStatus.CANCELLED;
    return this;
  }

  expire() {
    if (this.status === ReadyCheckStatus.PENDING) this.status = ReadyCheckStatus.EXPIRED;
    return this;
  }

  entries() {
    return [...this.participants.values()].map((participant) => participant.entry);
  }

  readyEntries() {
    return [...this.participants.values()].filter((participant) => participant.ready).map((participant) => participant.entry);
  }

  snapshotFor(socketId) {
    const key = String(socketId || "");
    const own = this.participants.get(key);
    if (!own) return null;
    const opponent = [...this.participants.entries()].find(([candidate]) => candidate !== key)?.[1] || null;
    return {
      readyCheckId: this.readyCheckId,
      status: this.status,
      createdAt: this.createdAt,
      deadline: this.deadline,
      playerReady: Boolean(own.ready),
      opponentReady: Boolean(opponent?.ready),
      opponentProfile: opponent?.entry?.profile ? { ...opponent.entry.profile } : null
    };
  }
}
