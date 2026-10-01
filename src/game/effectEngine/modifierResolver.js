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
    for (const zone of ["hand", "trash", "revealed", "deck"]) {
      if ((player?.[zone] || []).some((card) => card.instanceId === physical?.instanceId)) return playerId;
    }
    if (player?.burst?.instanceId === physical?.instanceId) return playerId;
  }
  return null;
}

function dbCard(cardIndex, physical) {
  return cardIndex?.get?.(physical?.cardId) || null;
}

function activeProtectionItems(match, cardIndex, physical) {
  const items = match.modifierRegistry?.items || [];
  return items.filter((modifier) => {
    if (modifier.property !== "effectImmunityColors") return false;
    if (!durationIsActive(match, modifier.duration, {
      sourceExists: (instanceId) => sourceExists(match, instanceId),
      conditionActive: modifier.conditionActive
    })) return false;
    return selectorMatches(match, cardIndex, physical, modifier, true);
  });
}

function modifierBlockedByEffectImmunity(match, cardIndex, physical, modifier) {
  if (!modifier || modifier.property === "effectImmunityColors") return false;
  const targetOwnerId = targetOwner(match, physical);
  if (!targetOwnerId || !modifier.controllerId || modifier.controllerId === targetOwnerId) return false;
  const source = modifier.sourceInstanceId ? (() => {
    for (const player of Object.values(match.players || {})) {
      for (const zone of FIELD_ZONES) {
        const found = (player.field?.[zone] || []).find((card) => card.instanceId === modifier.sourceInstanceId);
        if (found) return found;
      }
    }
    return null;
  })() : null;
  const sourceCard = dbCard(cardIndex, source);
  const sourceType = String(sourceCard?.cardType || "").toLowerCase();
  if (!["spirit", "brave", "nexus", "magic"].includes(sourceType)) return false;
  const sourceColors = (sourceCard?.colors || []).map((color) => String(color).toLowerCase());
  if (!sourceColors.length) return false;
  const protectedColors = activeProtectionItems(match, cardIndex, physical)
    .flatMap((entry) => Array.isArray(entry.value) ? entry.value : [entry.value])
    .filter(Boolean)
    .map((color) => String(color).toLowerCase());
  return protectedColors.some((color) => sourceColors.includes(color));
}


