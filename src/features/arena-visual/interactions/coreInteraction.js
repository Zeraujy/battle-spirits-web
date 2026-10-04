export const ARENA_VISUAL_CORE_MIME = "application/x-kaihou-arena-core";

export function writeArenaVisualCoreDrag(event, source) {
  if (!event?.dataTransfer || !source) return false;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData(ARENA_VISUAL_CORE_MIME, JSON.stringify(source));
  event.dataTransfer.setData("text/plain", "kaihou-core");
  return true;
}

export function readArenaVisualCoreDrag(event) {
  if (!event?.dataTransfer) return null;
  try {
    const raw = event.dataTransfer.getData(ARENA_VISUAL_CORE_MIME);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
