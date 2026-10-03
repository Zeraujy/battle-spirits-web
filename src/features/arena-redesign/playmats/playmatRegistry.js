import { DEFAULT_ARENA_PLAYMAT_ID } from "../constants.js";

const PLAYMATS = Object.freeze([
  Object.freeze({
    id: DEFAULT_ARENA_PLAYMAT_ID,
    name: "Default Playmat",
    assetUrl: "/images/arena/wallpaper_arena_default.png",
    source: "built-in",
    ownership: "default",
    enabled: true
  })
]);

export function getArenaPlaymatCatalog() {
  return PLAYMATS;
}

export function getArenaPlaymatById(playmatId) {
  return PLAYMATS.find((playmat) => playmat.id === playmatId) || null;
}

export function getDefaultArenaPlaymat() {
  return getArenaPlaymatById(DEFAULT_ARENA_PLAYMAT_ID);
}
