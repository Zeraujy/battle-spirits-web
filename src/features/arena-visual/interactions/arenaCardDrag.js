const CARD_DRAG_MIME = "application/x-bs-arena-visual-card";

export function writeArenaVisualCardDrag(event, payload) {
  if (!event?.dataTransfer || !payload) return false;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData(CARD_DRAG_MIME, JSON.stringify(payload));
  event.dataTransfer.setData("text/plain", "bs-arena-card");
  return true;
}

export function readArenaVisualCardDrag(event) {
  try {
    const raw = event?.dataTransfer?.getData(CARD_DRAG_MIME);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export { CARD_DRAG_MIME };
