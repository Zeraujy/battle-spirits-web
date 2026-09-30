import {
  getBraveAttachment,
  getCurrentLevel,
  getDatabaseCard,
  getEffectiveBP,
  getEffectiveColors,
  getEffectiveCost,
  getEffectiveFamilies,
  getEffectiveSymbols
} from "../selectors.js";
import { applyContinuousCollectionModifiers } from "./modifierResolver.js";
import { otherPlayerId } from "../utils.js";

export const TargetOwner = Object.freeze({ SELF: "self", OPPONENT: "opponent", ANY: "any" });
export const TargetState = Object.freeze({ EXHAUSTED: "exhausted", REFRESHED: "refreshed" });
export const TargetZone = Object.freeze({
  FIELD: "field",
  SPIRITS: "spirits",
  NEXUSES: "nexuses",
  OTHER: "other",
  HAND: "hand",
  TRASH: "trash",
  REVEALED: "revealed",
  OPEN_AREA: "openArea",
  BURST: "burst",
  DECK: "deck"
});

function normalizeOwner(value) {
  const owner = String(value || TargetOwner.SELF).toLowerCase();
  if (["opponent", "enemy", "other"].includes(owner)) return TargetOwner.OPPONENT;
  if (["any", "either", "both"].includes(owner)) return TargetOwner.ANY;
  return TargetOwner.SELF;
}

function ownerPlayerIds(match, sourcePlayerId, selector) {
  const owner = normalizeOwner(selector.owner ?? selector.controller ?? selector.player ?? selector.side);
  if (owner === TargetOwner.OPPONENT) return [otherPlayerId(match, sourcePlayerId)].filter(Boolean);
  if (owner === TargetOwner.ANY) return Object.keys(match.players || {});
  return [sourcePlayerId].filter(Boolean);
}

function normalizeZones(selector = {}) {
  const raw = selector.zones ?? (selector.zone != null ? [selector.zone] : [TargetZone.FIELD]);
  const values = Array.isArray(raw) ? raw : [raw];
  const out = new Set();
  for (const value of values.map((item) => String(item || "").toLowerCase())) {
    if (["field", "battlefield", "board"].includes(value)) {
      out.add(TargetZone.SPIRITS);
      out.add(TargetZone.NEXUSES);
      out.add(TargetZone.OTHER);
    } else if (value) out.add(value);
  }
  return [...out];
}

export function normalizeTargetSelector(selector = {}) {
  const state = selector.state ? String(selector.state).toLowerCase() : null;
  return {
    ...selector,
    owner: normalizeOwner(selector.owner ?? selector.controller ?? selector.player ?? selector.side),
    zones: normalizeZones(selector),
    cardTypes: selector.cardTypes ?? (selector.cardType ? [selector.cardType] : null),
    colors: selector.colors ?? (selector.color ? [selector.color] : null),
    families: selector.families ?? (selector.family ? [selector.family] : null),
    symbols: selector.symbols ?? (selector.symbol ? [selector.symbol] : null),
    exhausted: selector.exhausted === true || state === TargetState.EXHAUSTED,
    refreshed: selector.refreshed === true || state === TargetState.REFRESHED
  };
}

function ruleTypes(card, physical, zone) {
  const types = new Set([card?.cardType].filter(Boolean));
  if (card?.cardType === "brave" && zone === TargetZone.OTHER && !physical?.combinedWith) types.add("spirit");
  return types;
}

function numberBetween(actual, min, max) {
  if (min != null && actual < Number(min)) return false;
  if (max != null && actual > Number(max)) return false;
  return true;
}

