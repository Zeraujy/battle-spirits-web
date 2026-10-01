import {
  ArenaActionCategory,
  ArenaCardVisualState,
  ArenaConnectionState,
  ArenaZone,
  createArenaAvailableActionContract,
  createArenaCardContract,
  createArenaPlayerContract,
  createArenaPresentationContract,
  createArenaTimingContract,
  createArenaZoneContract
} from "../../shared/contracts/arena/index.js";
import { getLegalActions } from "../../game/legalActions.js";
import {
  getCurrentLevel,
  getDatabaseCard,
  getEffectiveBP,
  getEffectiveSymbols
} from "../../game/selectors.js";
import { getCardName, resolveCardImage } from "../../game/cardAdapter.js";

const ACTION_CATEGORY_BY_TYPE = Object.freeze({
  ADVANCE_PHASE: ArenaActionCategory.PHASE,
  MULLIGAN: ArenaActionCategory.SETUP,
  SUMMON: ArenaActionCategory.SUMMON,
  DEPLOY_NEXUS: ArenaActionCategory.NEXUS,
  USE_MAGIC: ArenaActionCategory.MAGIC,
  USE_HIGH_SPEED: ArenaActionCategory.MAGIC,
  SET_BURST: ArenaActionCategory.BURST,
  ACTIVATE_BURST: ArenaActionCategory.BURST,
  PASS_BURST: ArenaActionCategory.BURST,
  SET_MIRAGE: ArenaActionCategory.SYSTEM,
  DECLARE_ATTACK: ArenaActionCategory.BATTLE,
  DECLARE_BLOCK: ArenaActionCategory.BATTLE,
  DECLINE_BLOCK: ArenaActionCategory.BATTLE,
  PASS_FLASH: ArenaActionCategory.BATTLE,
  RESOLVE_BATTLE: ArenaActionCategory.BATTLE,
  RESOLVE_ULTIMATE_TRIGGER: ArenaActionCategory.BATTLE,
  PASS_TRIGGER_COUNTER: ArenaActionCategory.BATTLE,
  USE_TRIGGER_COUNTER: ArenaActionCategory.BATTLE,
  RESOLVE_EFFECT_DECISION: ArenaActionCategory.DECISION,
  CONFIRM_MANUAL_PLAY: ArenaActionCategory.PENDING,
  CANCEL_MANUAL_PLAY: ArenaActionCategory.PENDING,
  CONFIRM_MANUAL_COST: ArenaActionCategory.PENDING,
  CANCEL_MANUAL_COST: ArenaActionCategory.PENDING,
  MOVE_CORE: ArenaActionCategory.CORE,
  ACTIVATE_FIELD_FLASH: ArenaActionCategory.EFFECT,
  COMBINE_BRAVE: ArenaActionCategory.BRAVE,
  EXCHANGE_BRAVE: ArenaActionCategory.BRAVE,
  SEPARATE_BRAVE: ArenaActionCategory.BRAVE
});

function otherPlayer(match, playerId) {
  return Object.keys(match?.players || {}).find((id) => id !== playerId) || null;
}

function resolveActorId(match) {
  if (!match) return null;
  if (match.pendingEffectDecision?.playerId) return match.pendingEffectDecision.playerId;
  if (match.burstOpportunity?.playerId) return match.burstOpportunity.playerId;
  if (match.battle?.stage === "ultimateTrigger") {
    const trigger = match.battle.ultimateTrigger;
    if (trigger?.status === "counterWindow") return trigger.counterPlayerId || trigger.controllerPlayerId || match.activePlayerId;
  }
  if (match.battle?.flash?.priorityPlayerId) return match.battle.flash.priorityPlayerId;
  if (match.battle?.stage === "block") return match.battle.defenderPlayerId || match.activePlayerId;
  return match.activePlayerId || null;
}

