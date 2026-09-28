import { ChallengeRequest, ChallengeStatus } from "./ChallengeRequest.js";

export class ChallengeRegistry {
  constructor({ expiresInMs = 30_000, onExpire = null } = {}) {
    this.expiresInMs = expiresInMs;
    this.onExpire = typeof onExpire === "function" ? onExpire : null;
    this.requests = new Map();
    this.timers = new Map();
  }

  create(input = {}) {
    const request = new ChallengeRequest({ ...input, expiresInMs: input.expiresInMs ?? this.expiresInMs });
    this.cancelBySocket(request.challengerSocketId);
    this.cancelBySocket(request.challengedSocketId);
    this.requests.set(request.challengeId, request);
    const delay = Math.max(0, request.expiresAt - Date.now());
    const timer = setTimeout(() => {
      if (request.status === ChallengeStatus.PENDING) {
        request.status = ChallengeStatus.EXPIRED;
        this.onExpire?.(request);
      }
      this.delete(request.challengeId);
    }, delay);
    timer.unref?.();
    this.timers.set(request.challengeId, timer);
    return request;
  }

  get(challengeId) { return this.requests.get(String(challengeId || "")) || null; }

  getBySocket(socketId) {
    for (const request of this.requests.values()) {
      if (request.hasSocket(socketId) && request.status === ChallengeStatus.PENDING) return request;
    }
    return null;
  }

  delete(challengeId) {
    const id = String(challengeId || "");
    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);
    this.timers.delete(id);
    return this.requests.delete(id);
  }

  cancelBySocket(socketId) {
    const request = this.getBySocket(socketId);
    if (!request) return null;
    request.cancel(socketId);
    this.delete(request.challengeId);
    return request;
  }

  get size() { return this.requests.size; }
}
