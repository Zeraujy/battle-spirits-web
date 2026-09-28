import crypto from "node:crypto";

export const OnlineGuardCode = Object.freeze({
  RATE_LIMITED: "RATE_LIMITED",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
  INVALID_PAYLOAD: "INVALID_PAYLOAD"
});

export const DEFAULT_ONLINE_EVENT_RULES = Object.freeze({
  default: Object.freeze({ maxRequests: 80, windowMs: 10_000, maxPayloadBytes: 64 * 1024 }),
  "lobby:identify": Object.freeze({ maxRequests: 12, windowMs: 10_000, maxPayloadBytes: 180 * 1024 }),
  "lobby:list": Object.freeze({ maxRequests: 30, windowMs: 10_000, maxPayloadBytes: 2 * 1024 }),
  "challenge:send": Object.freeze({ maxRequests: 8, windowMs: 10_000, maxPayloadBytes: 180 * 1024 }),
  "challenge:accept": Object.freeze({ maxRequests: 12, windowMs: 10_000, maxPayloadBytes: 180 * 1024 }),
  "challenge:decline": Object.freeze({ maxRequests: 20, windowMs: 10_000, maxPayloadBytes: 4 * 1024 }),
  "challenge:cancel": Object.freeze({ maxRequests: 20, windowMs: 10_000, maxPayloadBytes: 4 * 1024 }),
  "matchmaking:join": Object.freeze({ maxRequests: 12, windowMs: 10_000, maxPayloadBytes: 180 * 1024 }),
  "matchmaking:ready": Object.freeze({ maxRequests: 20, windowMs: 10_000, maxPayloadBytes: 4 * 1024 }),
  "matchmaking:cancel": Object.freeze({ maxRequests: 20, windowMs: 10_000, maxPayloadBytes: 2 * 1024 }),
  "matchmaking:abort": Object.freeze({ maxRequests: 20, windowMs: 10_000, maxPayloadBytes: 8 * 1024 }),
  "ranked:join": Object.freeze({ maxRequests: 10, windowMs: 10_000, maxPayloadBytes: 180 * 1024 }),
  "ranked:cancel": Object.freeze({ maxRequests: 20, windowMs: 10_000, maxPayloadBytes: 2 * 1024 }),
  "room:create": Object.freeze({ maxRequests: 8, windowMs: 10_000, maxPayloadBytes: 200 * 1024 }),
  "room:join": Object.freeze({ maxRequests: 12, windowMs: 10_000, maxPayloadBytes: 200 * 1024 }),
  "room:resume": Object.freeze({ maxRequests: 12, windowMs: 10_000, maxPayloadBytes: 8 * 1024 }),
  "room:start": Object.freeze({ maxRequests: 12, windowMs: 10_000, maxPayloadBytes: 4 * 1024 }),
  "room:chat": Object.freeze({ maxRequests: 8, windowMs: 5_000, maxPayloadBytes: 4 * 1024 }),
  "room:rematch": Object.freeze({ maxRequests: 12, windowMs: 10_000, maxPayloadBytes: 2 * 1024 }),
  "match:concede": Object.freeze({ maxRequests: 6, windowMs: 10_000, maxPayloadBytes: 2 * 1024 }),
  "game:action": Object.freeze({ maxRequests: 240, windowMs: 10_000, maxPayloadBytes: 64 * 1024 })
});

export function serializedPayloadSize(payload) {
  try {
    return Buffer.byteLength(JSON.stringify(payload ?? {}), "utf8");
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

export function constantTimeTokenEqual(left, right) {
  const a = Buffer.from(String(left || ""), "utf8");
  const b = Buffer.from(String(right || ""), "utf8");
  if (!a.length || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export class OnlineEventGuard {
  constructor({ rules = DEFAULT_ONLINE_EVENT_RULES, now = () => Date.now() } = {}) {
    this.rules = rules;
    this.now = now;
    this.buckets = new Map();
  }

  ruleFor(eventName) {
    return this.rules[eventName] || this.rules.default || DEFAULT_ONLINE_EVENT_RULES.default;
  }

  inspect(socketId, eventName, payload) {
    const rule = this.ruleFor(eventName);
    const payloadBytes = serializedPayloadSize(payload);
    if (!Number.isFinite(payloadBytes)) {
      return { ok: false, code: OnlineGuardCode.INVALID_PAYLOAD, retryAfterMs: 0 };
    }
    if (payloadBytes > rule.maxPayloadBytes) {
      return { ok: false, code: OnlineGuardCode.PAYLOAD_TOO_LARGE, retryAfterMs: 0, payloadBytes, maxPayloadBytes: rule.maxPayloadBytes };
    }

    const now = this.now();
    const key = `${socketId}:${eventName}`;
    let bucket = this.buckets.get(key);
    if (!bucket || now - bucket.startedAt >= rule.windowMs) {
      bucket = { startedAt: now, count: 0 };
      this.buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > rule.maxRequests) {
      return {
        ok: false,
        code: OnlineGuardCode.RATE_LIMITED,
        retryAfterMs: Math.max(1, rule.windowMs - (now - bucket.startedAt))
      };
    }
    return { ok: true };
  }

  clearSocket(socketId) {
    const prefix = `${socketId}:`;
    for (const key of this.buckets.keys()) {
      if (key.startsWith(prefix)) this.buckets.delete(key);
    }
  }
}
