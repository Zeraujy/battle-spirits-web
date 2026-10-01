import {
  ARENA_ACTION_CATEGORY_VALUES,
  ARENA_BATTLE_STAGE_VALUES,
  ARENA_CARD_VISUAL_STATE_VALUES,
  ARENA_CONNECTION_STATE_VALUES,
  ARENA_PHASE_VALUES,
  ARENA_ZONE_VALUES,
  ArenaActionCategory,
  ArenaCardVisualState,
  ArenaConnectionState
} from "./constants.js";

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function nullableString(value) {
  return value == null || value === "" ? null : String(value);
}

function cloneSerializable(value) {
  if (value == null) return value;
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch {
      // Fall through to JSON clone for plain action payloads.
    }
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

/**
 * UI-safe identity for a card instance. This contract intentionally contains
 * presentation facts only; it does not expose reducer helpers or rule methods.
 */
export function createArenaCardContract(input = {}) {
  return {
    instanceId: nullableString(input.instanceId),
    cardId: nullableString(input.cardId),
    cardType: nullableString(input.cardType) || "unknown",
    zone: ARENA_ZONE_VALUES.includes(input.zone) ? input.zone : null,
    controllerId: nullableString(input.controllerId),
    ownerId: nullableString(input.ownerId),
    exhausted: Boolean(input.exhausted),
    level: Math.max(0, finiteNumber(input.level)),
    bp: Math.max(0, finiteNumber(input.bp)),
    cores: {
      regular: Math.max(0, finiteNumber(input.cores?.regular)),
      soul: Boolean(input.cores?.soul)
    },
    combinedWith: nullableString(input.combinedWith),
    combinedHostId: nullableString(input.combinedHostId),
    visualState: ARENA_CARD_VISUAL_STATE_VALUES.includes(input.visualState)
      ? input.visualState
      : ArenaCardVisualState.IDLE,
    flags: input.flags && typeof input.flags === "object" ? { ...input.flags } : {}
  };
}

/**
 * Stable presentation shape for one player. Deck/hand contents are represented
 * by counts here; visible card collections belong to the zone contracts.
 */
export function createArenaPlayerContract(input = {}) {
  return {
    id: nullableString(input.id),
    name: nullableString(input.name) || "Player",
    username: nullableString(input.username),
    avatar: nullableString(input.avatar),
    playerColor: nullableString(input.playerColor),
    life: Math.max(0, finiteNumber(input.life)),
    reserve: Math.max(0, finiteNumber(input.reserve)),
    trashCores: Math.max(0, finiteNumber(input.trashCores)),
    soulCore: {
      zone: nullableString(input.soulCore?.zone),
      instanceId: nullableString(input.soulCore?.instanceId)
    },
    deckCount: Math.max(0, finiteNumber(input.deckCount)),
    handCount: Math.max(0, finiteNumber(input.handCount)),
    trashCount: Math.max(0, finiteNumber(input.trashCount)),
    removedCount: Math.max(0, finiteNumber(input.removedCount)),
    isActivePlayer: Boolean(input.isActivePlayer),
    hasPriority: Boolean(input.hasPriority),
    connectionState: ARENA_CONNECTION_STATE_VALUES.includes(input.connectionState)
      ? input.connectionState
      : ArenaConnectionState.LOCAL
  };
}

export function createArenaZoneContract(input = {}) {
  const zone = ARENA_ZONE_VALUES.includes(input.zone) ? input.zone : null;
  return {
    id: nullableString(input.id) || [nullableString(input.playerId), zone].filter(Boolean).join(":") || "zone",
    playerId: nullableString(input.playerId),
    zone,
    hidden: Boolean(input.hidden),
    count: Math.max(0, finiteNumber(input.count, Array.isArray(input.cards) ? input.cards.length : 0)),
    cards: Array.isArray(input.cards) ? input.cards.map(createArenaCardContract) : []
  };
}

export function createArenaTimingContract(input = {}) {
  const phase = ARENA_PHASE_VALUES.includes(input.phase) ? input.phase : null;
  const battleStage = ARENA_BATTLE_STAGE_VALUES.includes(input.battleStage) ? input.battleStage : null;
  return {
    turnNumber: Math.max(1, finiteNumber(input.turnNumber, 1)),
    activePlayerId: nullableString(input.activePlayerId),
    phase,
    battleStage,
    priorityPlayerId: nullableString(input.priorityPlayerId),
    consecutivePasses: Math.max(0, finiteNumber(input.consecutivePasses)),
    isBattleActive: Boolean(input.isBattleActive || battleStage)
  };
}

/**
 * Wraps an authoritative/local legal action for UI presentation. The UI may
 * render and dispatch this descriptor, but must not infer legality from it.
 */
export function createArenaAvailableActionContract(input = {}) {
  const source = input.action && typeof input.action === "object" ? input.action : input;
  const action = cloneSerializable(source) || {};
  const type = nullableString(action.type);
  return {
    id: nullableString(input.id) || [type, nullableString(action.instanceId), nullableString(action.decisionId)].filter(Boolean).join(":"),
    type,
    label: nullableString(input.label) || type || "Action",
    category: ARENA_ACTION_CATEGORY_VALUES.includes(input.category)
      ? input.category
      : ArenaActionCategory.OTHER,
    primary: Boolean(input.primary),
    disabled: Boolean(input.disabled),
    reason: nullableString(input.reason),
    action
  };
}

export function createArenaPresentationContract(input = {}) {
  return {
    version: 1,
    matchId: nullableString(input.matchId),
    viewerPlayerId: nullableString(input.viewerPlayerId),
    opponentPlayerId: nullableString(input.opponentPlayerId),
    player: createArenaPlayerContract(input.player),
    opponent: createArenaPlayerContract(input.opponent),
    timing: createArenaTimingContract(input.timing),
    zones: Array.isArray(input.zones) ? input.zones.map(createArenaZoneContract) : [],
    availableActions: Array.isArray(input.availableActions)
      ? input.availableActions.map(createArenaAvailableActionContract)
      : [],
    winnerId: nullableString(input.winnerId),
    winnerReason: nullableString(input.winnerReason)
  };
}
