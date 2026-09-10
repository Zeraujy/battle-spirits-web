import { fieldCards, getCurrentLevel, getDatabaseCard, getFieldSymbols } from "../selectors.js";

function valueIn(value, list) {
  return Array.isArray(list) && list.includes(value);
}

function controlsMatching(match, sourcePlayerId, cardIndex, condition = {}) {
  const player = match.players?.[sourcePlayerId];
  if (!player) return false;
  const cards = fieldCards(player)
    .filter((physical) => !physical.combinedWith)
    .map((physical) => ({ physical, card: getDatabaseCard(cardIndex, physical) }));

  const minimum = Math.max(0, Number(condition.minCount ?? condition.count ?? 1));
  const matches = cards.filter(({ physical, card }) => {
    if (!card) return false;
    const ruleTypes = new Set([card.cardType]);
    if (card.cardType === "brave" && !physical.combinedWith) ruleTypes.add("spirit");
    if (condition.cardType && !ruleTypes.has(condition.cardType)) return false;
    if (condition.cardTypes && !condition.cardTypes.some((type) => ruleTypes.has(type))) return false;
    if (condition.color && !(card.colors || []).includes(condition.color)) return false;
    if (condition.colors && !condition.colors.some((color) => (card.colors || []).includes(color))) return false;
    if (condition.family && !(card.families || []).includes(condition.family)) return false;
    if (condition.families && !condition.families.some((family) => (card.families || []).includes(family))) return false;
    if (condition.minimumCost != null && Number(card.cost || 0) < Number(condition.minimumCost)) return false;
    if (condition.maximumCost != null && Number(card.cost || 0) > Number(condition.maximumCost)) return false;
    if (condition.minCost != null && Number(card.cost || 0) < Number(condition.minCost)) return false;
    if (condition.maxCost != null && Number(card.cost || 0) > Number(condition.maxCost)) return false;
    if (condition.exhausted === true && !physical.exhausted) return false;
    if (condition.refreshed === true && physical.exhausted) return false;
    return true;
  });

  return matches.length >= minimum;
}


function typedConditionMatches(match, condition, context, cardIndex) {
  const type = String(condition?.type || "").trim();
  if (!type) return null;
  const sourcePlayerId = context.sourcePlayerId;
  if (type === "controlsSymbolColor") {
    const color = condition.color;
    const symbols = getFieldSymbols(match, sourcePlayerId, cardIndex);
    return Number(symbols?.[color] || 0) > 0;
  }
  if (type === "controlsCardType") {
    return controlsMatching(match, sourcePlayerId, cardIndex, { cardType: condition.cardType, minCount: condition.minCount ?? 1 });
  }
  if (type === "ownLifeAtMost") {
    return Number(match.players?.[sourcePlayerId]?.life ?? 0) <= Number(condition.value ?? condition.max ?? 0);
  }
  if (type === "ultimateTriggerRevealedCardType") {
    const cardId = context.ultimateTrigger?.revealedCardId;
    const revealed = cardId ? cardIndex.get(cardId) : null;
    const expected = String(condition.cardType ?? condition.value ?? "").toLowerCase();
    return Boolean(revealed && String(revealed.cardType || "").toLowerCase() === expected);
  }
  if (type === "ultimateTriggerRevealedColor") {
    const cardId = context.ultimateTrigger?.revealedCardId;
    const revealed = cardId ? cardIndex.get(cardId) : null;
    const expected = String(condition.color ?? condition.value ?? "").toLowerCase();
    return Boolean(revealed && (revealed.colors || []).map((color) => String(color).toLowerCase()).includes(expected));
  }
  if (type === "ultimateTriggerWasHit") {
    return Boolean(context.ultimateTrigger?.originalHit ?? context.ultimateTrigger?.hit);
  }
  return false;
}
function compareNumber(actual, condition = {}) {
  if (condition.equals != null && actual !== Number(condition.equals)) return false;
  if (condition.min != null && actual < Number(condition.min)) return false;
  if (condition.max != null && actual > Number(condition.max)) return false;
  if (condition.atLeast != null && actual < Number(condition.atLeast)) return false;
  if (condition.atMost != null && actual > Number(condition.atMost)) return false;
  return true;
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

  const currentLevel = sourceCard && sourcePhysical ? getCurrentLevel(sourceCard, sourcePhysical)?.level ?? 0 : 0;
  if (condition.level != null && currentLevel !== Number(condition.level)) return false;
  if (condition.minimumLevel != null && currentLevel < Number(condition.minimumLevel)) return false;
  if (condition.minLevel != null && currentLevel < Number(condition.minLevel)) return false;
  if (condition.maximumLevel != null && currentLevel > Number(condition.maximumLevel)) return false;
  if (condition.maxLevel != null && currentLevel > Number(condition.maxLevel)) return false;

  if (condition.combinedWithBrave === true && !context.combinedBrave) return false;
  if (condition.combinedWithBrave === false && context.combinedBrave) return false;
  if (condition.exhausted === true && !sourcePhysical?.exhausted) return false;
  if (condition.refreshed === true && sourcePhysical?.exhausted) return false;

  if (condition.life != null) {
    const player = match.players?.[sourcePlayerId];
    if (!player) return false;
    if (typeof condition.life === "number" && player.life !== Number(condition.life)) return false;
    if (typeof condition.life === "object" && !compareNumber(Number(player.life || 0), condition.life)) return false;
  }

  const controls = condition.controls || condition.control;
  if (controls && !controlsMatching(match, sourcePlayerId, cardIndex, controls)) return false;

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
