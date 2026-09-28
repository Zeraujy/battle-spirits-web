import { DEFAULT_RECONNECT_WINDOW_MS } from "../../src/online/domain/onlineConstants.js";

export class DisconnectPolicy {
  constructor({ reconnectWindowMs = DEFAULT_RECONNECT_WINDOW_MS } = {}) {
    this.reconnectWindowMs = Math.max(1_000, Number(reconnectWindowMs) || DEFAULT_RECONNECT_WINDOW_MS);
  }

  deadline(now = Date.now()) {
    return Number(now) + this.reconnectWindowMs;
  }

  hasExpired({ disconnectedAt, now = Date.now() } = {}) {
    const startedAt = Number(disconnectedAt);
    if (!Number.isFinite(startedAt)) return false;
    return Number(now) >= startedAt + this.reconnectWindowMs;
  }

  resolveTimeout({ playerId, playerIds = ["player1", "player2"] } = {}) {
    const loserId = String(playerId || "");
    if (!playerIds.includes(loserId)) return { ok: false, code: "PLAYER_INVALID" };
    const winnerId = playerIds.find((candidate) => candidate !== loserId) || null;
    if (!winnerId) return { ok: false, code: "OPPONENT_MISSING" };
    return {
      ok: true,
      winnerId,
      loserId,
      reason: "disconnect_timeout",
      penalty: "ranked_loss"
    };
  }
}
