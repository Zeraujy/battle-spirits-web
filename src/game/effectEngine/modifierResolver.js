import { FIELD_ZONES } from "../constants.js";
import { uid } from "../utils.js";
import {
  EffectDuration,
  createDurationSpec,
  durationExpiresOn,
  durationIsActive,
  normalizeEffectDuration
} from "./durationSystem.js";

function legacyDuration(value) {
  const normalized = normalizeEffectDuration(value, null);
  if (normalized === EffectDuration.THIS_BATTLE || normalized === EffectDuration.THIS_ATTACK) return "battle";
  if (normalized === EffectDuration.THIS_TURN || normalized === EffectDuration.UNTIL_END_STEP) return "turn";
  return normalized || null;
}

export function addBPModifier(physical, amount, duration, metadata = {}) {
  const normalized = legacyDuration(duration);
  if (!normalized || normalized === EffectDuration.PERMANENT) {
    return { ...physical, temporaryBP: Number(physical.temporaryBP || 0) + Number(amount || 0) };
  }
  return {
    ...physical,
    effectModifiers: [
      ...(physical.effectModifiers || []),
      {
        type: "bp",
        amount: Number(amount || 0),
        duration: normalized,
        battleId: metadata.battleId || null,
        sourceEffectId: metadata.sourceEffectId || null
      }
    ]
  };
}

export function getEffectBPBonus(physical) {
  return (physical?.effectModifiers || [])
    .filter((modifier) => modifier?.type === "bp")
    .reduce((total, modifier) => total + Number(modifier.amount || 0), 0);
}

function sourceExists(match, instanceId) {
  if (!instanceId) return false;
  for (const player of Object.values(match.players || {})) {
    for (const zone of FIELD_ZONES) {
      if ((player.field?.[zone] || []).some((card) => card.instanceId === instanceId)) return true;
    }
  }
  return false;
}

function targetOwner(match, physical) {
  for (const [playerId, player] of Object.entries(match.players || {})) {
    for (const zone of FIELD_ZONES) {
      if ((player.field?.[zone] || []).some((card) => card.instanceId === physical?.instanceId)) return playerId;
    }
  }
  return null;
}

function dbCard(cardIndex, physical) {
  return cardIndex?.get?.(physical?.cardId) || null;
}

function selectorMatches(match, cardIndex, physical, modifier) {
  const selector = modifier.selector || {};
  const card = dbCard(cardIndex, physical);
  if (!card || !physical) return false;

  const ownerId = targetOwner(match, physical);
  if (selector.playerId && selector.playerId !== ownerId) return false;
  if (selector.owner === "self" && modifier.controllerId && ownerId !== modifier.controllerId) return false;
  if (selector.owner === "opponent" && modifier.controllerId && ownerId === modifier.controllerId) return false;
  if (selector.excludeSource && physical.instanceId === modifier.sourceInstanceId) return false;
  if (selector.instanceId && String(selector.instanceId) !== String(physical.instanceId)) return false;
  if (selector.cardId && String(selector.cardId) !== String(card.id)) return false;

  const cardTypes = selector.cardTypes || (selector.cardType ? [selector.cardType] : []);
  if (cardTypes.length && !cardTypes.includes(card.cardType)) return false;
  const colors = selector.colors || (selector.color ? [selector.color] : []);
  if (colors.length && !colors.some((value) => (card.colors || []).includes(value))) return false;
  const families = selector.families || (selector.family ? [selector.family] : []);
  if (families.length && !families.some((value) => (card.families || []).includes(value))) return false;
  const symbols = selector.symbols || (selector.symbol ? [selector.symbol] : []);
  if (symbols.length && !symbols.some((value) => (card.symbols || []).includes(value))) return false;
  const cost = Number(card.cost || 0);
  if (selector.minimumCost != null && cost < Number(selector.minimumCost)) return false;
  if (selector.maximumCost != null && cost > Number(selector.maximumCost)) return false;
  if (selector.exhausted === true && !physical.exhausted) return false;
  if (selector.refreshed === true && physical.exhausted) return false;
  return true;
}

function activeRegistryItems(match, cardIndex, physical, property = null) {
  return (match.modifierRegistry?.items || []).filter((modifier) => {
    if (property && modifier.property !== property) return false;
    if (!durationIsActive(match, modifier.duration, {
      sourceExists: (instanceId) => sourceExists(match, instanceId),
      conditionActive: modifier.conditionActive
    })) return false;
    return selectorMatches(match, cardIndex, physical, modifier);
  });
}

