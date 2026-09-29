import { findPhysicalCard, getBraveAttachment, getCurrentLevel, getDatabaseCard, getEffectiveBP, getEffectiveCost, getFieldSymbols } from "../selectors.js";
import { otherPlayerId } from "../utils.js";
import { cardKeywords, collectTargets } from "./targetingEngine.js";
import { applyContinuousCollectionModifiers } from "./modifierResolver.js";

export const ConditionType = Object.freeze({
  LIFE: "life",
  HAND_SIZE: "handSize",
  RESERVE: "reserve",
  TRASH_CORES: "trashCores",
  FIELD_COUNT: "fieldCount",
  SYMBOL_COUNT: "symbolCount",
  CONTROLS: "controls",
  PHASE: "phase",
  ACTIVE_PLAYER: "activePlayer",
  SOURCE_LEVEL: "sourceLevel",
  SOURCE_COST: "sourceCost",
  SOURCE_STATE: "sourceState",
  SOUL_CORE_LOCATION: "soulCoreLocation",
  BATTLE_STATE: "battleState"
});

function relationPlayerId(match, sourcePlayerId, relation = "self") {
  const value = String(relation || "self").toLowerCase();
  if (["opponent", "enemy", "other"].includes(value)) return otherPlayerId(match, sourcePlayerId);
  return sourcePlayerId;
}

export function compareNumber(actual, condition = {}) {
  const value = Number(actual || 0);
  if (condition.value != null && condition.operator == null && value !== Number(condition.value)) return false;
  if (condition.equals != null && value !== Number(condition.equals)) return false;
  if (condition.min != null && value < Number(condition.min)) return false;
  if (condition.max != null && value > Number(condition.max)) return false;
  if (condition.atLeast != null && value < Number(condition.atLeast)) return false;
  if (condition.atMost != null && value > Number(condition.atMost)) return false;
  const expected = condition.value != null ? Number(condition.value) : null;
  if (expected != null) {
    if (condition.operator === ">" && !(value > expected)) return false;
    if (condition.operator === ">=" && !(value >= expected)) return false;
    if (condition.operator === "<" && !(value < expected)) return false;
    if (condition.operator === "<=" && !(value <= expected)) return false;
    if (["=", "==", "==="].includes(condition.operator) && value !== expected) return false;
  }
  return true;
}

function playerMetric(match, context, condition, metric) {
  const playerId = relationPlayerId(match, context.sourcePlayerId, condition.player ?? condition.owner ?? "self");
  const player = match.players?.[playerId];
  if (!player) return false;
  return compareNumber(metric(player), condition);
}

function sourceLevel(match, context) {
  if (!context.sourceCard || !context.sourcePhysical) return 0;
  return Number(getCurrentLevel(context.sourceCard, context.sourcePhysical)?.level || 0);
}

function eventSourceCard(match, context, cardIndex) {
  const cardId = context.eventSourceCardId || null;
  if (cardId) return cardIndex.get(cardId) || null;
  const instanceId = context.eventSourceInstanceId || null;
  if (!instanceId) return null;
  const candidates = collectTargets(match, cardIndex, { owner: "any", zones: ["field"], instanceId, includeCombined: true }, context);
  return candidates[0]?.card || null;
}