function cardVisualState(instanceId, legalActions, match) {
  if (!instanceId) return ArenaCardVisualState.IDLE;
  const types = legalActions
    .filter((entry) => entry?.action?.instanceId === instanceId || entry?.action?.braveInstanceId === instanceId || entry?.action?.hostInstanceId === instanceId)
    .map((entry) => entry.action?.type);
  if (types.includes("DECLARE_ATTACK")) return ArenaCardVisualState.ATTACKABLE;
  if (types.includes("DECLARE_BLOCK")) return ArenaCardVisualState.BLOCKABLE;
  if (types.some((type) => ["SUMMON", "DEPLOY_NEXUS", "USE_MAGIC", "USE_HIGH_SPEED", "SET_BURST", "SET_MIRAGE", "ACTIVATE_FIELD_FLASH"].includes(type))) {
    return ArenaCardVisualState.PLAYABLE;
  }
  const candidates = match?.pendingEffectDecision?.candidates || [];
  if (candidates.some((candidate) => candidate?.instanceId === instanceId)) return ArenaCardVisualState.TARGETABLE;
  return ArenaCardVisualState.IDLE;
}

function buildCard(match, physical, cardIndex, zone, legalActions) {
  if (!physical) return null;
  const db = getDatabaseCard(cardIndex, physical);
  const currentLevel = db ? getCurrentLevel(db, physical) : null;
  const bp = db ? getEffectiveBP(match, cardIndex, physical) : 0;
  const symbols = db ? getEffectiveSymbols(match, cardIndex, physical) : [];
  return createArenaCardContract({
    instanceId: physical.instanceId,
    cardId: physical.cardId || physical.id || db?.id,
    cardType: db?.cardType || physical.cardType,
    zone,
    controllerId: physical.controllerId,
    ownerId: physical.ownerId,
    exhausted: physical.exhausted,
    level: Number(currentLevel?.level || 0),
    bp,
    cores: physical.cores,
    combinedWith: physical.combinedWith,
    combinedHostId: physical.combinedHostId,
    visualState: cardVisualState(physical.instanceId, legalActions, match),
    name: db ? getCardName(db) : physical.cardId || physical.id,
    image: db ? resolveCardImage(db) : null,
    colors: db?.colors || [],
    symbols: symbols || db?.symbols || [],
    cost: db?.cost,
    reduction: db?.reduction,
    flags: {
      pendingDestruction: Boolean(physical.pendingDestruction),
      isAttacker: match?.battle?.attackerInstanceId === physical.instanceId,
      isBlocker: match?.battle?.blockerInstanceId === physical.instanceId
    }
  });
}

function zoneCards(match, playerId, zone, cardIndex, legalActions) {
  const player = match.players?.[playerId] || {};
  switch (zone) {
    case ArenaZone.HAND: return (player.hand || []).map((card) => buildCard(match, card, cardIndex, zone, legalActions));
    case ArenaZone.TRASH: return (player.trash || []).map((card) => buildCard(match, card, cardIndex, zone, legalActions));
    case ArenaZone.REMOVED: return (player.removed || []).map((card) => buildCard(match, card, cardIndex, zone, legalActions));
    case ArenaZone.REVEALED: return (player.revealed || []).map((card) => buildCard(match, card, cardIndex, zone, legalActions));
    case ArenaZone.OPEN_AREA: return (player.openArea || []).map((card) => buildCard(match, card, cardIndex, zone, legalActions));
    case ArenaZone.SPIRITS: return (player.field?.spirits || []).map((card) => buildCard(match, card, cardIndex, zone, legalActions));
    case ArenaZone.NEXUSES: return (player.field?.nexuses || []).map((card) => buildCard(match, card, cardIndex, zone, legalActions));
    case ArenaZone.OTHER: return (player.field?.other || []).map((card) => buildCard(match, card, cardIndex, zone, legalActions));
    case ArenaZone.BURST: return player.burst ? [buildCard(match, player.burst, cardIndex, zone, legalActions)] : [];
    case ArenaZone.MIRAGE: return player.mirage ? [buildCard(match, player.mirage, cardIndex, zone, legalActions)] : [];
    default: return [];
  }
}

function buildPlayer(match, playerId, actorId, connectionState) {
  const player = match.players?.[playerId] || {};
  return createArenaPlayerContract({
    id: playerId,
    name: player.name,
    username: player.username,
    avatar: player.avatar || player.avatarUrl,
    playerColor: player.color || player.playerColor,
    life: player.life,
    reserve: player.reserve,
    trashCores: player.trashCores,
    soulCore: player.soulCore,
    deckCount: player.deck?.length || 0,
    handCount: player.hand?.length || 0,
    trashCount: player.trash?.length || 0,
    removedCount: player.removed?.length || 0,
    isActivePlayer: match.activePlayerId === playerId,
    hasPriority: actorId === playerId,
    connectionState
  });
}