export function registerContinuousModifier(match, descriptor = {}, context = {}) {
  const property = String(descriptor.property || descriptor.stat || "").trim();
  if (!property) return { match, modifier: null };
  const duration = createDurationSpec(descriptor.duration || EffectDuration.WHILE_SOURCE_EXISTS, match, {
    battleId: match.battle?.id || null,
    sourceInstanceId: context.sourceInstanceId || descriptor.sourceInstanceId || null
  });
  let selector = descriptor.selector || descriptor.target || { owner: "self" };
  if (typeof selector === "string") {
    const normalizedTarget = selector.toLowerCase();
    selector = ["self", "source"].includes(normalizedTarget)
      ? { instanceId: context.sourceInstanceId || descriptor.sourceInstanceId || null }
      : { owner: normalizedTarget };
  }
  const modifier = {
    id: descriptor.id || uid("modifier"),
    type: "continuous",
    property,
    operation: descriptor.operation || (Array.isArray(descriptor.value) ? "add" : "add"),
    value: descriptor.value ?? descriptor.amount ?? 0,
    selector,
    controllerId: context.sourcePlayerId || descriptor.controllerId || null,
    sourceInstanceId: context.sourceInstanceId || descriptor.sourceInstanceId || null,
    sourceEffectId: context.effectId || descriptor.sourceEffectId || null,
    condition: descriptor.condition || null,
    conditionActive: descriptor.conditionActive,
    duration
  };
  return {
    match: {
      ...match,
      modifierRegistry: {
        ...(match.modifierRegistry || {}),
        nextSequence: Number(match.modifierRegistry?.nextSequence || 0) + 1,
        items: [...(match.modifierRegistry?.items || []), modifier]
      }
    },
    modifier
  };
}

export function removeContinuousModifiers(match, predicate = () => false) {
  const current = match.modifierRegistry?.items || [];
  const items = current.filter((modifier) => !predicate(modifier));
  if (items.length === current.length) return match;
  return { ...match, modifierRegistry: { ...(match.modifierRegistry || {}), items } };
}

export function pruneContinuousModifiers(match) {
  return removeContinuousModifiers(match, (modifier) => !durationIsActive(match, modifier.duration, {
    sourceExists: (instanceId) => sourceExists(match, instanceId),
    conditionActive: modifier.conditionActive
  }));
}

export function expireContinuousModifiers(match, reason) {
  return removeContinuousModifiers(match, (modifier) => durationExpiresOn(modifier.duration, reason));
}

export function reconcileContinuousModifierConditions(match, evaluator) {
  if (typeof evaluator !== "function") return pruneContinuousModifiers(match);
  const items = (match.modifierRegistry?.items || []).map((modifier) => {
    if (normalizeEffectDuration(modifier.duration?.type || modifier.duration) !== EffectDuration.WHILE_CONDITION_TRUE) return modifier;
    return { ...modifier, conditionActive: Boolean(evaluator(modifier)) };
  });
  return pruneContinuousModifiers({
    ...match,
    modifierRegistry: { ...(match.modifierRegistry || {}), items }
  });
}

export function getContinuousNumericModifier(match, cardIndex, physical, property) {
  let value = 0;
  for (const modifier of activeRegistryItems(match, cardIndex, physical, property)) {
    const amount = Number(modifier.value ?? modifier.amount ?? 0);
    if (modifier.operation === "set") value = amount;
    else if (modifier.operation === "subtract") value -= Math.abs(amount);
    else value += amount;
  }
  return value;
}

export function applyContinuousCollectionModifiers(match, cardIndex, physical, property, base = []) {
  let values = [...base];
  for (const modifier of activeRegistryItems(match, cardIndex, physical, property)) {
    const incoming = Array.isArray(modifier.value) ? modifier.value : [modifier.value];
    if (modifier.operation === "set") values = incoming.filter(Boolean);
    else if (modifier.operation === "remove") values = values.filter((item) => !incoming.includes(item));
    else values.push(...incoming.filter(Boolean));
  }
  if (property === "symbols") return values.filter(Boolean);
  return [...new Set(values.filter(Boolean))];
}

export function clearEffectModifiers(match, duration, metadata = {}) {
  const normalized = legacyDuration(duration);
  if (!normalized) return match;
  const players = {};
  for (const [playerId, player] of Object.entries(match.players || {})) {
    const field = { ...player.field };
    for (const zone of FIELD_ZONES) {
      field[zone] = (player.field?.[zone] || []).map((physical) => ({
        ...physical,
        effectModifiers: (physical.effectModifiers || []).filter((modifier) => {
          if (modifier?.duration !== normalized) return true;
          if (normalized === "battle" && metadata.battleId && modifier.battleId && modifier.battleId !== metadata.battleId) return true;
          return false;
        })
      }));
    }
    players[playerId] = { ...player, field };
  }
  let next = { ...match, players };
  if (normalized === "battle") next = expireContinuousModifiers(next, "battleEnd");
  if (normalized === "turn") next = expireContinuousModifiers(next, "turnEnd");
  return pruneContinuousModifiers(next);
}
