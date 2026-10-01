export const ARENA_PRESENTATION_CONTRACT_VERSION = 1;

export const ArenaZone = Object.freeze({
  DECK: "deck",
  HAND: "hand",
  TRASH: "trash",
  LIFE: "life",
  RESERVE: "reserve",
  CORE_TRASH: "coreTrash",
  VOID: "void",
  SPIRITS: "spirits",
  NEXUSES: "nexuses",
  OTHER: "other",
  BURST: "burst",
  MIRAGE: "mirage",
  REMOVED: "removed",
  REVEALED: "revealed",
  OPEN_AREA: "openArea"
});

export const ArenaPhase = Object.freeze({
  START: "start",
  CORE: "core",
  DRAW: "draw",
  REFRESH: "refresh",
  MAIN: "main",
  ATTACK: "attack",
  END: "end"
});

export const ArenaBattleStage = Object.freeze({
  ATTACK: "attack",
  FLASH_1: "flash1",
  BLOCK: "block",
  FLASH_2: "flash2",
  ULTIMATE_TRIGGER: "ultimateTrigger",
  RESOLVE: "resolve"
});

export const ArenaActionCategory = Object.freeze({
  PHASE: "phase",
  SETUP: "setup",
  SUMMON: "summon",
  NEXUS: "nexus",
  MAGIC: "magic",
  BRAVE: "brave",
  BATTLE: "battle",
  BURST: "burst",
  EFFECT: "effect",
  DECISION: "decision",
  PENDING: "pending",
  CORE: "core",
  SYSTEM: "system",
  OTHER: "other"
});

export const ArenaConnectionState = Object.freeze({
  LOCAL: "local",
  CONNECTED: "connected",
  RECONNECTING: "reconnecting",
  DISCONNECTED: "disconnected"
});

export const ArenaCardVisualState = Object.freeze({
  IDLE: "idle",
  PLAYABLE: "playable",
  SELECTABLE: "selectable",
  TARGETABLE: "targetable",
  ATTACKABLE: "attackable",
  BLOCKABLE: "blockable",
  DISABLED: "disabled"
});

export const ARENA_ZONE_VALUES = Object.freeze(Object.values(ArenaZone));
export const ARENA_PHASE_VALUES = Object.freeze(Object.values(ArenaPhase));
export const ARENA_BATTLE_STAGE_VALUES = Object.freeze(Object.values(ArenaBattleStage));
export const ARENA_ACTION_CATEGORY_VALUES = Object.freeze(Object.values(ArenaActionCategory));
export const ARENA_CONNECTION_STATE_VALUES = Object.freeze(Object.values(ArenaConnectionState));
export const ARENA_CARD_VISUAL_STATE_VALUES = Object.freeze(Object.values(ArenaCardVisualState));
