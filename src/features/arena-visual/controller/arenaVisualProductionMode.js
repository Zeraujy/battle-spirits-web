export const ARENA_RENDER_MODES = Object.freeze({
  VISUAL: "visual",
  LEGACY: "legacy"
});

export function resolveArenaRenderMode(search = "") {
  const params = new URLSearchParams(search || "");
  const requested = String(params.get("arena") || "").trim().toLowerCase();
  if (requested === ARENA_RENDER_MODES.LEGACY) return ARENA_RENDER_MODES.LEGACY;
  return ARENA_RENDER_MODES.VISUAL;
}

export function isArenaVisualDefault(search = "") {
  return resolveArenaRenderMode(search) === ARENA_RENDER_MODES.VISUAL;
}
