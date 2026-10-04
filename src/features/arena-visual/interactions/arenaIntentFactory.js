export const ARENA_VISUAL_INTENTS = Object.freeze({
  SELECT_CARD: "SELECT_CARD",
  CORE_CLICK: "CORE_CLICK",
  MOVE_CORE: "MOVE_CORE",
  CARD_CLICK: "CARD_CLICK",
  UTILITY_ACTION: "UTILITY_ACTION",
  PLAY_HAND_CARD: "PLAY_HAND_CARD",
  SET_BURST_CARD: "SET_BURST_CARD",
  COMBINE_BRAVE: "COMBINE_BRAVE",
  DECLARE_ATTACK: "DECLARE_ATTACK",
  DECLARE_BLOCK: "DECLARE_BLOCK"
});

export function createArenaVisualIntent(type, payload = {}, meta = {}) {
  if (!type || typeof type !== "string") {
    throw new TypeError("Arena Visual intent type must be a non-empty string.");
  }

  return Object.freeze({
    type,
    payload: payload && typeof payload === "object" ? payload : {},
    meta: {
      input: meta.input || "ui",
      timestamp: Number.isFinite(meta.timestamp) ? meta.timestamp : null
    }
  });
}

export function selectCardIntent(instanceId, meta) {
  return createArenaVisualIntent(ARENA_VISUAL_INTENTS.SELECT_CARD, { instanceId }, meta);
}

export function coreClickIntent(source, meta) {
  return createArenaVisualIntent(ARENA_VISUAL_INTENTS.CORE_CLICK, { source }, meta);
}

export function moveCoreIntent(source, target, meta) {
  return createArenaVisualIntent(ARENA_VISUAL_INTENTS.MOVE_CORE, { source, target }, meta);
}

export function playHandCardIntent(instanceId, meta) {
  return createArenaVisualIntent(ARENA_VISUAL_INTENTS.PLAY_HAND_CARD, { instanceId }, meta);
}

export function setBurstCardIntent(instanceId, meta) {
  return createArenaVisualIntent(ARENA_VISUAL_INTENTS.SET_BURST_CARD, { instanceId }, meta);
}

export function combineBraveIntent(braveInstanceId, hostInstanceId, options = {}, meta) {
  return createArenaVisualIntent(ARENA_VISUAL_INTENTS.COMBINE_BRAVE, { braveInstanceId, hostInstanceId, options }, meta);
}

export function declareAttackIntent(instanceId, meta) {
  return createArenaVisualIntent(ARENA_VISUAL_INTENTS.DECLARE_ATTACK, { instanceId }, meta);
}

export function declareBlockIntent(instanceId, meta) {
  return createArenaVisualIntent(ARENA_VISUAL_INTENTS.DECLARE_BLOCK, { instanceId }, meta);
}
