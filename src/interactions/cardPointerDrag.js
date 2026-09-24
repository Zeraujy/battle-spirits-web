/**
 * Pointer-driven card dragging for the simulator.
 *
 * The browser's native HTML drag-and-drop is deliberately avoided for cards.
 * Native DnD shows a semi-transparent drag image and often a prohibited cursor.
 * This helper keeps the real card fully visible and lets the simulator render its
 * own high-quality drag preview instead.
 */

export const CARD_DROP_ATTRIBUTE = "data-card-drop-zone";

/** Minimum pointer travel before a press becomes a drag. */
export const CARD_DRAG_THRESHOLD = 7;

export function pointerDistance(startX, startY, x, y) {
  return Math.hypot(Number(x) - Number(startX), Number(y) - Number(startY));
}

/**
 * Returns the nearest declared card drop target under a screen coordinate.
 * Drop targets expose their purpose through data-card-drop-zone and optional
 * player / placement metadata.
 */
export function getCardDropTargetAt(x, y) {
  const element = document.elementFromPoint(x, y)?.closest?.(`[${CARD_DROP_ATTRIBUTE}]`);
  if (!element) return null;

  return {
    element,
    zone: element.dataset.cardDropZone || "",
    playerId: element.dataset.cardDropPlayer || "",
    placement: element.dataset.cardDropPlacement || ""
  };
}

/**
 * Prevents accidental browser text/image selection while a pointer drag is live.
 */
export function setCardDragDocumentState(active) {
  document.documentElement.classList.toggle("card-pointer-dragging", Boolean(active));
  document.body.classList.toggle("card-pointer-dragging", Boolean(active));
}
