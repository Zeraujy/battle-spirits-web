import { DEFAULT_RECONNECT_WINDOW_MS } from "../../src/online/domain/onlineConstants.js";
import { PlayerConnectionState } from "../../src/online/domain/matchStatus.js";

export class ReconnectManager {
  constructor({ reconnectWindowMs = DEFAULT_RECONNECT_WINDOW_MS, now = () => Date.now() } = {}) {
    this.reconnectWindowMs = reconnectWindowMs;
    this.now = now;
  }

  begin(player, reason) {
    if (!player) throw new TypeError("ReconnectManager requires a MatchPlayer.");
    player.beginReconnect({
      reason,
      reconnectWindowMs: this.reconnectWindowMs,
      now: this.now()
    });
    return player.reconnectDeadline;
  }

  canResume(player, token) {
    return Boolean(player?.canReconnect(token, this.now()));
  }

  resume(player, socketId, token) {
    if (!this.canResume(player, token)) return false;
    player.connect(socketId);
    return true;
  }

  expire(player) {
    if (!player) return false;
    if (player.connectionState !== PlayerConnectionState.RECONNECTING) return false;
    if (!player.reconnectDeadline || player.reconnectDeadline > this.now()) return false;
    player.markTimedOut();
    return true;
  }
}
