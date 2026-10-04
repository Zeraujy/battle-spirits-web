export const ARENA_VISUAL_RESPONSIVE_PROFILES = Object.freeze([
  Object.freeze({ id: "desktop-wide", minWidth: 2200, utilityScale: 1, railScale: 1, cardScale: 1 }),
  Object.freeze({ id: "desktop", minWidth: 1500, utilityScale: 0.96, railScale: 0.96, cardScale: 0.96 }),
  Object.freeze({ id: "laptop", minWidth: 1180, utilityScale: 0.86, railScale: 0.9, cardScale: 0.9 }),
  Object.freeze({ id: "tablet-landscape", minWidth: 900, utilityScale: 0.72, railScale: 0.82, cardScale: 0.82 }),
  Object.freeze({ id: "compact-landscape", minWidth: 0, utilityScale: 0.62, railScale: 0.74, cardScale: 0.74 })
]);

export function resolveArenaVisualResponsiveProfile(width) {
  const safeWidth = Number.isFinite(width) ? Math.max(0, width) : 0;
  return ARENA_VISUAL_RESPONSIVE_PROFILES.find((profile) => safeWidth >= profile.minWidth)
    || ARENA_VISUAL_RESPONSIVE_PROFILES.at(-1);
}