function categoryFor(entry) {
  if (Object.values(ArenaActionCategory).includes(entry?.category)) return entry.category;
  return ACTION_CATEGORY_BY_TYPE[entry?.action?.type] || ArenaActionCategory.OTHER;
}

function primaryAction(type) {
  return ["PASS_FLASH", "PASS_BURST", "DECLINE_BLOCK", "ADVANCE_PHASE", "RESOLVE_BATTLE", "RESOLVE_EFFECT_DECISION"].includes(type);
}

/**
 * ArenaViewModel v2 — v5.2.0 Phase 3.
 * Converts authoritative/local match state into a UI-safe presentation model.
 * It may query the rules layer, but React presentation must not reproduce those rules.
 */
export function buildArenaViewModel({
  match,
  cardIndex,
  viewerPlayerId,
  opponentPlayerId = null,
  connectionState = ArenaConnectionState.LOCAL,
  opponentConnectionState = connectionState
} = {}) {
  if (!match?.players || !viewerPlayerId) return null;

  const opponentId = opponentPlayerId || otherPlayer(match, viewerPlayerId);
  if (!opponentId) return null;
  const actorId = resolveActorId(match);
  const legalActions = getLegalActions(match, actorId, cardIndex || {});
  const availableActions = legalActions.map((entry, index) => createArenaAvailableActionContract({
    id: `${entry.action?.type || "ACTION"}:${entry.action?.instanceId || entry.action?.decisionId || index}`,
    label: entry.label,
    category: categoryFor(entry),
    primary: primaryAction(entry.action?.type),
    action: entry.action
  }));

  const zones = [];
  const visibleZones = [
    ArenaZone.HAND, ArenaZone.TRASH, ArenaZone.REMOVED, ArenaZone.REVEALED,
    ArenaZone.OPEN_AREA, ArenaZone.SPIRITS, ArenaZone.NEXUSES, ArenaZone.OTHER,
    ArenaZone.BURST, ArenaZone.MIRAGE
  ];
  for (const playerId of [viewerPlayerId, opponentId]) {
    const player = match.players[playerId] || {};
    for (const zone of visibleZones) {
      const isOpponentHand = playerId === opponentId && zone === ArenaZone.HAND;
      const cards = isOpponentHand ? [] : zoneCards(match, playerId, zone, cardIndex || {}, legalActions).filter(Boolean);
      let count = cards.length;
      if (zone === ArenaZone.HAND) count = player.hand?.length || 0;
      if (zone === ArenaZone.BURST) count = player.burst ? 1 : 0;
      if (zone === ArenaZone.MIRAGE) count = player.mirage ? 1 : 0;
      zones.push(createArenaZoneContract({ playerId, zone, hidden: isOpponentHand || (playerId === opponentId && zone === ArenaZone.BURST), count, cards }));
    }
    zones.push(createArenaZoneContract({ playerId, zone: ArenaZone.DECK, hidden: true, count: player.deck?.length || 0, cards: [] }));
  }

  return createArenaPresentationContract({
    matchId: match.id || match.matchId,
    viewerPlayerId,
    opponentPlayerId: opponentId,
    player: buildPlayer(match, viewerPlayerId, actorId, connectionState),
    opponent: buildPlayer(match, opponentId, actorId, opponentConnectionState),
    timing: createArenaTimingContract({
      turnNumber: match.turnNumber,
      activePlayerId: match.activePlayerId,
      phase: match.phase,
      battleStage: match.battle?.stage || null,
      priorityPlayerId: actorId,
      consecutivePasses: match.battle?.flash?.consecutivePasses || 0,
      isBattleActive: Boolean(match.battle)
    }),
    zones,
    availableActions,
    winnerId: match.winnerId,
    winnerReason: match.winnerReason
  });
}

export function getArenaZone(viewModel, playerId, zone) {
  return viewModel?.zones?.find((entry) => entry.playerId === playerId && entry.zone === zone) || null;
}

export function getArenaCard(viewModel, instanceId) {
  if (!instanceId) return null;
  for (const zone of viewModel?.zones || []) {
    const found = zone.cards?.find((card) => card.instanceId === instanceId);
    if (found) return found;
  }
  return null;
}