function typedConditionMatches(match, condition, context, cardIndex) {
  const type = String(condition?.type || "").trim();
  if (!type) return null;
  const sourcePlayerId = context.sourcePlayerId;

  if (type === "controlsSymbolColor") {
    const ignored = context.sourcePhysical
      ? applyContinuousCollectionModifiers(match, cardIndex, context.sourcePhysical, "ignoreConditionTypes", [])
          .map((value) => String(value).toLowerCase())
      : [];
    if (ignored.includes("controlssymbolcolor") || ignored.includes("rush") || ignored.includes("chain")) return true;
    const symbols = getFieldSymbols(match, sourcePlayerId, cardIndex);
    return Number(symbols?.[condition.color] || 0) >= Number(condition.minCount ?? 1);
  }
  if (type === "controlsCardType") return collectTargets(match, cardIndex, { owner: condition.player || "self", zone: "field", cardType: condition.cardType }, context).length >= Number(condition.minCount ?? 1);
  if (type === "controlsColor") return collectTargets(match, cardIndex, { owner: condition.player || "self", zone: "field", color: condition.color }, context).length >= Number(condition.minCount ?? 1);
  if (type === "controlsFamily") return collectTargets(match, cardIndex, { owner: condition.player || "self", zone: "field", family: condition.family }, context).length >= Number(condition.minCount ?? 1);
  if (type === "ownLifeAtMost" || type === "lifeAtMost") return playerMetric(match, context, { ...condition, player: condition.player || "self", atMost: condition.value ?? condition.max }, (player) => player.life);
  if (type === "lifeAtLeast") return playerMetric(match, context, { ...condition, atLeast: condition.value ?? condition.min }, (player) => player.life);
  if (type === "handSize") return playerMetric(match, context, condition, (player) => player.hand?.length || 0);
  if (type === "reserve") return playerMetric(match, context, condition, (player) => player.reserve || 0);
  if (type === "trashCores") return playerMetric(match, context, condition, (player) => player.trashCores || 0);
  if (type === "fieldCount") {
    const targets = collectTargets(match, cardIndex, { ...(condition.selector || {}), owner: condition.player ?? condition.selector?.owner ?? "self", zone: condition.selector?.zone || "field" }, context);
    return compareNumber(targets.length, condition);
  }
  if (type === "symbolCount") {
    const playerId = relationPlayerId(match, sourcePlayerId, condition.player || "self");
    const symbols = getFieldSymbols(match, playerId, cardIndex);
    const total = condition.color ? Number(symbols?.[condition.color] || 0) : Object.values(symbols || {}).reduce((sum, count) => sum + Number(count || 0), 0);
    return compareNumber(total, condition);
  }
  if (type === "phase") return condition.value ? match.phase === condition.value : (condition.values || []).includes(match.phase);
  if (type === "activePlayer") {
    const playerId = relationPlayerId(match, sourcePlayerId, condition.player || condition.value || "self");
    return match.activePlayerId === playerId;
  }
  if (type === "sourceLevel") return compareNumber(sourceLevel(match, context), condition);
  if (type === "sourceCost") return compareNumber(context.sourcePhysical ? getEffectiveCost(match, cardIndex, context.sourcePhysical) : Number(context.sourceCard?.cost || 0), condition);
  if (type === "sourceState") {
    if (condition.value === "exhausted") return Boolean(context.sourcePhysical?.exhausted);
    if (condition.value === "refreshed") return !context.sourcePhysical?.exhausted;
    if (condition.value === "braved") return Boolean(context.combinedBrave);
    return false;
  }
  if (type === "sourceCombined") return Boolean(context.sourcePhysical?.combinedWith);
  if (type === "soulCoreLocation") {
    const playerId = relationPlayerId(match, sourcePlayerId, condition.player || "self");
    return match.players?.[playerId]?.soulCore?.zone === condition.zone;
  }
  if (type === "battleState") {
    if (condition.directAttack != null && Boolean(match.battle?.directAttack) !== Boolean(condition.directAttack)) return false;
    if (condition.attackerPlayer === "self" && match.battle?.attackerPlayerId !== sourcePlayerId) return false;
    if (condition.attackerPlayer === "opponent" && match.battle?.attackerPlayerId === sourcePlayerId) return false;
    if (condition.blocked != null && Boolean(match.battle?.blockerInstanceId) !== Boolean(condition.blocked)) return false;
    return Boolean(match.battle);
  }
  if (type === "ultimateTriggerRevealedCardType") {
    const cardId = context.ultimateTrigger?.revealedCardId;
    const revealed = cardId ? cardIndex.get(cardId) : null;
    return Boolean(revealed && String(revealed.cardType || "").toLowerCase() === String(condition.cardType ?? condition.value ?? "").toLowerCase());
  }
  if (type === "ultimateTriggerRevealedColor") {
    const cardId = context.ultimateTrigger?.revealedCardId;
    const revealed = cardId ? cardIndex.get(cardId) : null;
    const expected = String(condition.color ?? condition.value ?? "").toLowerCase();
    return Boolean(revealed && (revealed.colors || []).map((color) => String(color).toLowerCase()).includes(expected));
  }
  if (type === "ultimateTriggerWasHit") return Boolean(context.ultimateTrigger?.originalHit ?? context.ultimateTrigger?.hit);
  if (type === "attackNumber") return compareNumber(Number(context.attackNumber ?? match.temporary?.attackCounts?.[sourcePlayerId] ?? 0), condition);
  if (type === "sourceAttackNumber") return compareNumber(Number(context.sourceAttackNumber ?? match.temporary?.attackCountsByInstance?.[context.sourceInstanceId] ?? 0), condition);
  if (type === "eventSourceCardType") {
    const card = eventSourceCard(match, context, cardIndex);
    const expected = String(condition.cardType ?? condition.value ?? "").toLowerCase();
    return Boolean(card && String(card.cardType || "").toLowerCase() === expected);
  }
  if (type === "eventSourceColor") {
    const card = eventSourceCard(match, context, cardIndex);
    const expected = String(condition.color ?? condition.value ?? "").toLowerCase();
    return Boolean(card && (card.colors || []).map((color) => String(color).toLowerCase()).includes(expected));
  }
  if (type === "eventSourceCost") {
    const card = eventSourceCard(match, context, cardIndex);
    return Boolean(card && compareNumber(Number(card.cost || 0), condition));
  }
  if (type === "eventSourceBP") {
    const instanceId = context.eventSourceInstanceId || null;
    if (!instanceId) return false;
    const candidates = collectTargets(match, cardIndex, { owner: "any", zones: ["field"], instanceId, includeCombined: true }, context);
    const physical = candidates[0]?.physical || null;
    return Boolean(physical && compareNumber(getEffectiveBP(match, cardIndex, physical), condition));
  }
  if (type === "eventSourceFamily") {
    const card = eventSourceCard(match, context, cardIndex);
    const expected = String(condition.family ?? condition.value ?? "").toLowerCase();
    return Boolean(card && (card.families || []).some((family) => String(family).toLowerCase() === expected));
  }
  if (type === "eventSourceIsCombinedHost") {
    const hostId = context.sourcePhysical?.combinedWith || null;
    const eventId = context.eventSourceInstanceId || null;
    return Boolean(hostId && eventId && String(hostId) === String(eventId));
  }
  if (type === "combinedHostLacksEffectType") {
    const hostId = context.sourcePhysical?.combinedWith || null;
    if (!hostId) return false;
    const host = findPhysicalCard(match, hostId);
    const hostCard = host ? getDatabaseCard(cardIndex, host.card) : null;
    if (!hostCard) return false;
    const expected = String(condition.effectType ?? condition.value ?? "").replace(/[\s_-]+/g, "").toLowerCase();
    return !(hostCard.effects || []).some((entry) => String(entry?.type || "").replace(/[\s_-]+/g, "").toLowerCase() === expected);
  }
  if (type === "eventCause") return String(context.cause || "") === String(condition.value ?? condition.cause ?? "");
  if (type === "eventDestroyedByOpponent") {
    const destroyedBy = context.destroyedByPlayerId || null;
    return Boolean(destroyedBy && sourcePlayerId && destroyedBy !== sourcePlayerId);
  }
  if (type === "eventDestroyedBySelf") {
    const destroyedBy = context.destroyedByPlayerId || null;
    return Boolean(destroyedBy && sourcePlayerId && destroyedBy === sourcePlayerId);
  }
  if (type === "eventDestroyedByCardType") {
    return String(context.destroyedByCardType || "").toLowerCase() === String(condition.cardType ?? condition.value ?? "").toLowerCase();
  }
  if (type === "eventDestroyerKeyword") {
    const instanceId = context.destroyedByInstanceId || null;
    if (!instanceId) return false;
    const candidates = collectTargets(match, cardIndex, { owner: "any", zones: ["field"], instanceId, includeCombined: true }, context);
    const candidate = candidates[0];
    if (!candidate) return false;
    const expected = String(condition.keyword ?? condition.value ?? "").toLowerCase().replace(/\s+/g, "");
    return cardKeywords(candidate.card, candidate.physical).includes(expected);
  }
  if (type === "battleAttackerCardType") {
    const instanceId = context.attackerInstanceId || match.battle?.attackerInstanceId || null;
    if (!instanceId) return false;
    const candidates = collectTargets(match, cardIndex, { owner: "any", zones: ["field"], instanceId, includeCombined: true }, context);
    const card = candidates[0]?.card || null;
    return String(card?.cardType || "").toLowerCase() === String(condition.cardType ?? condition.value ?? "").toLowerCase();
  }
  if (type === "battleAttackerBP") {
    const instanceId = context.attackerInstanceId || match.battle?.attackerInstanceId || null;
    if (!instanceId) return false;
    const candidates = collectTargets(match, cardIndex, { owner: "any", zones: ["field"], instanceId, includeCombined: true }, context);
    const physical = candidates[0]?.physical || null;
    if (!physical) return false;
    const bp = Number(context.attackerBP ?? physical.temporaryBP ?? 0) || Number(getCurrentLevel(candidates[0].card, physical)?.bp || 0);
    return compareNumber(bp, condition);
  }
  if (type === "selectedTargetBP") {
    const selected = Array.isArray(context.selectedTargets) ? context.selectedTargets[0] : null;
    const instanceId = selected?.physical?.instanceId || selected?.instanceId || null;
    if (!instanceId) return false;
    const targets = collectTargets(match, cardIndex, { owner: "any", zones: ["field"], instanceId, includeCombined: true }, context);
    const physical = targets[0]?.physical || null;
    return Boolean(physical && compareNumber(getEffectiveBP(match, cardIndex, physical), condition));
  }
  if (type === "battleRestriction") {
    const key = String(condition.key ?? condition.value ?? "");
    if (!key) return false;
    const expected = Object.prototype.hasOwnProperty.call(condition, "equals") ? condition.equals : true;
    return match.battle?.restrictions?.[key] === expected;
  }
  if (type === "battleBlockerCardType") {
    const instanceId = context.blockerInstanceId || match.battle?.blockerInstanceId || null;
    if (!instanceId) return false;
    const targets = collectTargets(match, cardIndex, { owner: "any", zones: ["field"], instanceId, includeCombined: true }, context);
    const card = targets[0]?.card || null;
    const expected = condition.cardTypes || (condition.cardType ? [condition.cardType] : [condition.value]);
    return Boolean(card && expected.filter(Boolean).map((value) => String(value).toLowerCase()).includes(String(card.cardType || "").toLowerCase()));
  }
  if (type === "eventMovedCardFamily") {
    const expected = String(condition.family ?? condition.value ?? "").toLowerCase();
    return (context.movedCardFamilies || []).map((value) => String(value).toLowerCase()).includes(expected);
  }
  if (type === "eventMoveDestination") {
    const values = (condition.values || condition.destinations || [condition.value ?? condition.destination]).filter(Boolean).map((value) => String(value));
    return values.includes(String(context.moveDestination || ""));
  }
  if (type === "eventMovedFromZone") {
    const values = (condition.values || [condition.value ?? condition.zone]).filter(Boolean).map((value) => String(value));
    return values.includes(String(context.moveFromZone || ""));
  }
  if (type === "eventMovedByOpponent") {
    return Boolean(context.movedByPlayerId && sourcePlayerId && context.movedByPlayerId !== sourcePlayerId);
  }
  if (type === "eventMovedByCardType") {
    const expected = condition.cardTypes || (condition.cardType ? [condition.cardType] : [condition.value]);
    return expected.filter(Boolean).map((value) => String(value).toLowerCase()).includes(String(context.movedByCardType || "").toLowerCase());
  }
  if (type === "eventZeroedBySource") return Boolean(context.zeroedByInstanceId && context.zeroedByInstanceId === context.sourceInstanceId);
  if (type === "eventFirstTimeThisTurn") return Boolean(context.firstTimeThisTurn);
  if (type === "eventZeroedIsBattleOpponent") {
    const zeroedPlayerId = context.zeroedPlayerId || null;
    const instanceId = context.zeroedInstanceId || null;
    if (!zeroedPlayerId || !instanceId || zeroedPlayerId === sourcePlayerId) return false;
    const battle = match.battle;
    return Boolean(battle && [battle.attackerInstanceId, battle.blockerInstanceId].filter(Boolean).includes(instanceId));
  }
  if (type === "battleSourceRole") {
    const expected = String(condition.role ?? condition.value ?? "").toLowerCase();
    if (expected === "attacker") return Boolean(context.sourceInstanceId && context.sourceInstanceId === context.attackerInstanceId);
    if (expected === "blocker") return Boolean(context.sourceInstanceId && context.sourceInstanceId === context.blockerInstanceId);
    return false;
  }
  if (type === "battleOnlyOpponentSpiritDestroyed") {
    const destroyed = Array.isArray(context.destroyed) ? context.destroyed : [];
    return Boolean(
      sourcePlayerId &&
      String(context.cause || "") === "bpComparison" &&
      destroyed.length === 1 &&
      destroyed[0]?.playerId !== sourcePlayerId &&
      String(destroyed[0]?.cardType || "").toLowerCase() === "spirit"
    );
  }
  return false;
}

