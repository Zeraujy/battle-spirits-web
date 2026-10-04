export const ARENA_VISUAL_MANUAL_ACTIONS = Object.freeze({
  DRAW_ONE: "draw",
  TOP_DECK_TO_TRASH: "topDeckToTrash",
  ADJUST_LIFE: "adjustLife",
  VOID_TO_RESERVE: "voidToReserve",
  TEMPORARY_BP: "temporaryBP",
  REFRESH: "refresh",
  EXHAUST: "exhaust",
  DESTROY: "destroy",
  RETURN_HAND: "returnHand",
  MOVE_CARD: "moveCard",
  REVEAL_TOP: "revealTop",
  REVEALED_TO_HAND: "revealedToHand",
  REVEALED_TO_TOP: "revealedToTop",
  REVEALED_TO_BOTTOM: "revealedToBottom"
});

export const ARENA_VISUAL_MANUAL_DESTINATIONS = Object.freeze([
  { id: "hand", label: "Hand" },
  { id: "trash", label: "Trash" },
  { id: "deck-top", label: "Deck Top", destination: "deck", placement: "top" },
  { id: "deck-bottom", label: "Deck Bottom", destination: "deck", placement: "bottom" }
]);

export function createArenaVisualManualPolicy({
  mode = "local",
  canControlActor = false,
  blockingPending = false,
  winnerId = null
} = {}) {
  const online = mode === "online" || mode === "ranked";
  if (online) {
    return {
      canUse: false,
      mode,
      reason: "Manual fallback tools are disabled in Online matches to preserve server authority."
    };
  }
  if (winnerId) {
    return { canUse: false, mode, reason: "The match is already complete." };
  }
  if (blockingPending) {
    return { canUse: false, mode, reason: "Resolve the current mandatory game action first." };
  }
  if (!canControlActor) {
    return { canUse: false, mode, reason: "Manual fallback tools are available only to the current local controller." };
  }
  return {
    canUse: true,
    mode,
    reason: "Manual fallback is available for unresolved card text and tabletop corrections."
  };
}
