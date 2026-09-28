import { getCurrentLevel, getDatabaseCard, getEffectiveCost, getFieldSymbols } from "../selectors.js";
import { otherPlayerId } from "../utils.js";
import { collectTargets } from "./targetingEngine.js";

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

function typedConditionMatches(match, condition, context, cardIndex) {
  const type = String(condition?.type || "").trim();
  if (!type) return null;
  const sourcePlayerId = context.sourcePlayerId;

  if (type === "controlsSymbolColor") {
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
  if (type === "eventSourceCardType") {
    const cardId = context.eventSourceCardId || context.sourceCard?.id;
    const card = cardId ? cardIndex.get(cardId) : null;
    const expected = String(condition.cardType ?? condition.value ?? "").toLowerCase();
    return Boolean(card && String(card.cardType || "").toLowerCase() === expected);
  }
  if (type === "eventCause") return String(context.cause || "") === String(condition.value ?? condition.cause ?? "");
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