export function conditionMatchesEffect(match, condition, context = {}, cardIndex) {
  if (!condition) return true;
  if (Array.isArray(condition)) return condition.every((item) => conditionMatchesEffect(match, item, context, cardIndex));
  if (typeof condition !== "object") return Boolean(condition);

  const typed = typedConditionMatches(match, condition, context, cardIndex);
  if (typed != null) return typed;
  if (Array.isArray(condition.all) && !condition.all.every((item) => conditionMatchesEffect(match, item, context, cardIndex))) return false;
  if (Array.isArray(condition.and) && !condition.and.every((item) => conditionMatchesEffect(match, item, context, cardIndex))) return false;
  if (Array.isArray(condition.any) && !condition.any.some((item) => conditionMatchesEffect(match, item, context, cardIndex))) return false;
  if (Array.isArray(condition.or) && !condition.or.some((item) => conditionMatchesEffect(match, item, context, cardIndex))) return false;
  if (condition.not && conditionMatchesEffect(match, condition.not, context, cardIndex)) return false;

  const sourcePlayerId = context.sourcePlayerId;
  const sourcePhysical = context.sourcePhysical;
  const sourceCard = context.sourceCard;
  if (condition.phase && match.phase !== condition.phase) return false;
  if (condition.phases && !condition.phases.includes(match.phase)) return false;
  if (condition.ownerTurn === true && match.activePlayerId !== sourcePlayerId) return false;
  if (condition.opponentTurn === true && match.activePlayerId === sourcePlayerId) return false;
  if (condition.activePlayer === "self" && match.activePlayerId !== sourcePlayerId) return false;
  if (condition.activePlayer === "opponent" && match.activePlayerId === sourcePlayerId) return false;

  const level = sourceCard && sourcePhysical ? Number(getCurrentLevel(sourceCard, sourcePhysical)?.level || 0) : 0;
  if (condition.level != null && level !== Number(condition.level)) return false;
  if (!compareNumber(level, { min: condition.minimumLevel ?? condition.minLevel, max: condition.maximumLevel ?? condition.maxLevel })) return false;
  if (condition.combinedWithBrave === true && !context.combinedBrave) return false;
  if (condition.combinedWithBrave === false && context.combinedBrave) return false;
  if (condition.exhausted === true && !sourcePhysical?.exhausted) return false;
  if (condition.refreshed === true && sourcePhysical?.exhausted) return false;

  if (condition.life != null) {
    const player = match.players?.[sourcePlayerId];
    if (!player) return false;
    if (typeof condition.life === "number" && Number(player.life) !== Number(condition.life)) return false;
    if (typeof condition.life === "object" && !compareNumber(Number(player.life || 0), condition.life)) return false;
  }

  const controls = condition.controls || condition.control;
  if (controls) {
    const count = collectTargets(match, cardIndex, { ...controls, owner: controls.owner || "self", zone: controls.zone || "field" }, context).length;
    if (count < Math.max(0, Number(controls.minCount ?? controls.count ?? 1))) return false;
  }
  return true;
}

export function entryConditionsMatch(match, entry, context = {}, cardIndex) {
  if (!entry) return false;
  const sourceCard = context.sourceCard;
  const sourcePhysical = context.sourcePhysical;
  if (Array.isArray(entry.levels) && entry.levels.length) {
    const level = sourceCard && sourcePhysical ? getCurrentLevel(sourceCard, sourcePhysical)?.level ?? 0 : 0;
    if (!entry.levels.map(Number).includes(Number(level))) return false;
  }
  if (entry.level != null) {
    const level = sourceCard && sourcePhysical ? getCurrentLevel(sourceCard, sourcePhysical)?.level ?? 0 : 0;
    if (Number(level) !== Number(entry.level)) return false;
  }
  const isCombined = Boolean(sourcePhysical?.combinedWith || context.isCombined || context.combinedHostInstanceId || context.combinedBrave);
  if (entry.requiresCombined === true && !isCombined) return false;
  if (entry.requiresCombined === false && isCombined) return false;
  const condition = entry.condition ?? entry.conditions ?? entry.requirements ?? null;
  return conditionMatchesEffect(match, condition, context, cardIndex);
}
