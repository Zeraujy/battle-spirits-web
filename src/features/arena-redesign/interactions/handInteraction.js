export const ARENA_HAND_CARD_DRAG_MIME = "application/x-bs-hand-card";

export function createHandCardInteractionPayload({
  playerId,
  instanceId,
  cardId = null,
  cardType = null,
  sourceZone = "hand"
} = {}) {
  return {
    playerId: playerId || null,
    instanceId: instanceId || null,
    cardId: cardId || null,
    cardType: cardType || null,
    sourceZone: sourceZone || "hand"
  };
}

export function writeHandCardDragPayload(event, payload) {
  if (!event?.dataTransfer || !payload?.instanceId) return false;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData(ARENA_HAND_CARD_DRAG_MIME, JSON.stringify(payload));
  event.dataTransfer.setData("text/plain", `bs-hand-card:${payload.instanceId}`);
  return true;
}

export function readHandCardDragPayload(event) {
  if (!event?.dataTransfer) return null;
  try {
    const raw = event.dataTransfer.getData(ARENA_HAND_CARD_DRAG_MIME);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    return payload?.instanceId ? payload : null;
  } catch {
    return null;
  }
}

export function isHandCardDrag(event) {
  const types = Array.from(event?.dataTransfer?.types || []);
  return types.includes(ARENA_HAND_CARD_DRAG_MIME);
}

export function getTouchHandDropTarget(documentLike, clientX, clientY) {
  if (!documentLike?.elementFromPoint) return null;
  const element = documentLike.elementFromPoint(clientX, clientY);
  return element?.closest?.('[data-hand-drop-target="true"]') || null;
}
