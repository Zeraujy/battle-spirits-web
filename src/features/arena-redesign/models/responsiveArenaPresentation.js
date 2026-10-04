export const ARENA_VIEWPORT_PROFILES = Object.freeze({
  DESKTOP_WIDE: "desktop-wide",
  DESKTOP: "desktop",
  LAPTOP: "laptop",
  TABLET_LANDSCAPE: "tablet-landscape",
  MOBILE_LANDSCAPE: "mobile-landscape"
});

export function getArenaViewportProfile({ width = 1920, height = 1080 } = {}) {
  const safeWidth = Number.isFinite(Number(width)) ? Number(width) : 1920;
  const safeHeight = Number.isFinite(Number(height)) ? Number(height) : 1080;

  if (safeWidth >= 2200 && safeHeight >= 1100) return ARENA_VIEWPORT_PROFILES.DESKTOP_WIDE;
  if (safeWidth >= 1500 && safeHeight >= 850) return ARENA_VIEWPORT_PROFILES.DESKTOP;
  if (safeWidth >= 1180 && safeHeight >= 650) return ARENA_VIEWPORT_PROFILES.LAPTOP;
  if (safeWidth >= 900 && safeHeight >= 560) return ARENA_VIEWPORT_PROFILES.TABLET_LANDSCAPE;
  return ARENA_VIEWPORT_PROFILES.MOBILE_LANDSCAPE;
}

export function getArenaInputProfile({ coarsePointer = false, hoverCapable = true } = {}) {
  if (coarsePointer) return "touch";
  return hoverCapable ? "pointer" : "hybrid";
}
