const CONNECTION_LABELS = Object.freeze({
  connected: "Connected",
  disconnected: "Disconnected",
  reconnecting: "Reconnecting",
  timedOut: "Timed out",
  left: "Left"
});

function playerState(roomState, playerId) {
  return roomState?.players?.[playerId] || null;
}

function secondsUntil(deadline, now) {
  const value = Number(deadline);
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.ceil((value - Number(now || Date.now())) / 1000));
}

export function createArenaVisualOnlineStatus({
  mode = "local",
  roomState = null,
  viewerPlayerId = null,
  opponentPlayerId = null,
  socketConnected = true,
  now = Date.now(),
  turnRemainingSeconds = null,
  notice = "",
  error = ""
} = {}) {
  const enabled = mode === "online" || mode === "ranked";
  if (!enabled) return { enabled: false };

  const viewer = playerState(roomState, viewerPlayerId);
  const opponent = playerState(roomState, opponentPlayerId);
  const viewerConnectionState = socketConnected
    ? (viewer?.connectionState || (viewer?.connected === false ? "disconnected" : "connected"))
    : "reconnecting";
  const opponentConnectionState = opponent?.connectionState || (opponent?.connected === false ? "disconnected" : "connected");

  return {
    enabled: true,
    mode,
    matchStatus: roomState?.status || (roomState?.started ? "active" : "waiting"),
    viewerConnectionState,
    viewerConnectionLabel: CONNECTION_LABELS[viewerConnectionState] || "Disconnected",
    opponentConnectionState,
    opponentConnectionLabel: CONNECTION_LABELS[opponentConnectionState] || "Disconnected",
    viewerNeedsReconnect: ["disconnected", "reconnecting"].includes(viewerConnectionState),
    opponentNeedsReconnect: ["disconnected", "reconnecting"].includes(opponentConnectionState),
    viewerReconnectRemainingSeconds: secondsUntil(viewer?.reconnectDeadline, now),
    opponentReconnectRemainingSeconds: secondsUntil(opponent?.reconnectDeadline, now),
    turnRemainingSeconds: Number.isFinite(turnRemainingSeconds) ? Math.max(0, Number(turnRemainingSeconds)) : null,
    turnPlayerId: roomState?.turnClock?.activePlayerId || null,
    serverAuthoritative: Boolean(roomState?.matchSync || roomState?.matchHistoryRecord?.server_authoritative || mode === "ranked"),
    stateVersion: roomState?.matchSync?.stateVersion ?? null,
    notice: String(notice || ""),
    error: String(error || "")
  };
}
