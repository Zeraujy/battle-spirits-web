export const ARENA_VISUAL_EXIT_STRATEGY = Object.freeze({
  LOCAL: "LOCAL",
  ONLINE_CONCEDE: "ONLINE_CONCEDE",
  ONLINE_EXIT: "ONLINE_EXIT"
});

export function resolveArenaVisualExitStrategy({ mode = "local", hasConcede = false } = {}) {
  const onlineMode = mode === "online" || mode === "ranked";
  if (!onlineMode) return ARENA_VISUAL_EXIT_STRATEGY.LOCAL;
  return hasConcede
    ? ARENA_VISUAL_EXIT_STRATEGY.ONLINE_CONCEDE
    : ARENA_VISUAL_EXIT_STRATEGY.ONLINE_EXIT;
}

export function createArenaVisualSurrenderResult(match, viewerPlayerId, opponentPlayerId) {
  if (!match || !opponentPlayerId) return match;
  return {
    ...match,
    winnerId: opponentPlayerId,
    winnerReason: "surrender",
    surrenderedPlayerId: viewerPlayerId || null
  };
}
