import crypto from "node:crypto";

export const ChallengeStatus = Object.freeze({
  PENDING: "pending",
  ACCEPTED: "accepted",
  DECLINED: "declined",
  EXPIRED: "expired",
  CANCELLED: "cancelled"
});

export class ChallengeRequest {
  constructor({
    challengeId = crypto.randomUUID(),
    challengerSocketId,
    challengedSocketId,
    challengerUserId,
    challengedUserId,
    challengerProfile = {},
    challengerDeck = null,
    createdAt = Date.now(),
    expiresInMs = 30_000
  } = {}) {
    if (!challengerSocketId || !challengedSocketId) throw new Error("Challenge requires two sockets.");
    this.challengeId = String(challengeId);
    this.challengerSocketId = String(challengerSocketId);
    this.challengedSocketId = String(challengedSocketId);
    this.challengerUserId = challengerUserId ? String(challengerUserId) : null;
    this.challengedUserId = challengedUserId ? String(challengedUserId) : null;
    this.challengerProfile = Object.freeze({ ...(challengerProfile || {}) });
    this.challengerDeck = challengerDeck ? Object.freeze({ ...challengerDeck }) : null;
    this.createdAt = Number(createdAt);
    this.expiresAt = this.createdAt + Math.max(5_000, Number(expiresInMs || 30_000));
    this.status = ChallengeStatus.PENDING;
  }

  hasSocket(socketId) {
    return this.challengerSocketId === socketId || this.challengedSocketId === socketId;
  }

  isPending(now = Date.now()) {
    if (this.status !== ChallengeStatus.PENDING) return false;
    if (Number(now) > this.expiresAt) {
      this.status = ChallengeStatus.EXPIRED;
      return false;
    }
    return true;
  }

  accept(socketId) {
    if (socketId !== this.challengedSocketId || !this.isPending()) return false;
    this.status = ChallengeStatus.ACCEPTED;
    return true;
  }

  decline(socketId) {
    if (socketId !== this.challengedSocketId || !this.isPending()) return false;
    this.status = ChallengeStatus.DECLINED;
    return true;
  }

  cancel(socketId) {
    if (!this.hasSocket(socketId) || !this.isPending()) return false;
    this.status = ChallengeStatus.CANCELLED;
    return true;
  }

  snapshotFor(socketId, now = Date.now()) {
    return {
      challengeId: this.challengeId,
      status: this.status,
      role: socketId === this.challengerSocketId ? "challenger" : "challenged",
      challengerProfile: { ...this.challengerProfile },
      expiresAt: this.expiresAt,
      remainingMs: Math.max(0, this.expiresAt - Number(now))
    };
  }
}
