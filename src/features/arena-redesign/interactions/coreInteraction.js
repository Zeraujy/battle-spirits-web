export const ARENA_CORE_DRAG_MIME = "application/x-bs-core";

export function createCoreInteractionPayload({
  playerId,
  zone,
  instanceId = null,
  coreType = "regular",
  tokenIndex = 0
} = {}) {
  return {
    playerId: playerId || null,
    zone: zone || null,
    instanceId: instanceId || null,
    coreType: coreType === "soul" ? "soul" : "regular",
    tokenIndex
  };
}

export function writeCoreDragPayload(event, payload) {
  if (!event?.dataTransfer || !payload?.zone) return;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData(ARENA_CORE_DRAG_MIME, JSON.stringify(payload));
  event.dataTransfer.setData("text/plain", "bs-core");
}

export function readCoreDragPayload(event) {
  if (!event?.dataTransfer) return null;
  try {
    const raw = event.dataTransfer.getData(ARENA_CORE_DRAG_MIME);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isSameCoreSelection(selection, payload) {
  if (!selection || !payload) return false;
  return (
    selection.playerId === payload.playerId &&
    selection.zone === payload.zone &&
    (selection.instanceId || null) === (payload.instanceId || null) &&
    selection.coreType === payload.coreType &&
    String(selection.tokenIndex) === String(payload.tokenIndex)
  );
}
