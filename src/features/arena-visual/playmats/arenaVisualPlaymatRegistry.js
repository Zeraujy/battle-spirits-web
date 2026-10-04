export const DEFAULT_ARENA_VISUAL_PLAYMAT_ID = "default";

const arenaVisualPlaymats = Object.freeze([
  Object.freeze({
    id: DEFAULT_ARENA_VISUAL_PLAYMAT_ID,
    name: "Default Playmat",
    image: "/images/arena/wallpaper_arena_default.png",
    available: true
  })
]);

export function getArenaVisualPlaymats() {
  return arenaVisualPlaymats;
}

export function resolveArenaVisualPlaymat(playmatId) {
  return arenaVisualPlaymats.find((playmat) => playmat.id === playmatId && playmat.available)
    || arenaVisualPlaymats[0];
}