export function cardKeywords(card, physical = null) {
  const out = new Set();
  const currentLevel = physical ? Number(getCurrentLevel(card, physical)?.level || 0) : null;
  const activeAtLevel = (entry) => {
    const levels = Array.isArray(entry?.levels) ? entry.levels.map(Number) : [];
    return currentLevel == null || !levels.length || levels.includes(currentLevel);
  };
  for (const entry of card?.effects || []) {
    if (!activeAtLevel(entry)) continue;
    const raw = String(entry?.type || entry?.title?.en || entry?.title?.ptBR || "").toLowerCase();
    for (const keyword of ["rush", "confront", "curse", "immortality", "burst", "brave", "heavyarmor", "heavy armor", "strengthening", "brilliance", "holy life", "holylife", "high speed", "highspeed", "ice wall", "icewall", "assault", "radiance", "ultra awaken", "ultraawaken", "transmigration", "charge"]) {
      if (raw.includes(keyword)) out.add(keyword.replace(/\s+/g, ""));
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

function effectSourceColors(match, cardIndex, context) {
  if (context?.sourcePhysical) return getEffectiveColors(match, cardIndex, context.sourcePhysical);
  return context?.sourceCard?.colors || [];
}

function targetHasEffectColorImmunity(match, cardIndex, physical, playerId, context) {
  if (!physical || !context?.sourcePlayerId || context.sourcePlayerId === playerId) return false;
  const sourceType = String(context.sourceCard?.cardType || "").toLowerCase();
  if (!["spirit", "brave", "nexus", "magic"].includes(sourceType)) return false;
  const protectedColors = applyContinuousCollectionModifiers(match, cardIndex, physical, "effectImmunityColors", []);
  if (!protectedColors.length) return false;
  const sourceColors = effectSourceColors(match, cardIndex, context).map((color) => String(color).toLowerCase());
  return protectedColors.some((color) => sourceColors.includes(String(color).toLowerCase()));
}

function targetProperties(match, cardIndex, candidate) {
  const { physical, card, zone } = candidate;
  const isField = [TargetZone.SPIRITS, TargetZone.NEXUSES, TargetZone.OTHER].includes(zone);
  return {
    types: ruleTypes(card, physical, zone),
    colors: isField ? getEffectiveColors(match, cardIndex, physical) : (card?.colors || []),
    families: isField ? getEffectiveFamilies(match, cardIndex, physical) : (card?.families || []),
    symbols: isField ? getEffectiveSymbols(match, cardIndex, physical) : (card?.symbols || []),
    keywords: cardKeywords(card, physical),
    cost: isField ? getEffectiveCost(match, cardIndex, physical) : Number(card?.cost || 0),
    bp: isField ? getEffectiveBP(match, cardIndex, physical) : Number(card?.bp || 0),
    level: isField ? Number(getCurrentLevel(card, physical)?.level || 0) : 0,
    isField,
    braved: isField ? Boolean(getBraveAttachment(match, physical.instanceId)) : false,
    combined: Boolean(physical?.combinedWith),
    cores: Number(physical?.cores?.regular || 0) + (physical?.cores?.soul ? 1 : 0)
  };
}

function propsFamiliesForShare(match, cardIndex, candidate) {
  const { physical, card, zone } = candidate || {};
  if (!physical || !card) return [];
  const isField = [TargetZone.SPIRITS, TargetZone.NEXUSES, TargetZone.OTHER].includes(zone);
  return isField ? getEffectiveFamilies(match, cardIndex, physical) : (card.families || []);
}

export function targetMatchesSelector(match, cardIndex, candidate, rawSelector = {}, context = {}) {
  const selector = normalizeTargetSelector(rawSelector);
  const { physical, card, playerId, zone } = candidate || {};
  if (!physical || !card) return false;
  if (selector.zones?.length && !selector.zones.includes(zone)) return false;
  if (selector.excludeSource && physical.instanceId === context.sourceInstanceId) return false;
  if (selector.instanceId && String(physical.instanceId) !== String(selector.instanceId)) return false;
  if (selector.cardId && String(card.id) !== String(selector.cardId)) return false;
  if (selector.playerId && selector.playerId !== playerId) return false;
  if (selector.instanceIdFromContext) {
    const path = String(selector.instanceIdFromContext).split(".").filter(Boolean);
    let dynamicId = context;
    for (const key of path) dynamicId = dynamicId?.[key];
    if (dynamicId == null && path.length === 1) dynamicId = context?.burstOpportunity?.[path[0]] ?? null;
    if (!dynamicId || String(physical.instanceId) !== String(dynamicId)) return false;
  }
  if (selector.combinedWithSource === true) {
    if (!context.sourceInstanceId || String(physical.combinedWith || "") !== String(context.sourceInstanceId)) return false;
  }

  if (selector.sharesFamilyWithSource === true) {
    const sourceFamilies = context.sourcePhysical
      ? getEffectiveFamilies(match, cardIndex, context.sourcePhysical)
      : (context.sourceCard?.families || []);
    if (!sourceFamilies.some((family) => propsFamiliesForShare(match, cardIndex, candidate).includes(family))) return false;
  }

  if (selector.battleOpponentOfSource === true) {
    const battle = match.battle;
    let expectedId = null;
    if (battle?.attackerPlayerId === context.sourcePlayerId) expectedId = battle.blockerInstanceId || null;
    else if (battle?.defenderPlayerId === context.sourcePlayerId) expectedId = battle.attackerInstanceId || null;
    if (!expectedId || String(physical.instanceId) !== String(expectedId)) return false;
  }

  let names = [card.name, card.nameEN, card.namePT, card.nameJP].filter(Boolean);
  if ([TargetZone.SPIRITS, TargetZone.NEXUSES, TargetZone.OTHER].includes(zone)) {
    names = applyContinuousCollectionModifiers(match, cardIndex, physical, "names", names);
  }
  names = names.map((value) => String(value).toLowerCase());
  const includes = selector.nameIncludes ?? selector.cardNameIncludes ?? null;
  if (includes && !names.some((value) => value.includes(String(includes).toLowerCase()))) return false;

  const props = targetProperties(match, cardIndex, candidate);
  if (selector.cardTypes?.length && !selector.cardTypes.some((type) => props.types.has(type))) return false;
  if (selector.colors?.length && !selector.colors.some((color) => props.colors.includes(color))) return false;
  if (selector.families?.length && !selector.families.some((family) => props.families.includes(family))) return false;
  if (selector.familiesAll?.length && !selector.familiesAll.every((family) => props.families.includes(family))) return false;
  if (selector.symbols?.length && !selector.symbols.some((symbol) => props.symbols.includes(symbol))) return false;
  const keywords = selector.keywords ?? (selector.keyword ? [selector.keyword] : []);
  if (keywords.length && !keywords.some((keyword) => props.keywords.includes(String(keyword).toLowerCase().replace(/\s+/g, "")))) return false;

  if (!numberBetween(props.cost, selector.minimumCost ?? selector.minCost, selector.maximumCost ?? selector.maxCost)) return false;
  let maximumBP = selector.maximumBP ?? selector.maxBP;
  let minimumBP = selector.minimumBP ?? selector.minBP;
  if (selector.maximumBPFromSource && context.sourcePhysical) maximumBP = getEffectiveBP(match, cardIndex, context.sourcePhysical);
  if (selector.minimumBPFromSource && context.sourcePhysical) minimumBP = getEffectiveBP(match, cardIndex, context.sourcePhysical);
  if (props.isField && !numberBetween(props.bp, minimumBP, maximumBP)) return false;
  if (props.isField && !numberBetween(props.level, selector.minimumLevel ?? selector.minLevel, selector.maximumLevel ?? selector.maxLevel)) return false;
  if (selector.exhausted && !physical.exhausted) return false;
  if (selector.refreshed && physical.exhausted) return false;
  if (selector.braved === true && !props.braved) return false;
  if (selector.braved === false && props.braved) return false;
  if (selector.combined === true && !props.combined) return false;
  if (selector.combined === false && props.combined) return false;
  if (selector.notCombinedWithBrave === true && props.braved) return false;
  if (selector.hasSoulCore === true && !physical.cores?.soul) return false;
  if (selector.hasSoulCore === false && physical.cores?.soul) return false;
  if (!numberBetween(props.cores, selector.minimumCores ?? selector.minCores, selector.maximumCores ?? selector.maxCores)) return false;
  if (props.isField && targetHasEffectColorImmunity(match, cardIndex, physical, playerId, context)) return false;
  return true;
}

function pushZone(candidates, match, cardIndex, playerId, zone, cards, selector, context) {
  for (const physical of cards || []) {
    if (!physical) continue;
    if (physical.combinedWith && selector.includeCombined !== true) continue;
    const candidate = { playerId, zone, physical, card: getDatabaseCard(cardIndex, physical) };
    if (targetMatchesSelector(match, cardIndex, candidate, selector, context)) candidates.push(candidate);
  }
}

export function collectTargets(match, cardIndex, rawSelector = {}, context = {}) {
  const selector = normalizeTargetSelector(rawSelector);
  const candidates = [];
  for (const playerId of ownerPlayerIds(match, context.sourcePlayerId, selector)) {
    const player = match.players?.[playerId];
    if (!player) continue;
    for (const zone of selector.zones) {
      if (zone === TargetZone.SPIRITS) pushZone(candidates, match, cardIndex, playerId, zone, player.field?.spirits, selector, context);
      else if (zone === TargetZone.NEXUSES) pushZone(candidates, match, cardIndex, playerId, zone, player.field?.nexuses, selector, context);
      else if (zone === TargetZone.OTHER) pushZone(candidates, match, cardIndex, playerId, zone, player.field?.other, selector, context);
      else if (zone === TargetZone.HAND) pushZone(candidates, match, cardIndex, playerId, zone, player.hand, selector, context);
      else if (zone === TargetZone.TRASH) pushZone(candidates, match, cardIndex, playerId, zone, player.trash, selector, context);
      else if (zone === TargetZone.REVEALED) pushZone(candidates, match, cardIndex, playerId, zone, player.revealed, selector, context);
      else if (zone === TargetZone.OPEN_AREA) pushZone(candidates, match, cardIndex, playerId, zone, player.openArea || [], selector, context);
      else if (zone === TargetZone.BURST) pushZone(candidates, match, cardIndex, playerId, zone, player.burst ? [player.burst] : [], selector, context);
      else if (zone === TargetZone.DECK) pushZone(candidates, match, cardIndex, playerId, zone, player.deck, selector, context);
    }
  }
  let filtered = candidates;
  if (selector.highestCostOnly === true && filtered.length) {
    const highest = Math.max(...filtered.map((candidate) => targetProperties(match, cardIndex, candidate).cost));
    filtered = filtered.filter((candidate) => targetProperties(match, cardIndex, candidate).cost === highest);
  }
  if (selector.lowestCostOnly === true && filtered.length) {
    const lowest = Math.min(...filtered.map((candidate) => targetProperties(match, cardIndex, candidate).cost));
    filtered = filtered.filter((candidate) => targetProperties(match, cardIndex, candidate).cost === lowest);
  }
  return filtered;
}

export function collectFieldTargets(match, cardIndex, selector = {}, context = {}) {
  return collectTargets(match, cardIndex, { ...selector, zones: selector.zones || (selector.zone ? [selector.zone] : [TargetZone.FIELD]) }, context);
}

export function collectTrashTargets(match, cardIndex, selector = {}, context = {}) {
  return collectTargets(match, cardIndex, { ...selector, zones: [TargetZone.TRASH] }, context);
}

function sourceTarget(context) {
  if (!context.sourcePhysical) return null;
  return { playerId: context.sourcePlayerId, zone: context.sourceZone || null, physical: context.sourcePhysical, card: context.sourceCard };
}

export function resolveActionTargets(match, action = {}, cardIndex, context = {}) {
  const directId = action.instanceId ?? action.targetInstanceId;
  if (directId) {
    const targets = collectTargets(match, cardIndex, { owner: "any", zones: ["field", "hand", "trash", "revealed", "openArea", "burst"], instanceId: directId, includeCombined: true }, context);
    return targets.length ? { status: "resolved", targets: [targets[0]] } : { status: "none", targets: [] };
  }

  const rawTarget = action.target ?? action.selector ?? action.targets ?? null;
  const rawTargetString = typeof rawTarget === "string" ? rawTarget.toLowerCase() : "";
  if (["self", "source"].includes(rawTargetString)) {
    const source = sourceTarget(context);
    return source ? { status: "resolved", targets: [source] } : { status: "none", targets: [] };
  }
  if (["battleattacker", "attacker"].includes(rawTargetString)) {
    const instanceId = context.attackerInstanceId || match.battle?.attackerInstanceId || null;
    if (!instanceId) return { status: "none", targets: [] };
    const targets = collectTargets(match, cardIndex, { owner: "any", zones: ["field"], instanceId, includeCombined: true }, context);
    return targets.length ? { status: "resolved", targets: [targets[0]] } : { status: "none", targets: [] };
  }
  if (["combinedhost", "host", "bravehost"].includes(rawTargetString)) {
    const hostInstanceId = context.sourcePhysical?.combinedWith || null;
    if (!hostInstanceId) return { status: "none", targets: [] };
    const targets = collectTargets(match, cardIndex, { owner: "any", zones: ["field"], instanceId: hostInstanceId, includeCombined: true }, context);
    return targets.length ? { status: "resolved", targets: [targets[0]] } : { status: "none", targets: [] };
  }
  if (["eventdestroyer", "destroyer", "effectsource"].includes(rawTargetString)) {
    const instanceId = context.destroyedByInstanceId || context.effectSourceInstanceId || context.eventSourceInstanceId || null;
    if (!instanceId) return { status: "none", targets: [] };
    const targets = collectTargets(match, cardIndex, { owner: "any", zones: ["field"], instanceId, includeCombined: true }, context);
    return targets.length ? { status: "resolved", targets: [targets[0]] } : { status: "none", targets: [] };
  }
  if (["selected", "selection"].includes(rawTargetString)) {
    const selected = context.selectedTargets || [];
    return selected.length ? { status: "resolved", targets: selected } : { status: "manual", targets: [], reason: "Nenhum alvo selecionado está disponível." };
  }
  if (!rawTarget && context.selectionResolved === true) return { status: "resolved", targets: context.selectedTargets || [] };
  if (!rawTarget && context.selectedTargets?.length) return { status: "resolved", targets: context.selectedTargets };
  if (!rawTarget && context.sourcePhysical) {
    const source = sourceTarget(context);
    return source ? { status: "resolved", targets: [source] } : { status: "none", targets: [] };
  }

  const selector = typeof rawTarget === "object" && rawTarget ? rawTarget : (typeof action.selector === "object" && action.selector ? action.selector : {});
  const selectionType = String(action.type || "");
  const effectiveSelector = selectionType === "selectTrashTarget" ? { ...selector, zones: [TargetZone.TRASH] } : selector;
  const candidates = collectTargets(match, cardIndex, effectiveSelector, context);

  if (selectionType === "selectMultipleTargets") {
    let dynamicMaximum = action.maxTargets;
    if (action.countFromSourceBraves === true && context.sourceInstanceId) {
      dynamicMaximum = Object.values(match.players || {}).reduce((total, player) => total + (player.field?.other || []).filter((physical) => physical.combinedWith === context.sourceInstanceId).length, 0);
    }
    if (action.targetCountFrom && typeof action.targetCountFrom === "object") {
      const spec = action.targetCountFrom;
      let total = 0;
      if (spec.selector && typeof spec.selector === "object") {
        total = collectTargets(match, cardIndex, spec.selector, context).length;
      } else {
        const owner = normalizeOwner(spec.owner || "self");
        const ownerIds = owner === TargetOwner.OPPONENT ? [otherPlayerId(match, context.sourcePlayerId)].filter(Boolean)
          : owner === TargetOwner.ANY ? Object.keys(match.players || {}) : [context.sourcePlayerId].filter(Boolean);
        const zone = String(spec.zone || "hand");
        total = ownerIds.reduce((sum, id) => sum + Number(match.players?.[id]?.[zone]?.length || 0), 0);
      }
      const divisor = Math.max(1, Number(spec.divisor || 1));
      dynamicMaximum = Math.floor(total / divisor);
      if (spec.maximum != null) dynamicMaximum = Math.min(dynamicMaximum, Number(spec.maximum));
    }
    const maximum = Math.max(0, Number(dynamicMaximum ?? candidates.length));
    if (action.asManyAsPossible === true) {
      const required = Math.min(maximum, candidates.length);
      if (required === 0) return { status: "resolved", targets: [] };
      if (candidates.length <= maximum) return { status: "resolved", targets: candidates, requested: required, minimum: required };
      return { status: "manual", targets: candidates, requested: maximum, minimum: maximum, reason: `Escolha exatamente ${maximum} alvo(s).` };
    }
    if (!candidates.length && action.allowZero) return { status: "resolved", targets: [] };
    return { status: "manual", targets: candidates, requested: maximum, minimum: action.allowZero ? 0 : Math.max(1, Number(action.minTargets ?? 1)), reason: "Escolha manual de múltiplos alvos necessária." };
  }

  const selectAll = action.all === true || selector.all === true || ["destroyAllMatching", "refreshAllMatching", "exhaustAllMatching", "returnAllMatchingToHand"].includes(selectionType);
  if (selectAll) return { status: "resolved", targets: candidates };

  const normalized = normalizeTargetSelector(selector);
  const minimum = Math.max(0, Number(action.minTargets ?? normalized.minCount ?? normalized.minimum ?? (action.allowZero ? 0 : 1)));
  const requested = Math.max(minimum, Number(action.targetCount ?? action.selectCount ?? action.maxTargets ?? normalized.count ?? normalized.maxCount ?? 1));
  if (candidates.length === 0) return minimum === 0 ? { status: "resolved", targets: [] } : { status: "none", targets: [] };
  if (candidates.length === requested || (requested === 1 && candidates.length === 1)) return { status: "resolved", targets: candidates.slice(0, requested) };
  return { status: "manual", targets: candidates, requested, minimum, reason: `Escolha manual de ${requested} alvo(s) necessária.` };
}