function activeKeywords(card, physical) {
  const totalCores = Number(physical?.cores?.regular || 0) + (physical?.cores?.soul ? 1 : 0);
  const levels = [...(card?.levels || [])].sort((a, b) => Number(a.cores || 0) - Number(b.cores || 0));
  let currentLevel = 0;
  for (const level of levels) if (totalCores >= Number(level.cores || 0)) currentLevel = Number(level.level || currentLevel);
  const out = new Set();
  const activeAtLevel = (entry) => {
    const required = Array.isArray(entry?.levels) ? entry.levels.map(Number) : [];
    return !required.length || required.includes(currentLevel);
  };
  for (const entry of card?.effects || []) {
    if (!activeAtLevel(entry)) continue;
    const raw = String(entry?.type || entry?.title?.en || entry?.title?.ptBR || "").toLowerCase();
    for (const keyword of ["rush", "confront", "curse", "immortality", "burst", "brave", "heavyarmor", "heavy armor", "strengthening", "brilliance", "holy life", "holylife", "high speed", "highspeed", "ice wall", "icewall", "assault", "radiance", "ultra awaken", "ultraawaken", "transmigration", "charge"]) {
      if (raw.includes(keyword)) out.add(keyword === "charge" ? "chargered" : keyword.replace(/\s+/g, ""));
    }
  }
  for (const entry of card?.abilities || []) {
    if (!activeAtLevel(entry)) continue;
    if (entry?.requiresCombined === true && !physical?.combinedWith) continue;
    const keywords = entry?.modifiers?.keywords || entry?.keywords || [];
    for (const keyword of Array.isArray(keywords) ? keywords : [keywords]) if (keyword) out.add(String(keyword).toLowerCase().replace(/\s+/g, ""));
  }
  return [...out];
}
function selectorMatches(match, cardIndex, physical, modifier, skipProtection = false) {
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
  if (selector.hasEffectText === true) {
    const text = String(card?.effectText?.en || card?.effectText?.ptBR || card?.textEN || card?.textPT || "").trim();
    const structured = (card?.effects || []).length > 0 || (card?.abilities || []).length > 0;
    if (!text && !structured) return false;
  }
  if (selector.combinedHostOfSource === true) {
    const source = modifier.sourceInstanceId ? (() => {
      for (const player of Object.values(match.players || {})) {
        const found = (player.field?.other || []).find((candidate) => candidate.instanceId === modifier.sourceInstanceId);
        if (found) return found;
      }
      return null;
    })() : null;
    if (!source?.combinedWith || String(source.combinedWith) !== String(physical.instanceId)) return false;
  }

  const cardTypes = selector.cardTypes || (selector.cardType ? [selector.cardType] : []);
  if (cardTypes.length && !cardTypes.includes(card.cardType)) return false;
  const colors = selector.colors || (selector.color ? [selector.color] : []);
  if (colors.length && !colors.some((value) => (card.colors || []).includes(value))) return false;
  const families = selector.families || (selector.family ? [selector.family] : []);
  if (families.length && !families.some((value) => (card.families || []).includes(value))) return false;
  const familiesAll = selector.familiesAll || [];
  if (familiesAll.length && !familiesAll.every((value) => (card.families || []).includes(value))) return false;
  const familiesAny = selector.familiesAny || [];
  if (familiesAny.length && !familiesAny.some((value) => (card.families || []).includes(value))) return false;
  const symbols = selector.symbols || (selector.symbol ? [selector.symbol] : []);
  if (symbols.length && !symbols.some((value) => (card.symbols || []).includes(value))) return false;
  const keywords = selector.keywords || (selector.keyword ? [selector.keyword] : []);
  if (keywords.length) {
    const active = activeKeywords(card, physical);
    if (!keywords.some((value) => active.includes(String(value).toLowerCase().replace(/\s+/g, "")))) return false;
  }
  const cost = Number(card.cost || 0);
  if (Array.isArray(selector.costs) && selector.costs.length && !selector.costs.map(Number).includes(cost)) return false;
  if (selector.minimumCost != null && cost < Number(selector.minimumCost)) return false;
  if (selector.maximumCost != null && cost > Number(selector.maximumCost)) return false;
  if (selector.braved === true && !physical.combinedWith) return false;
  if (selector.braved === false && physical.combinedWith) return false;
  if (selector.exhausted === true && !physical.exhausted) return false;
  if (selector.refreshed === true && physical.exhausted) return false;
  if (!skipProtection && modifierBlockedByEffectImmunity(match, cardIndex, physical, modifier)) return false;
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
  let next = removeContinuousModifiers(match, (modifier) => !durationIsActive(match, modifier.duration, {
    sourceExists: (instanceId) => sourceExists(match, instanceId),
    conditionActive: modifier.conditionActive
  }));
  const players = {};
  for (const [playerId, player] of Object.entries(next.players || {})) {
    const field = { ...player.field };
    for (const zone of FIELD_ZONES) {
      field[zone] = (player.field?.[zone] || []).map((physical) => ({
        ...physical,
        effectModifiers: (physical.effectModifiers || []).filter((modifier) => {
          if (modifier?.duration !== "whileSourceExists") return true;
          return !modifier.sourceInstanceId || sourceExists(next, modifier.sourceInstanceId);
        })
      }));
    }
    players[playerId] = { ...player, field };
  }
  return { ...next, players };
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

export function getContinuousPlayerNumericModifier(match, playerId, property) {
  let value = 0;
  for (const modifier of match.modifierRegistry?.items || []) {
    if (modifier.property !== property) continue;
    if (!durationIsActive(match, modifier.duration, {
      sourceExists: (instanceId) => sourceExists(match, instanceId),
      conditionActive: modifier.conditionActive
    })) continue;
    const owner = modifier.selector?.owner || null;
    if (owner === "self" && modifier.controllerId && modifier.controllerId !== playerId) continue;
    if (owner === "opponent" && modifier.controllerId && modifier.controllerId === playerId) continue;
    if (!owner && modifier.controllerId && modifier.controllerId !== playerId) continue;
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

export function getContinuousCardNumericModifier(match, card, playerId, property) {
  let value = 0;
  for (const modifier of match.modifierRegistry?.items || []) {
    if (modifier.property !== property) continue;
    if (!durationIsActive(match, modifier.duration, {
      sourceExists: (instanceId) => sourceExists(match, instanceId),
      conditionActive: modifier.conditionActive
    })) continue;
    const selector = modifier.selector || {};
    if (selector.owner === "self" && modifier.controllerId && playerId !== modifier.controllerId) continue;
    if (selector.owner === "opponent" && modifier.controllerId && playerId === modifier.controllerId) continue;
    if (selector.cardId && String(selector.cardId) !== String(card?.id)) continue;
    const cardTypes = selector.cardTypes || (selector.cardType ? [selector.cardType] : []);
    if (cardTypes.length && !cardTypes.includes(card?.cardType)) continue;
    const colors = selector.colors || (selector.color ? [selector.color] : []);
    if (colors.length && !colors.some((color) => (card?.colors || []).includes(color))) continue;
    const families = selector.families || (selector.family ? [selector.family] : []);
    if (families.length && !families.some((family) => (card?.families || []).includes(family))) continue;
    const familiesAll = selector.familiesAll || [];
    if (familiesAll.length && !familiesAll.every((family) => (card?.families || []).includes(family))) continue;
    const symbols = selector.symbols || (selector.symbol ? [selector.symbol] : []);
    if (symbols.length && !symbols.some((symbol) => (card?.symbols || []).includes(symbol))) continue;
    const baseCost = Number(card?.cost || 0);
    if (selector.minimumCost != null && baseCost < Number(selector.minimumCost)) continue;
    if (selector.maximumCost != null && baseCost > Number(selector.maximumCost)) continue;
    const amount = Number(modifier.value ?? modifier.amount ?? 0);
    if (modifier.operation === "set") value = amount;
    else if (modifier.operation === "subtract") value -= Math.abs(amount);
    else value += amount;
  }
  return value;
}

export function getContinuousCardCollectionModifier(match, card, playerId, property, base = []) {
  let values = [...base];
  for (const modifier of match.modifierRegistry?.items || []) {
    if (modifier.property !== property) continue;
    if (!durationIsActive(match, modifier.duration, {
      sourceExists: (instanceId) => sourceExists(match, instanceId),
      conditionActive: modifier.conditionActive
    })) continue;
    const selector = modifier.selector || {};
    if (selector.owner === "self" && modifier.controllerId && playerId !== modifier.controllerId) continue;
    if (selector.owner === "opponent" && modifier.controllerId && playerId === modifier.controllerId) continue;
    if (selector.cardId && String(selector.cardId) !== String(card?.id)) continue;
    const cardTypes = selector.cardTypes || (selector.cardType ? [selector.cardType] : []);
    if (cardTypes.length && !cardTypes.includes(card?.cardType)) continue;
    const colors = selector.colors || (selector.color ? [selector.color] : []);
    if (colors.length && !colors.some((color) => (card?.colors || []).includes(color))) continue;
    const families = selector.families || (selector.family ? [selector.family] : []);
    if (families.length && !families.some((family) => (card?.families || []).includes(family))) continue;
    const familiesAll = selector.familiesAll || [];
    if (familiesAll.length && !familiesAll.every((family) => (card?.families || []).includes(family))) continue;
    const incoming = Array.isArray(modifier.value) ? modifier.value : [modifier.value];
    if (modifier.operation === "set") values = incoming.filter(Boolean);
    else if (modifier.operation === "remove") values = values.filter((item) => !incoming.includes(item));
    else values.push(...incoming.filter(Boolean));
  }
  return values;
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
