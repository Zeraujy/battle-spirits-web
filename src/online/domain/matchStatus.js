export const MatchStatus = Object.freeze({
  WAITING: "waiting",
  READY_CHECK: "readyCheck",
  STARTING: "starting",
  ACTIVE: "active",
  RECONNECTING: "reconnecting",
  FINISHED: "finished",
  CANCELLED: "cancelled"
});

export const PlayerConnectionState = Object.freeze({
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  RECONNECTING: "reconnecting",
  TIMED_OUT: "timedOut",
  LEFT: "left"
});

export const MatchResult = Object.freeze({
  WIN: "win",
  LOSS: "loss",
  DRAW: "draw",
  CANCELLED: "cancelled"
});

export const DisconnectReason = Object.freeze({
  SOCKET_DISCONNECT: "socketDisconnect",
  RECONNECT_TIMEOUT: "reconnectTimeout",
  PLAYER_LEFT: "playerLeft",
  SERVER_SHUTDOWN: "serverShutdown",
  UNKNOWN: "unknown"
});

export function isTerminalMatchStatus(status) {
  return status === MatchStatus.FINISHED || status === MatchStatus.CANCELLED;
}
