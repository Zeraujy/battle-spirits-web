import { findPhysicalCard, getCurrentLevel, getDatabaseCard, getEffectiveBP, getEffectiveFamilies, getEffectiveSymbols, getFieldSymbols } from "../selectors.js";
import { addFieldCard, removeFieldCard, removeHandCard, updateFieldCard } from "../zones.js";
import { otherPlayerId } from "../utils.js";
import { calculateReduction, autoBuildPayment } from "../cost.js";
import { checkDepletion, payCoreCost } from "../cores.js";
import { conditionMatchesEffect } from "./conditionResolver.js";
import {
  addBPModifier,
  pruneContinuousModifiers,
  registerContinuousModifier,
  removeContinuousModifiers,
  getContinuousNumericModifier,
  getContinuousPlayerNumericModifier
} from "./modifierResolver.js";
import { canonicalActionType, supportsCoreActionType } from "./coreActionLibrary.js";
import { collectTargets, collectTrashTargets, resolveActionTargets } from "./targetResolver.js";
import { preventReplacementEvent, replaceCurrentEvent } from "./replacementState.js";
import { BurstEvent, openBurstOpportunityForEvent } from "./burstEngine.js";

export function supportsActionType(type) {
  return supportsCoreActionType(type);
}

function valueFromContext(context, path, fallback = null) {
  if (!path) return fallback;
  const value = String(path).split(".").reduce((current, key) => current == null ? undefined : current[key], context);
  return value == null ? fallback : value;
}

function queueDeferredCanonicalEvent(match, event) {
  if (!event) return match;
  // Zone moves to Trash are already represented by destruction/discard canonical events.
  // Avoid double-dispatching observers for the same physical move.
  if (event.event === "cardMoved" && String(event.context?.moveDestination || "") === "trash") return match;
  return {
    ...match,
    deferredCanonicalEvents: [...(match.deferredCanonicalEvents || []), event]
  };
}

function activeTurnProtection(match, playerId, type) {
  const protection = match.temporary?.turnProtections?.[playerId]?.[type] || null;
  if (!protection) return null;
  if (protection.sourceInstanceId && !findPhysicalCard(match, protection.sourceInstanceId)) return null;
  return protection;
}

function capUltimateEffectLifeLoss(match, playerId, requested, context) {
  const sourceType = String(context.sourceCard?.cardType || '').toLowerCase();
  if (sourceType !== 'ultimate') return { requested, type: null, used: 0, cap: null };
  const type = 'limitUltimateEffectLifeDamage';
  const protection = activeTurnProtection(match, playerId, type);
  if (!protection) return { requested, type: null, used: 0, cap: null };
  const cap = Math.max(0, Number(protection.maxDamage ?? 1));
  const used = Math.max(0, Number(match.temporary?.turnProtectionUsage?.[playerId]?.[type] || 0));
  return { requested: Math.min(requested, Math.max(0, cap - used)), type, used, cap };
}

function recordTurnProtectionUsage(match, playerId, type, amount) {
  if (!type || !amount) return match;
  const current = Number(match.temporary?.turnProtectionUsage?.[playerId]?.[type] || 0);
  return {
    ...match,
    temporary: {
      ...(match.temporary || {}),
      turnProtectionUsage: {
        ...(match.temporary?.turnProtectionUsage || {}),
        [playerId]: {
          ...(match.temporary?.turnProtectionUsage?.[playerId] || {}),
          [type]: current + Number(amount || 0)
        }
      }
    }
  };
}

function asActionArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function fieldModifierTotal(match, cardIndex, playerId, property) {
  const player = match.players?.[playerId];
  if (!player) return 0;
  const cards = [...(player.field?.spirits || []), ...(player.field?.nexuses || []), ...(player.field?.other || [])];
  return cards.reduce((total, physical) => total + Number(getContinuousNumericModifier(match, cardIndex, physical, property) || 0), 0);
}

function cardMatchesSimpleSelector(card, selector = {}) {
  if (!card) return false;
  const types = selector.cardTypes || (selector.cardType ? [selector.cardType] : []);
  const colors = selector.colors || (selector.color ? [selector.color] : []);
  if (types.length && !types.map((v) => String(v).toLowerCase()).includes(String(card.cardType || "").toLowerCase())) return false;
  if (colors.length && !colors.some((v) => (card.colors || []).map((c) => String(c).toLowerCase()).includes(String(v).toLowerCase()))) return false;
  const cost = Number(card.cost || 0);
  if (selector.minimumCost != null && cost < Number(selector.minimumCost)) return false;
  if (selector.maximumCost != null && cost > Number(selector.maximumCost)) return false;
  const effectNeedle = String(selector.effectIdIncludes || "").toLowerCase();
  if (effectNeedle && !(card.effects || []).some((entry) => String(entry?.id || "").toLowerCase().includes(effectNeedle))) return false;
  return true;
}

function resolvePlayerId(match, action, context) {
  if (action.playerId && match.players?.[action.playerId]) return action.playerId;
  const player = String(action.player ?? action.owner ?? "self").toLowerCase();
  if (["opponent", "enemy", "other"].includes(player)) return otherPlayerId(match, context.sourcePlayerId);
  return context.sourcePlayerId;
}

function cleanPhysical(card) {
  return {
    ...card,
    cores: { regular: 0, soul: false },
    exhausted: false,
    pendingDestruction: false,
    combinedWith: null,
    effectModifiers: []
  };
}

function summonEntersExhaustedByModifier(match, playerId, card) {
  return match.phase === "main"
    && !(card?.families || []).includes("Imp")
    && ["spirit", "brave"].includes(String(card?.cardType || "").toLowerCase())
    && getContinuousPlayerNumericModifier(match, playerId, "nonImpSummonsExhaustedDuringMain") > 0;
}

function minimumCores(card) {
  const levels = (card?.levels || []).map((level) => Number(level.cores)).filter(Number.isFinite);
  if (!levels.length) return ["spirit", "ultimate", "brave"].includes(card?.cardType) ? 1 : 0;
  return Math.min(...levels);
}

function takeSpecialSummonPlacementCores(match, playerId, amount, cardIndex) {
  let player = match.players?.[playerId];
  if (!player) return { ok: false, match, error: "Jogador inválido para Special Summon." };
  let remaining = Math.max(0, Number(amount || 0));
  let regular = 0;
  let soul = false;
  const touched = new Set();

  const fromReserve = Math.min(Number(player.reserve || 0), remaining);
  if (fromReserve > 0) {
    player = { ...player, reserve: Number(player.reserve || 0) - fromReserve };
    regular += fromReserve;
    remaining -= fromReserve;
  }
  if (remaining > 0 && player.soulCore?.zone === "reserve") {
    soul = true;
    player = { ...player, soulCore: { zone: "moving", instanceId: null } };
    remaining -= 1;
  }
  if (remaining > 0) {
    for (const zone of ["spirits", "nexuses", "other"]) {
      for (const physical of player.field?.[zone] || []) {
        if (remaining <= 0) break;
        const available = Number(physical.cores?.regular || 0);
        if (!available) continue;
        const use = Math.min(available, remaining);
        player = updateFieldCard(player, physical.instanceId, (card) => ({
          ...card,
          cores: { ...card.cores, regular: Number(card.cores?.regular || 0) - use }
        }));
        regular += use;
        remaining -= use;
        touched.add(physical.instanceId);
      }
    }
  }
  if (remaining > 0) return { ok: false, match, error: "Cores insuficientes para manter o Lv mínimo da carta invocada por efeito." };

  let next = { ...match, players: { ...match.players, [playerId]: player } };
  for (const instanceId of touched) next = checkDepletion(next, playerId, instanceId, cardIndex);
  return { ok: true, match: next, cores: { regular, soul } };
}

function detachAttachedBrave(match, playerId, hostInstanceId, cardIndex) {
  let player = match.players[playerId];
  const attached = (player.field?.other || []).find((physical) => physical.combinedWith === hostInstanceId);
  if (!attached) return match;
  const braveCard = getDatabaseCard(cardIndex, attached);
  const min = minimumCores(braveCard);
  const survives = getContinuousNumericModifier(match, cardIndex, attached, "braveSurvivesHostDestructionRefresh") > 0;
  if (min <= Number(player.reserve || 0)) {
    player = { ...player, reserve: Number(player.reserve || 0) - min };
    player = updateFieldCard(player, attached.instanceId, (physical) => ({
      ...physical,
      combinedWith: null,
      exhausted: survives ? false : physical.exhausted,
      flags: survives ? { ...(physical.flags || {}), lastCombinedWith: hostInstanceId } : physical.flags,
      cores: { regular: min, soul: false }
    }));
  } else if (survives) {
    player = updateFieldCard(player, attached.instanceId, (physical) => ({ ...physical, combinedWith: null, exhausted: false, flags: { ...(physical.flags || {}), lastCombinedWith: hostInstanceId }, cores: { regular: 0, soul: false } }));
  } else {
    const removed = removeFieldCard(player, attached.instanceId);
    if (removed.card) player = { ...removed.player, trash: [...removed.player.trash, cleanPhysical(removed.card)] };
  }
  return { ...match, players: { ...match.players, [playerId]: player } };
}

function moveTargetOut(match, target, destination, cardIndex, context = {}) {
  if (destination === "hand" && context.sourcePlayerId && getContinuousPlayerNumericModifier(match, context.sourcePlayerId, "ownEffectReturnToTopDeck") > 0) destination = "topDeck";
  const instanceId = target?.physical?.instanceId;
  if (!instanceId) return match;
  const current = findPhysicalCard(match, instanceId);
  if (!current) return match;

  if (["spirits", "nexuses", "other"].includes(current.zone)) {
    const removed = removeFieldCard(match.players[current.playerId], current.card.instanceId);
    if (!removed.card) return match;
    const regular = Number(removed.card.cores?.regular || 0);
    let player = { ...removed.player, reserve: Number(removed.player.reserve || 0) + regular };
    if (removed.card.cores?.soul) player = { ...player, soulCore: { zone: "reserve", instanceId: null } };
    const clean = cleanPhysical(removed.card);
    if (destination === "trash") player = { ...player, trash: [...player.trash, clean] };
    if (destination === "hand") player = { ...player, hand: [...player.hand, clean] };
    if (destination === "topDeck") player = { ...player, deck: [clean, ...player.deck] };
    let next = { ...match, players: { ...match.players, [current.playerId]: player } };
    if (current.zone === "spirits") next = detachAttachedBrave(next, current.playerId, current.card.instanceId, cardIndex);
    const movedCard = getDatabaseCard(cardIndex, removed.card);
    next = queueDeferredCanonicalEvent(next, {
      event: "cardMoved",
      sourcePlayerId: current.playerId,
      sourcePhysical: clean,
      sourceCardId: movedCard?.id || clean?.cardId || null,
      eventPlayerId: current.playerId,
      context: {
        movedCardInstanceId: clean?.instanceId || null,
        movedCardId: movedCard?.id || clean?.cardId || null,
        movedCardFamilies: movedCard?.families || [],
        movedCardType: movedCard?.cardType || null,
        moveFromZone: current.zone,
        moveDestination: destination,
        movedByPlayerId: context.sourcePlayerId || null,
        movedByInstanceId: context.sourceInstanceId || null,
        movedByCardId: context.sourceCard?.id || null,
        movedByCardType: context.sourceCard?.cardType || null
      }
    });
    if (destination === "hand" && context.sourcePlayerId === current.playerId) {
      next = openBurstOpportunityForEvent(next, BurstEvent.OPPONENT_HAND_INCREASE, current.playerId, cardIndex, {
        sourcePlayerId: context.sourcePlayerId, sourceInstanceId: context.sourceInstanceId || null, cause: "effectReturnToHand", amount: 1
      });
    }
    return next;
  }

  if (current.zone === "trash" && destination === "hand") {
    if (getContinuousPlayerNumericModifier(match, current.playerId, "trashToHandBlocked") > 0) return match;
    const player = match.players[current.playerId];
    const trash = [...player.trash];
    const index = trash.findIndex((card) => card.instanceId === instanceId);
    if (index < 0) return match;
    const [card] = trash.splice(index, 1);
    const clean = cleanPhysical(card);
    let next = {
      ...match,
      players: {
        ...match.players,
        [current.playerId]: { ...player, trash, hand: [...player.hand, clean] }
      }
    };
    const movedCard = getDatabaseCard(cardIndex, card);
    next = queueDeferredCanonicalEvent(next, {
      event: "cardMoved",
      sourcePlayerId: current.playerId,
      sourcePhysical: clean,
      sourceCardId: movedCard?.id || clean?.cardId || null,
      eventPlayerId: current.playerId,
      context: {
        movedCardInstanceId: clean?.instanceId || null,
        movedCardId: movedCard?.id || clean?.cardId || null,
        movedCardFamilies: movedCard?.families || [],
        movedCardType: movedCard?.cardType || null,
        moveFromZone: "trash",
        moveDestination: destination,
        movedByPlayerId: context.sourcePlayerId || null,
        movedByInstanceId: context.sourceInstanceId || null,
        movedByCardId: context.sourceCard?.id || null,
        movedByCardType: context.sourceCard?.cardType || null
      }
    });
    return next;
  }

  return match;
}


function removeFromSimpleZone(player, zone, instanceId) {
  if (!["hand", "trash", "revealed", "openArea", "deck"].includes(zone)) return { player, card: null };
  const list = [...(player[zone] || [])];
  const index = list.findIndex((card) => card.instanceId === instanceId);
  if (index < 0) return { player, card: null };
  const [card] = list.splice(index, 1);
  return { player: { ...player, [zone]: list }, card };
}

function moveCardGeneric(match, target, destination, cardIndex, context = {}) {
  const instanceId = target?.physical?.instanceId;
  if (!instanceId) return match;
  const current = findPhysicalCard(match, instanceId);
  if (!current) return match;
  if (["spirits", "nexuses", "other"].includes(current.zone) && ["hand", "trash", "topDeck", "openArea"].includes(destination)) {
    return moveTargetOut(match, target, destination, cardIndex, context);
  }
  if (current.zone === "trash" && destination === "hand") return moveTargetOut(match, target, destination, cardIndex, context);
  let player = match.players[current.playerId];
  let removedCard = null;

  if (["spirits", "nexuses", "other"].includes(current.zone)) {
    const removed = removeFieldCard(player, instanceId);
    player = removed.player;
    removedCard = removed.card;
    if (removedCard) {
      const regular = Number(removedCard.cores?.regular || 0);
      player = { ...player, reserve: Number(player.reserve || 0) + regular };
      if (removedCard.cores?.soul) player = { ...player, soulCore: { zone: "reserve", instanceId: null } };
      removedCard = cleanPhysical(removedCard);
    }
  } else {
    const removed = removeFromSimpleZone(player, current.zone, instanceId);
    player = removed.player;
    removedCard = removed.card ? cleanPhysical(removed.card) : null;
  }
  if (!removedCard) return match;

  if (destination === "hand") player = { ...player, hand: [...player.hand, removedCard] };
  else if (destination === "trash") player = { ...player, trash: [...player.trash, removedCard] };
  else if (destination === "topDeck") player = { ...player, deck: [removedCard, ...player.deck] };
  else if (destination === "bottomDeck") player = { ...player, deck: [...player.deck, removedCard] };
  else if (destination === "deck") player = { ...player, deck: [...player.deck, removedCard] };
  else if (destination === "openArea") player = { ...player, openArea: [...(player.openArea || []), removedCard] };
  else if (destination === "removed") player = { ...player, removed: [...(player.removed || []), removedCard] };
  else return match;

  let next = { ...match, players: { ...match.players, [current.playerId]: player } };
  const movedCard = getDatabaseCard(cardIndex, removedCard);
  next = queueDeferredCanonicalEvent(next, {
    event: "cardMoved",
    sourcePlayerId: current.playerId,
    sourcePhysical: removedCard,
    sourceCardId: movedCard?.id || removedCard?.cardId || null,
    eventPlayerId: current.playerId,
    context: {
      movedCardInstanceId: removedCard?.instanceId || null,
      movedCardId: movedCard?.id || removedCard?.cardId || null,
      movedCardFamilies: movedCard?.families || [],
      movedCardType: movedCard?.cardType || null,
      moveFromZone: current.zone,
      moveDestination: destination,
      movedByPlayerId: context.sourcePlayerId || null,
      movedByInstanceId: context.sourceInstanceId || null,
      movedByCardId: context.sourceCard?.id || null,
      movedByCardType: context.sourceCard?.cardType || null
    }
  });
  if (destination === "hand" && context.sourcePlayerId === current.playerId) {
    next = openBurstOpportunityForEvent(next, BurstEvent.OPPONENT_HAND_INCREASE, current.playerId, cardIndex, {
      sourcePlayerId: context.sourcePlayerId, sourceInstanceId: context.sourceInstanceId || null, cause: "effectMoveToHand", amount: 1
    });
  }
  return next;
}

function decisionCandidate(target) {
  return {
    instanceId: target?.physical?.instanceId || null,
    playerId: target?.playerId || null,
    zone: target?.zone || null,
    cardId: target?.physical?.cardId || target?.card?.id || null
  };
}

function decisionPlayerId(match, action, context) {
  const chooser = String(action.chooser ?? action.decisionPlayer ?? "self").toLowerCase();
  if (["opponent", "enemy", "other"].includes(chooser)) return otherPlayerId(match, context.sourcePlayerId);
  return context.sourcePlayerId;
}

function decisionFromTargets(match, action, resolvedTargets, context, cardIndex) {
  const minimum = Math.max(0, Number(resolvedTargets.minimum ?? action.minTargets ?? (action.allowZero ? 0 : 1)));
  const maximum = Math.max(
    minimum,
    Number(
      resolvedTargets.requested ??
      action.maxTargets ??
      action.targetCount ??
      action.selectCount ??
      1
    )
  );

  return {
    kind: canonicalActionType(action.type) === "selectTrashTarget"
      ? "selectTrashTarget"
      : canonicalActionType(action.type) === "selectMultipleTargets" || Number(resolvedTargets.requested || 1) > 1
        ? "selectMultipleTargets"
        : "selectTarget",
    playerId: decisionPlayerId(match, action, context),
    action,
    context,
    candidates: (resolvedTargets.targets || []).map(decisionCandidate).filter((item) => item.instanceId),
    minimum,
    maximum,
    allowZero: Boolean(action.allowZero || minimum === 0),
    maxTotalBP: action.maxTotalBP != null
      ? Number(action.maxTotalBP)
      : action.maxTotalBPFromSelector && typeof action.maxTotalBPFromSelector === "object"
        ? collectTargets(match, cardIndex, action.maxTotalBPFromSelector, context).reduce((sum, target) => sum + Number(getEffectiveBP(match, cardIndex, target.physical) || 0), 0)
        : null,
    titlePT: action.titlePT || action.title?.ptBR || action.title?.pt || null,
    titleEN: action.titleEN || action.title?.en || null,
    instructionPT: action.instructionPT || action.instruction?.ptBR || action.instruction?.pt || null,
    instructionEN: action.instructionEN || action.instruction?.en || null,
    continuationActions: [],
    continuationBatches: []
  };
}

function decisionFromOptions(action, context) {
  return {
    kind: "chooseOption",
    playerId: context.sourcePlayerId,
    action,
    context,
    candidates: [],
    minimum: 1,
    maximum: 1,
    allowZero: false,
    maxTotalBP: null,
    titlePT: action.titlePT || action.title?.ptBR || action.title?.pt || null,
    titleEN: action.titleEN || action.title?.en || null,
    instructionPT: action.instructionPT || action.instruction?.ptBR || action.instruction?.pt || null,
    instructionEN: action.instructionEN || action.instruction?.en || null,
    options: (action.options || []).map((option, index) => ({
      id: String(option.id ?? index),
      labelPT: option.labelPT || option.label?.ptBR || option.label?.pt || option.labelEN || option.label?.en || `Opção ${index + 1}`,
      labelEN: option.labelEN || option.label?.en || option.labelPT || option.label?.ptBR || `Option ${index + 1}`
    })),
    continuationActions: [],
    continuationBatches: []
  };
}

function decisionMeta(action = {}) {
  return {
    titlePT: action.titlePT || action.title?.ptBR || action.title?.pt || null,
    titleEN: action.titleEN || action.title?.en || null,
    instructionPT: action.instructionPT || action.instruction?.ptBR || action.instruction?.pt || null,
    instructionEN: action.instructionEN || action.instruction?.en || null
  };
}

function decisionFromYesNo(action, context) {
  const yesActions = asActionArray(action.yesActions ?? action.onYes ?? action.then ?? action.actions);
  const noActions = asActionArray(action.noActions ?? action.onNo ?? action.else);
  const normalized = {
    ...action,
    type: "chooseOption",
    options: [
      { id: "yes", labelPT: action.yesLabelPT || "Sim", labelEN: action.yesLabelEN || "Yes", actions: yesActions },
      { id: "no", labelPT: action.noLabelPT || "Não", labelEN: action.noLabelEN || "No", actions: noActions }
    ]
  };
  return { ...decisionFromOptions(normalized, context), kind: "chooseYesNo", action: normalized };
}

function decisionFromOrder(action, context, candidates) {
  return {
    kind: "chooseOrder",
    playerId: context.sourcePlayerId,
    action,
    context,
    candidates: candidates.map(decisionCandidate).filter((item) => item.instanceId),
    minimum: candidates.length,
    maximum: candidates.length,
    allowZero: candidates.length === 0,
    maxTotalBP: null,
    ...decisionMeta(action),
    continuationActions: [],
    continuationBatches: []
  };
}

function decisionFromCoreDistribution(action, context, candidates) {
  const amount = Math.max(0, Number(action.amount ?? action.count ?? action.totalCores ?? 0));
  return {
    kind: "chooseCoreDistribution",
    playerId: context.sourcePlayerId,
    action,
    context,
    candidates: candidates.map(decisionCandidate).filter((item) => item.instanceId),
    minimum: 0,
    maximum: candidates.length,
    allowZero: amount === 0 || Boolean(action.allowZero),
    maxTotalBP: null,
    totalCores: amount,
    exactTotal: action.exactTotal !== false,
    sourceCoreZone: action.from || action.source || "reserve",
    ...decisionMeta(action),
    continuationActions: [],
    continuationBatches: []
  };
}

function applyToTargets(match, action, cardIndex, context, updater) {
  const resolved = resolveActionTargets(match, action, cardIndex, context);
  if (resolved.status === "manual") {
    return {
      match,
      notes: [resolved.reason],
      manualResolutionNeeded: true,
      executed: false,
      decision: decisionFromTargets(match, action, resolved, context, cardIndex)
    };
  }
  if (resolved.status === "none") {
    return { match, notes: ["Nenhum alvo válido encontrado para o efeito."], manualResolutionNeeded: false, executed: true };
  }
  let next = match;
  for (const target of resolved.targets) next = updater(next, target);
  return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: resolved.targets.length };
}

function mergeResults(base, addition) {
  return {
    match: addition.match,
    notes: [...base.notes, ...(addition.notes || [])],
    manualResolutionNeeded: base.manualResolutionNeeded || Boolean(addition.manualResolutionNeeded),
    executed: base.executed || Boolean(addition.executed),
    affectedCount: Number(base.affectedCount || 0) + Number(addition.affectedCount || 0),
    decision: addition.decision || base.decision || null
  };
}

export function resolveAction(match, rawAction = {}, cardIndex, context = {}, resolveNested) {
  const type = canonicalActionType(rawAction.type);
  const action = { ...rawAction, type };
  let next = match;

  if (!type) return { match, notes: ["Operação sem tipo estruturado."], manualResolutionNeeded: true, executed: false };

  if (type === "suppressWhenSummonedForEndSteps") {
    const playerId = resolvePlayerId(next, action, context);
    const count = Math.max(1, Number(action.count ?? action.amount ?? 1));
    next = {
      ...next,
      persistentEffects: {
        ...(next.persistentEffects || {}),
        suppressWhenSummonedEndSteps: {
          ...(next.persistentEffects?.suppressWhenSummonedEndSteps || {}),
          [playerId]: Math.max(count, Number(next.persistentEffects?.suppressWhenSummonedEndSteps?.[playerId] || 0))
        }
      }
    };
    return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 1 };
  }

  if (type === "preventEvent") {
    if (!next.replacementWindow) return { match: next, notes: ["preventEvent requires an active replacement window."], manualResolutionNeeded: true, executed: false };
    next = preventReplacementEvent(next, { sourceEffectId: context.effectId, sourceInstanceId: context.sourceInstanceId });
    return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 1 };
  }

  if (type === "replaceEvent") {
    if (!next.replacementWindow) return { match: next, notes: ["replaceEvent requires an active replacement window."], manualResolutionNeeded: true, executed: false };
    const replacement = {
      type: action.replacementType || action.with || action.replacement || "move",
      destination: action.destination || action.to || null,
      amount: action.amount == null ? null : Number(action.amount),
      metadata: action.metadata || null
    };
    next = replaceCurrentEvent(next, replacement, { sourceEffectId: context.effectId, sourceInstanceId: context.sourceInstanceId });
    return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 1 };
  }

  if (type === "draw") {
    const playerId = resolvePlayerId(next, action, context);
    let player = next.players?.[playerId];
    if (!player) return { match, notes: ["Jogador alvo inválido para draw."], manualResolutionNeeded: true, executed: false };
    const deck = [...player.deck];
    const hand = [...player.hand];
    const selectedMultiplier = Number(action.amountPerSelected ?? action.countPerSelected ?? 0);
    const selectedCount = Array.isArray(context.selectedTargets) ? context.selectedTargets.length : 0;
    const rawCount = selectedMultiplier > 0 ? selectedCount * selectedMultiplier : (action.count ?? action.amount ?? 1);
    const count = Math.max(0, Number(rawCount));
    let drew = 0;
    while (drew < count) {
      if (!deck.length) {
        next = { ...next, winnerId: otherPlayerId(next, playerId), winnerReason: "deck" };
        break;
      }
      hand.push(deck.shift());
      drew += 1;
    }
    player = { ...player, deck, hand };
    next = { ...next, players: { ...next.players, [playerId]: player } };
    if (drew > 0 && context.sourcePlayerId === playerId) {
      next = openBurstOpportunityForEvent(next, BurstEvent.OPPONENT_HAND_INCREASE, playerId, cardIndex, {
        sourcePlayerId: context.sourcePlayerId,
        sourceInstanceId: context.sourceInstanceId || null,
        cause: "effectDraw",
        amount: drew
      });
    }
    return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: drew };
  }


  if (type === "moveSourceToOpenArea") {
    const sourceId = context.sourceInstanceId || context.sourcePhysical?.instanceId || null;
    if (!sourceId) return { match: next, notes: ["Accel source is missing an instance id."], manualResolutionNeeded: true, executed: false };
    const current = findPhysicalCard(next, sourceId);
    if (!current) return { match: next, notes: ["Accel source is no longer in a movable zone."], manualResolutionNeeded: true, executed: false };
    const sourceTarget = { playerId: current.playerId, zone: current.zone, physical: current.card, card: getDatabaseCard(cardIndex, current.card) };
    const moved = moveCardGeneric(next, sourceTarget, "openArea", cardIndex, context);
    return { match: moved, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: moved === next ? 0 : 1 };
  }


  if (type === "discard") {
    return applyToTargets(next, { ...action, selector: action.selector || action.target || { owner: "self", zones: ["hand"] } }, cardIndex, context, (working, target) => moveCardGeneric(working, target, "trash", cardIndex, context));
  }

  if (["moveCard", "returnToDeck", "returnToBottomDeck"].includes(type)) {
    const destination = type === "returnToBottomDeck" ? "bottomDeck"
      : type === "returnToDeck" ? (action.position === "top" ? "topDeck" : action.position === "bottom" ? "bottomDeck" : "deck")
      : String(action.destination || action.to || "");
    if (!destination) return { match, notes: ["moveCard requires a destination."], manualResolutionNeeded: true, executed: false };
    return applyToTargets(next, action, cardIndex, context, (working, target) => moveCardGeneric(working, target, destination, cardIndex, context));
  }

  if (type === "addCoreToReserveFromVoid") {
    const playerId = resolvePlayerId(next, action, context);
    const player = next.players?.[playerId];
    if (!player) return { match, notes: ["Jogador alvo inválido para Core do Void."], manualResolutionNeeded: true, executed: false };
    const contextualCount = action.countFromContext ? valueFromContext(context, action.countFromContext, null) : null;
    const sourceLevelCount = action.countFromSourceLevel && context.sourceCard && context.sourcePhysical
      ? Number(getCurrentLevel(context.sourceCard, context.sourcePhysical)?.level || 0)
      : null;
    const selectorCount = action.countFromSelector && typeof action.countFromSelector === "object"
      ? collectTargets(next, cardIndex, action.countFromSelector, context).length
      : null;
    const count = Math.max(0, Number(contextualCount ?? sourceLevelCount ?? selectorCount ?? action.count ?? action.amount ?? 1));
    next = { ...next, players: { ...next.players, [playerId]: { ...player, reserve: Number(player.reserve || 0) + count } } };
    return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: count };
  }

  if (type === "addCoreFromVoid") {
    const count = Math.max(0, Number(action.count ?? action.amount ?? 1));
    return applyToTargets(next, action, cardIndex, context, (working, target) => {
      const current = findPhysicalCard(working, target.physical.instanceId);
      if (!current || !["spirits", "nexuses", "other"].includes(current.zone)) return working;
      const player = updateFieldCard(working.players[current.playerId], current.card.instanceId, (physical) => ({
        ...physical,
        cores: { ...physical.cores, regular: Number(physical.cores?.regular || 0) + count }
      }));
      return { ...working, players: { ...working.players, [current.playerId]: player } };
    });
  }


  if (type === "addCore" || type === "removeCore") {
    const configuredCount = Math.max(0, Number(action.count ?? action.amount ?? 1));
    return applyToTargets(next, action, cardIndex, context, (working, target) => {
      const current = findPhysicalCard(working, target.physical.instanceId);
      if (!current || !["spirits", "nexuses", "other"].includes(current.zone)) return working;
      if (type === "removeCore" && getContinuousNumericModifier(working, cardIndex, current.card, "coreRemovalLocked") > 0) return working;
      if (type === "removeCore" && getContinuousNumericModifier(working, cardIndex, current.card, "coreRemovalLockedExceptTransmigration") > 0
          && String(context.cause || action.cause || "").toLowerCase() !== "transmigration") return working;
      if (type === "removeCore" && context.sourcePlayerId && context.sourcePlayerId !== current.playerId
          && getContinuousNumericModifier(working, cardIndex, current.card, "coreRemovalProtectedFromOpponentEffects") > 0) return working;
      const player = working.players[current.playerId];
      const available = Number(current.card.cores?.regular || 0);
      const count = action.allCores === true ? available : configuredCount;
      const moved = Math.min(count, available);
      const delta = type === "addCore" ? count : -moved;
      const updated = updateFieldCard(player, current.card.instanceId, (physical) => ({
        ...physical,
        cores: { ...physical.cores, regular: Math.max(0, Number(physical.cores?.regular || 0) + delta) }
      }));
      if (type !== "removeCore" || moved <= 0) return { ...working, players: { ...working.players, [current.playerId]: updated } };
      const destination = String(action.destination || action.to || "reserve").toLowerCase();
      const withDestination = destination === "trash"
        ? { ...updated, trashCores: Number(updated.trashCores || 0) + moved }
        : destination === "void"
          ? updated
          : { ...updated, reserve: Number(updated.reserve || 0) + moved };
      return { ...working, players: { ...working.players, [current.playerId]: withDestination } };
    });
  }

  if (type === "requireAttackIfAble") {
    const playerId = resolvePlayerId(next, { ...action, player: action.player || "opponent" }, context);
    next = {
      ...next,
      temporary: {
        ...(next.temporary || {}),
        attackRequirements: {
          ...(next.temporary?.attackRequirements || {}),
          [playerId]: {
            minimumAttacks: Math.max(1, Number(action.minimumAttacks ?? action.amount ?? 1)),
            sourcePlayerId: context.sourcePlayerId || null,
            sourceInstanceId: context.sourceInstanceId || null,
            sourceEffectId: context.effectId || null
          }
        }
      }
    };
    return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 1 };
  }

  if (type === "emitSourceEvent") {
    const event = String(action.event || action.value || "").trim();
    const selectedInstanceId = action.target === "selected" ? (context.selectedTargets?.[0]?.physical?.instanceId || context.selectedTargets?.[0]?.instanceId || null) : null;
    const instanceId = selectedInstanceId || (action.source === "self" ? context.sourceInstanceId : (context.eventSourceInstanceId || context.sourceInstanceId));
    const found = instanceId ? findPhysicalCard(next, instanceId) : null;
    if (!event || !found) return { match: next, notes: ["emitSourceEvent requires a valid event source."], manualResolutionNeeded: true, executed: false };
    next = queueDeferredCanonicalEvent(next, {
      event,
      sourcePlayerId: found.playerId,
      sourceInstanceId: found.card.instanceId,
      sourceCardId: found.card.cardId,
      context: {
        ...(action.context || {}),
        relayedFromEvent: context.event || null,
        relayedByInstanceId: context.sourceInstanceId || null
      }
    });
    return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 1 };
  }

  if (type === "dispatchSourceEvent") {
    const event = String(action.event || action.value || "").trim();
    if (!event || !context.sourcePlayerId || !context.sourceCard) {
      return { match: next, notes: ["dispatchSourceEvent requires a current effect source."], manualResolutionNeeded: true, executed: false };
    }
    next = queueDeferredCanonicalEvent(next, {
      event,
      sourcePlayerId: context.sourcePlayerId,
      sourceInstanceId: context.sourceInstanceId || context.sourcePhysical?.instanceId || null,
      sourcePhysical: context.sourcePhysical || null,
      sourceCard: context.sourceCard || null,
      sourceCardId: context.sourceCard?.id || null,
      eventPlayerId: context.sourcePlayerId,
      context: { ...(action.context || {}), relayedFromEvent: context.event || null }
    });
    return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 1 };
  }

  if (type === "endCurrentStep") {
    const current = String(next.phase || "");
    let nextPhase = null;
    if (current === "main") nextPhase = (next.turnNumber === 1 && next.activePlayerId === next.firstPlayerId) ? "end" : "attack";
    else if (current === "attack") nextPhase = "end";
    if (!nextPhase) return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    next = { ...next, phase: nextPhase };
    next = queueDeferredCanonicalEvent(next, {
      event: nextPhase === "attack" ? "attackStep" : "endStep",
      sourcePlayerId: next.activePlayerId,
      eventPlayerId: next.activePlayerId,
      context: { previousPhase: current, endedByEffect: true }
    });
    return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 1 };
  }

  if (type === "oncePerTurn") {
    const key = String(action.key || action.id || context.effectId || "once-per-turn");
    const owner = context.sourcePlayerId || "global";
    const source = context.sourceInstanceId || context.sourceCard?.id || "source";
    const usageKey = `${owner}:${source}:${key}`;
    const used = Boolean(next.temporary?.oncePerTurn?.[usageKey]);
    if (used) return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    const nested = asActionArray(action.actions ?? action.then ?? action.onAvailable);
    let marked = {
      ...next,
      temporary: {
        ...(next.temporary || {}),
        oncePerTurn: { ...(next.temporary?.oncePerTurn || {}), [usageKey]: true }
      }
    };
    return nested.length
      ? resolveNested(marked, nested, cardIndex, context)
      : { match: marked, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 1 };
  }

  if (type === "upToNTimesPerTurn") {
    const key = String(action.key || action.id || context.effectId || "limited-per-turn");
    const owner = context.sourcePlayerId || "global";
    const source = context.sourceInstanceId || context.sourceCard?.id || "source";
    const usageKey = `${owner}:${source}:${key}`;
    const limit = Math.max(1, Number(action.limit ?? action.maxUses ?? action.count ?? 1));
    const used = Math.max(0, Number(next.temporary?.limitedPerTurn?.[usageKey] || 0));
    if (used >= limit) return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    const nested = asActionArray(action.actions ?? action.then ?? action.onAvailable);
    const marked = {
      ...next,
      temporary: {
        ...(next.temporary || {}),
        limitedPerTurn: { ...(next.temporary?.limitedPerTurn || {}), [usageKey]: used + 1 }
      }
    };
    return nested.length
      ? resolveNested(marked, nested, cardIndex, context)
      : { match: marked, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 1 };
  }

  if (type === "revealTopAndRoute") {
    const playerId = resolvePlayerId(next, action, context);
    const player = next.players?.[playerId];
    if (!player) return { match: next, notes: ["Jogador inválido para reveal route."], manualResolutionNeeded: true, executed: false };
    const symbolCount = action.countFromSymbolColor ? Number(getFieldSymbols(next, playerId, cardIndex)?.[action.countFromSymbolColor] || 0) : null;
    const count = Math.max(1, Number(symbolCount ?? action.count ?? action.amount ?? 1));
    let deck = [...(player.deck || [])];
    let hand = [...(player.hand || [])];
    let trash = [...(player.trash || [])];
    let revealed = [...(player.revealed || [])];
    let moved = 0;
    for (let i = 0; i < count && deck.length; i += 1) {
      const physical = deck.shift();
      const card = getDatabaseCard(cardIndex, physical);
      const selector = action.matchSelector || action.selector || {};
      const matched = cardMatchesSimpleSelector(card, selector);
      const destination = matched ? String(action.matchedDestination || "hand") : String(action.otherwiseDestination || "trash");
      if (destination === "hand") hand.push(physical);
      else if (destination === "trash") trash.push(physical);
      else if (destination === "revealed") revealed.push(physical);
      else if (destination === "topDeck") deck.unshift(physical);
      else if (destination === "bottomDeck") deck.push(physical);
      else trash.push(physical);
      moved += 1;
    }
    next = { ...next, players: { ...next.players, [playerId]: { ...player, deck, hand, trash, revealed } } };
    return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: moved };
  }

  if (type === "revealTopAndSummonOrHand") {
    const playerId = resolvePlayerId(next, action, context);
    const player = next.players?.[playerId];
    if (!player || !(player.deck || []).length) return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    const physical = player.deck[0];
    const card = getDatabaseCard(cardIndex, physical);
    const deck = player.deck.slice(1);
    next = { ...next, players: { ...next.players, [playerId]: { ...player, deck } } };
    const matched = cardMatchesSimpleSelector(card, action.matchSelector || action.selector || {});
    if (matched && ["spirit", "ultimate", "brave"].includes(String(card?.cardType || "").toLowerCase())) {
      const min = minimumCores(card);
      const placed = takeSpecialSummonPlacementCores(next, playerId, Number(action.coresToPlace ?? min), cardIndex);
      if (placed.ok) {
        let placedPlayer = placed.match.players[playerId];
        const summonedPhysical = { ...cleanPhysical(physical), cardType: card.cardType, exhausted: summonEntersExhaustedByModifier(placed.match, playerId, card), cores: placed.cores, combinedWith: null };
        if (placed.cores.soul) placedPlayer = { ...placedPlayer, soulCore: { zone: "card", instanceId: summonedPhysical.instanceId } };
        const zone = card.cardType === "brave" ? "other" : "spirits";
        placedPlayer = addFieldCard(placedPlayer, zone, summonedPhysical);
        let summoned = { ...placed.match, players: { ...placed.match.players, [playerId]: placedPlayer } };
        summoned = queueDeferredCanonicalEvent(summoned, { event: "whenSummoned", sourcePlayerId: playerId, sourceInstanceId: summonedPhysical.instanceId, eventPlayerId: playerId, context: { specialSummon: true, costPaid: false, fromZone: "deck" } });
        return { match: summoned, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 1 };
      }
    }
    const currentPlayer = next.players[playerId];
    next = { ...next, players: { ...next.players, [playerId]: { ...currentPlayer, hand: [...(currentPlayer.hand || []), cleanPhysical(physical)] } } };
    return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 1 };
  }

  if (type === "returnMagicUsedThisBattle") {
    const playerId = resolvePlayerId(next, action, context);
    const battleId = action.battleId || context.battleId || next.battle?.id || null;
    const ids = battleId ? (next.temporary?.magicUsedByBattle?.[battleId]?.[playerId] || []) : [];
    if (!ids.length) return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    const player = next.players?.[playerId];
    if (!player) return { match: next, notes: ["Jogador inválido para recuperar Magics usadas."], manualResolutionNeeded: true, executed: false };
    const wanted = new Set(ids);
    const trash = [];
    const recovered = [];
    for (const physical of player.trash || []) {
      const card = getDatabaseCard(cardIndex, physical);
      if (wanted.has(physical.instanceId) && String(card?.cardType || "").toLowerCase() === "magic") recovered.push(cleanPhysical(physical));
      else trash.push(physical);
    }
    next = { ...next, players: { ...next.players, [playerId]: { ...player, trash, hand: [...player.hand, ...recovered] } } };
    return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: recovered.length };
  }

  if (type === "swapExhaustionState") {
    const selector = action.selector || { owner: "any", zones: ["field"], cardTypes: ["spirit"] };
    const targets = collectTargets(next, cardIndex, selector, context);
    for (const target of targets) {
      const current = findPhysicalCard(next, target.physical.instanceId);
      if (!current || !["spirits", "other"].includes(current.zone)) continue;
      const player = updateFieldCard(next.players[current.playerId], current.card.instanceId, (physical) => ({ ...physical, exhausted: !physical.exhausted }));
      next = { ...next, players: { ...next.players, [current.playerId]: player } };
    }
    return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: targets.length };
  }

  if (type === "scheduleAttackStepEndAfterBattle") {
    if (next.phase !== "attack" || !next.battle?.id) {
      return { match: next, notes: ["O encerramento programado do Attack Step exige uma batalha ativa no Attack Step."], manualResolutionNeeded: true, executed: false };
    }
    next = {
      ...next,
      temporary: {
        ...(next.temporary || {}),
        endAttackStepAfterBattle: {
          battleId: next.battle.id,
          sourcePlayerId: context.sourcePlayerId || null,
          sourceInstanceId: context.sourceInstanceId || null,
          sourceEffectId: context.effectId || null
        }
      }
    };
    return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 1 };
  }

  if (type === "specialSummonSource") {
    const instanceId = action.instanceId || context.sourceInstanceId;
    const current = findPhysicalCard(next, instanceId);
    if (!current) return { match, notes: ["A fonte do Special Summon não foi encontrada."], manualResolutionNeeded: true, executed: false };
    const playerId = current.playerId;
    const card = getDatabaseCard(cardIndex, current.card);
    if (!card || !["spirit", "ultimate", "brave"].includes(String(card.cardType || "").toLowerCase())) {
      return { match, notes: ["A fonte não é invocável por Special Summon."], manualResolutionNeeded: true, executed: false };
    }
    const min = minimumCores(card);
    const placed = takeSpecialSummonPlacementCores(next, playerId, Number(action.coresToPlace ?? min), cardIndex);
    if (!placed.ok) return { match, notes: [placed.error || "Cores insuficientes para o Special Summon."], manualResolutionNeeded: true, executed: false };
    let player = placed.match.players[playerId];
    let removed = null;
    if (current.zone === "burst") {
      if (player.burst?.instanceId === instanceId) {
        removed = player.burst;
        player = { ...player, burst: null };
      }
    } else if (["hand", "trash", "revealed", "deck"].includes(current.zone)) {
      const result = removeFromSimpleZone(player, current.zone, instanceId);
      player = result.player;
      removed = result.card;
    }
    if (!removed) return { match, notes: ["A fonte não está em uma zona válida para Special Summon."], manualResolutionNeeded: true, executed: false };
    const physical = {
      ...cleanPhysical(removed),
      cardType: card.cardType,
      exhausted: action.exhausted === true || summonEntersExhaustedByModifier(placed.match, playerId, card),
      cores: placed.cores,
      combinedWith: null,
      faceDown: false
    };
    if (placed.cores.soul) player = { ...player, soulCore: { zone: "card", instanceId: physical.instanceId } };
    const zone = card.cardType === "brave" ? "other" : "spirits";
    player = addFieldCard(player, zone, physical);
    let summoned = { ...placed.match, players: { ...placed.match.players, [playerId]: player } };
    if (action.suppressWhenSummoned !== true) {
      summoned = queueDeferredCanonicalEvent(summoned, {
        event: "whenSummoned",
        sourcePlayerId: playerId,
        sourceInstanceId: physical.instanceId,
        eventPlayerId: playerId,
        context: { specialSummon: true, costPaid: false, fromZone: current.zone, specialSummonCause: action.cause || null }
      });
    }
    summoned = openBurstOpportunityForEvent(summoned, BurstEvent.OPPONENT_SUMMONED, playerId, cardIndex, {
      sourcePlayerId: playerId,
      sourceInstanceId: physical.instanceId,
      cause: "specialSummon"
    });
    return { match: summoned, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 1 };
  }

  if (type === "deployFromTrash") {
    const selector = action.selector || { owner: "self", zones: ["trash"], cardTypes: ["nexus"] };
    const targets = collectTrashTargets(next, cardIndex, selector, context);
    const chosen = action.all === true ? targets : targets.slice(0, Math.max(1, Number(action.count ?? 1)));
    let deployed = 0;
    for (const target of chosen) {
      const current = findPhysicalCard(next, target?.physical?.instanceId);
      if (!current || current.zone !== "trash") continue;
      const playerId = current.playerId;
      const card = getDatabaseCard(cardIndex, current.card);
      if (String(card?.cardType || "").toLowerCase() !== "nexus") continue;
      let player = next.players[playerId];
      const removed = removeFromSimpleZone(player, "trash", current.card.instanceId);
      if (!removed.card) continue;
      player = removed.player;
      const physical = { ...cleanPhysical(removed.card), cardType: "nexus", exhausted: false, cores: { regular: 0, soul: false }, combinedWith: null };
      player = addFieldCard(player, "nexuses", physical);
      next = { ...next, players: { ...next.players, [playerId]: player } };
      next = queueDeferredCanonicalEvent(next, { event: "whenDeployed", sourcePlayerId: playerId, sourceInstanceId: physical.instanceId, sourceCardId: card?.id || physical.cardId || null, eventPlayerId: playerId, context: { specialDeploy: true, costPaid: false, fromZone: "trash" } });
      deployed += 1;
    }
    return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: deployed };
  }

  if (type === "forceLevel") {
    const duration = action.duration || "turn";
    return applyToTargets(next, action, cardIndex, context, (working, target) => {
      const current = findPhysicalCard(working, target?.physical?.instanceId);
      if (!current || !["spirits","nexuses","other"].includes(current.zone)) return working;
      const player = updateFieldCard(working.players[current.playerId], current.card.instanceId, (physical) => ({
        ...physical,
        effectModifiers: [...(physical.effectModifiers || []), { type: "forcedLevel", level: action.level ?? null, maxLevel: action.maxLevel === true, duration, battleId: working.battle?.id || null, sourceEffectId: context.effectId || null, sourceInstanceId: context.sourceInstanceId || null }]
      }));
      return { ...working, players: { ...working.players, [current.playerId]: player } };
    });
  }

  if (type === "returnUltimateTriggerRevealedMatchingToHand") {
    const revealedInstanceId = valueFromContext(context, action.instanceIdFromContext || "ultimateTrigger.revealedInstanceId", null);
    if (!revealedInstanceId) return { match, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    const current = findPhysicalCard(next, revealedInstanceId);
    if (!current || current.zone !== "trash") return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    const candidates = collectTrashTargets(next, cardIndex, { ...(action.selector || {}), instanceId: revealedInstanceId }, context);
    if (!candidates.length) return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    const moved = moveTargetOut(next, candidates[0], "hand", cardIndex, context);
    return { match: moved, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 1 };
  }

  if (type === "specialSummonEventSourceFromTrash") {
    const instanceId = context.eventSourceInstanceId || context.sourceInstanceId;
    const current = instanceId ? findPhysicalCard(next, instanceId) : null;
    if (!current || current.zone !== "trash") return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    const card = getDatabaseCard(cardIndex, current.card);
    if (!card || !["spirit", "ultimate", "brave"].includes(String(card.cardType || "").toLowerCase())) return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    const playerId = current.playerId;
    const min = minimumCores(card);
    const placed = takeSpecialSummonPlacementCores(next, playerId, Number(action.coresToPlace ?? min), cardIndex);
    if (!placed.ok) return { match: next, notes: [placed.error || "Cores insuficientes."], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    let player = placed.match.players[playerId];
    const removed = removeFromSimpleZone(player, "trash", current.card.instanceId);
    if (!removed.card) return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    player = removed.player;
    const physical = { ...cleanPhysical(removed.card), cardType: card.cardType, exhausted: action.exhausted === true || summonEntersExhaustedByModifier(placed.match, playerId, card), cores: placed.cores, combinedWith: null };
    const zone = card.cardType === "brave" ? "other" : "spirits";
    player = addFieldCard(player, zone, physical);
    return { match: { ...placed.match, players: { ...placed.match.players, [playerId]: player } }, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 1 };
  }

  if (type === "specialSummonBraveCombinedFromHand") {
    const playerId = context.sourcePlayerId;
    const player = next.players?.[playerId];
    if (!player) return { match: next, notes: ["Jogador inválido."], manualResolutionNeeded: true, executed: false };
    const braveTargets = collectTargets(next, cardIndex, action.braveSelector || { owner: "self", zones: ["hand"], cardTypes: ["brave"] }, context);
    const hostTargets = collectTargets(next, cardIndex, action.hostSelector || { owner: "self", zones: ["field"], cardTypes: ["spirit"] }, context);
    const braveTarget = braveTargets[0];
    const hostTarget = hostTargets[0];
    if (!braveTarget || !hostTarget) return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    const current = findPhysicalCard(next, braveTarget.physical.instanceId);
    if (!current || current.zone !== "hand") return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    const card = getDatabaseCard(cardIndex, current.card);
    if (String(card?.cardType || "").toLowerCase() !== "brave") return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    const min = minimumCores(card);
    const placed = takeSpecialSummonPlacementCores(next, playerId, Number(action.coresToPlace ?? min), cardIndex);
    if (!placed.ok) return { match: next, notes: [placed.error || "Cores insuficientes."], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    let updatedPlayer = placed.match.players[playerId];
    const removed = removeHandCard(updatedPlayer, current.card.instanceId);
    if (!removed.card) return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    updatedPlayer = removed.player;
    const physical = { ...cleanPhysical(removed.card), cardType: "brave", exhausted: Boolean(hostTarget.physical.exhausted), cores: placed.cores, combinedWith: hostTarget.physical.instanceId };
    updatedPlayer = addFieldCard(updatedPlayer, "other", physical);
    let summoned = { ...placed.match, players: { ...placed.match.players, [playerId]: updatedPlayer } };
    summoned = queueDeferredCanonicalEvent(summoned, { event: "whenSummoned", sourcePlayerId: playerId, sourceInstanceId: physical.instanceId, eventPlayerId: playerId, context: { specialSummon: true, costPaid: false, directCombined: true, combinedHostInstanceId: hostTarget.physical.instanceId } });
    if (action.refreshHost === true) {
      const refreshedPlayer = updateFieldCard(summoned.players[playerId], hostTarget.physical.instanceId, (p) => ({ ...p, exhausted: false }));
      summoned = { ...summoned, players: { ...summoned.players, [playerId]: refreshedPlayer } };
    }
    return { match: summoned, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 1 };
  }

  if (type === "returnEventSourceToHand") {
    const instanceId = context.eventSourceInstanceId || context.sourceInstanceId || null;
    if (!instanceId) return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    const current = findPhysicalCard(next, instanceId);
    if (!current || current.zone !== "trash") return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    let player = next.players[current.playerId];
    const trash = [...(player.trash || [])];
    const index = trash.findIndex((physical) => physical.instanceId === instanceId);
    if (index < 0) return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    const [physical] = trash.splice(index, 1);
    player = { ...player, trash, hand: [...(player.hand || []), cleanPhysical(physical)] };
    return { match: { ...next, players: { ...next.players, [current.playerId]: player } }, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 1 };
  }

  if (type === "combineBraveFromField") {
    const braveId = action.brave === "source"
      ? context.sourceInstanceId
      : action.brave === "eventSource"
        ? context.eventSourceInstanceId
        : context.selectedTargets?.[0]?.physical?.instanceId || action.braveInstanceId || null;
    const hostId = action.host === "source"
      ? context.sourceInstanceId
      : action.host === "eventSource"
        ? context.eventSourceInstanceId
        : action.host === "selected"
          ? context.selectedTargets?.[0]?.physical?.instanceId
          : action.hostInstanceId || null;
    const braveCtx = braveId ? findPhysicalCard(next, braveId) : null;
    const hostCtx = hostId ? findPhysicalCard(next, hostId) : null;
    if (!braveCtx || !hostCtx || braveCtx.playerId !== hostCtx.playerId || braveCtx.zone !== "other" || hostCtx.zone !== "spirits") {
      return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    }
    const braveCard = getDatabaseCard(cardIndex, braveCtx.card);
    if (String(braveCard?.cardType || "").toLowerCase() !== "brave" || braveCtx.card.combinedWith) {
      return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    }
    let player = next.players[braveCtx.playerId];
    const regular = Number(braveCtx.card.cores?.regular || 0);
    const soul = Boolean(braveCtx.card.cores?.soul);
    const exhausted = Boolean(braveCtx.card.exhausted || hostCtx.card.exhausted);
    player = updateFieldCard(player, hostId, (physical) => ({ ...physical, exhausted, cores: { regular: Number(physical.cores?.regular || 0) + regular, soul: Boolean(physical.cores?.soul || soul) } }));
    player = updateFieldCard(player, braveId, (physical) => ({ ...physical, exhausted, combinedWith: hostId, cores: { regular: 0, soul: false } }));
    if (soul) player = { ...player, soulCore: { zone: "card", instanceId: hostId } };
    let combined = { ...next, players: { ...next.players, [braveCtx.playerId]: player } };
    combined = queueDeferredCanonicalEvent(combined, { event: "whenBraved", sourcePlayerId: braveCtx.playerId, sourceInstanceId: braveId, eventPlayerId: braveCtx.playerId, context: { isCombined: true, combinedHostInstanceId: hostId } });
    combined = queueDeferredCanonicalEvent(combined, { event: "whenCombined", sourcePlayerId: braveCtx.playerId, sourceInstanceId: hostId, eventPlayerId: braveCtx.playerId, context: { braveInstanceId: braveId } });
    if (action.redispatchAttackAfterCombine === true) {
      combined = queueDeferredCanonicalEvent(combined, { event: "whenAttacks", sourcePlayerId: braveCtx.playerId, sourceInstanceId: hostId, eventPlayerId: braveCtx.playerId, context: { ...(context || {}), bravedReplay: true } });
    }
    return { match: combined, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 1 };
  }

  if (type === "specialSummonFromHand") {
    return applyToTargets(next, { ...action, selector: action.selector || action.target || { owner: "self", zones: ["hand"] } }, cardIndex, context, (working, target) => {
      const current = findPhysicalCard(working, target?.physical?.instanceId);
      if (!current || current.zone !== "hand") return working;
      const playerId = current.playerId;
      const card = getDatabaseCard(cardIndex, current.card);
      const allowedTypes = action.cardTypes || action.allowedCardTypes || ["spirit", "ultimate", "brave"];
      if (!card || !allowedTypes.includes(String(card.cardType || "").toLowerCase())) return working;

      const min = minimumCores(card);
      const placed = takeSpecialSummonPlacementCores(working, playerId, Number(action.coresToPlace ?? min), cardIndex);
      if (!placed.ok) return working;
      let player = placed.match.players[playerId];
      const removed = removeHandCard(player, current.card.instanceId);
      if (!removed.card) return working;
      player = removed.player;
      const physical = {
        ...removed.card,
        cardType: card.cardType,
        exhausted: summonEntersExhaustedByModifier(placed.match, playerId, card),
        cores: placed.cores,
        combinedWith: null
      };
      if (placed.cores.soul) player = { ...player, soulCore: { zone: "card", instanceId: physical.instanceId } };
      const zone = card.cardType === "brave" ? "other" : "spirits";
      player = addFieldCard(player, zone, physical);
      let summoned = { ...placed.match, players: { ...placed.match.players, [playerId]: player } };
      summoned = queueDeferredCanonicalEvent(summoned, {
        event: "whenSummoned",
        sourcePlayerId: playerId,
        sourceInstanceId: physical.instanceId,
        eventPlayerId: playerId,
        context: { specialSummon: true, costPaid: false }
      });
      summoned = openBurstOpportunityForEvent(summoned, BurstEvent.OPPONENT_SUMMONED, playerId, cardIndex, {
        sourcePlayerId: playerId,
        sourceInstanceId: physical.instanceId,
        cause: "specialSummon"
      });
      return summoned;
    });
  }

  if (type === "specialSummonFromTrash") {
    return applyToTargets(next, { ...action, selector: action.selector || action.target || { owner: "self", zones: ["trash"] } }, cardIndex, context, (working, target) => {
      const current = findPhysicalCard(working, target?.physical?.instanceId);
      if (!current || current.zone !== "trash") return working;
      const playerId = current.playerId;
      const card = getDatabaseCard(cardIndex, current.card);
      const allowedTypes = action.cardTypes || action.allowedCardTypes || ["spirit", "ultimate", "brave"];
      if (!card || !allowedTypes.includes(String(card.cardType || "").toLowerCase())) return working;
      const min = minimumCores(card);
      const placed = takeSpecialSummonPlacementCores(working, playerId, Number(action.coresToPlace ?? min), cardIndex);
      if (!placed.ok) return working;
      let player = placed.match.players[playerId];
      const removed = removeFromSimpleZone(player, "trash", current.card.instanceId);
      if (!removed.card) return working;
      player = removed.player;
      const physical = { ...cleanPhysical(removed.card), cardType: card.cardType, exhausted: summonEntersExhaustedByModifier(placed.match, playerId, card), cores: placed.cores, combinedWith: null };
      if (placed.cores.soul) player = { ...player, soulCore: { zone: "card", instanceId: physical.instanceId } };
      const zone = card.cardType === "brave" ? "other" : "spirits";
      player = addFieldCard(player, zone, physical);
      let summoned = { ...placed.match, players: { ...placed.match.players, [playerId]: player } };
      if (action.suppressWhenSummoned !== true) {
        summoned = queueDeferredCanonicalEvent(summoned, { event: "whenSummoned", sourcePlayerId: playerId, sourceInstanceId: physical.instanceId, eventPlayerId: playerId, context: { specialSummon: true, costPaid: false, fromZone: "trash", specialSummonCause: action.cause || null } });
      }
      return summoned;
    });
  }

  if (type === "trimCoresOnMatching") {
    const selector = action.selector || { owner: "any", zones: ["field"], cardTypes: ["spirit"] };
    const leave = Math.max(0, Number(action.leave ?? 1));
    const targets = collectTargets(next, cardIndex, selector, context);
    let movedTotal = 0;
    for (const target of targets) {
      const current = findPhysicalCard(next, target.physical.instanceId);
      if (!current || !["spirits", "nexuses", "other"].includes(current.zone)) continue;
      const regular = Number(current.card.cores?.regular || 0);
      const hasSoul = Boolean(current.card.cores?.soul);
      const regularToKeep = Math.max(0, leave - (action.preferSoul !== false && hasSoul ? 1 : 0));
      const move = Math.max(0, regular - regularToKeep);
      if (!move) continue;
      let player = updateFieldCard(next.players[current.playerId], current.card.instanceId, (physical) => ({
        ...physical, cores: { ...physical.cores, regular: Math.max(0, Number(physical.cores?.regular || 0) - move) }
      }));
      player = { ...player, reserve: Number(player.reserve || 0) + move };
      next = { ...next, players: { ...next.players, [current.playerId]: player } };
      movedTotal += move;
    }
    return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: movedTotal };
  }

  if (type === "moveCore") {
    const playerId = resolvePlayerId(next, action, context);
    const player = next.players?.[playerId];
    if (!player) return { match, notes: ["Jogador inválido para moveCore."], manualResolutionNeeded: true, executed: false };
    const count = Math.max(0, Number(action.count ?? action.amount ?? 1));
    const from = String(action.from || "reserve");
    const to = String(action.to || action.destination || "trash");
    if (from === "reserve" && to === "trash") {
      const moved = Math.min(count, Number(player.reserve || 0));
      next = { ...next, players: { ...next.players, [playerId]: { ...player, reserve: Number(player.reserve || 0) - moved, trashCores: Number(player.trashCores || 0) + moved } } };
      return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: moved };
    }
    if (from === "trash" && to === "reserve") {
      const moved = Math.min(count, Number(player.trashCores || 0));
      next = { ...next, players: { ...next.players, [playerId]: { ...player, trashCores: Number(player.trashCores || 0) - moved, reserve: Number(player.reserve || 0) + moved } } };
      return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: moved };
    }
    return { match, notes: ["moveCore route is not structured for this source/destination yet."], manualResolutionNeeded: true, executed: false };
  }

  if (type === "moveCoreToLife") {
    const configuredCount = Math.max(1, Number(action.count ?? action.amount ?? 1));
    const targetAction = action.target || action.selector ? action : { ...action, target: "source" };
    return applyToTargets(next, targetAction, cardIndex, context, (working, target) => {
      const current = findPhysicalCard(working, target?.physical?.instanceId);
      const playerId = target?.playerId || current?.playerId || context.sourcePlayerId;
      let player = working.players?.[playerId];
      if (!player) return working;
      let moved = 0;
      if (current && ["spirits", "nexuses", "other"].includes(current.zone)) {
        const available = Number(current.card.cores?.regular || 0);
        moved = Math.min(configuredCount, available);
        if (moved > 0) player = updateFieldCard(player, current.card.instanceId, (physical) => ({ ...physical, cores: { ...physical.cores, regular: Math.max(0, Number(physical.cores?.regular || 0) - moved) } }));
      } else if (context.sourcePhysical?.instanceId === target?.physical?.instanceId) {
        const originallyAvailable = Number(context.sourcePhysical?.cores?.regular || 0);
        moved = Math.min(configuredCount, originallyAvailable, Number(player.reserve || 0));
        if (moved > 0) player = { ...player, reserve: Number(player.reserve || 0) - moved };
      }
      if (moved <= 0) return working;
      player = { ...player, life: Number(player.life || 0) + moved };
      return { ...working, players: { ...working.players, [playerId]: player } };
    });
  }

  if (type === "moveCoreSelectedToSource") {
    const selected = context.selectedTargets?.[0];
    const source = context.sourceInstanceId ? findPhysicalCard(next, context.sourceInstanceId) : null;
    if (!selected?.physical?.instanceId || !source || selected.playerId !== source.playerId) {
      return { match: next, notes: ["Origem/alvo inválidos para mover Core entre cartas."], manualResolutionNeeded: true, executed: false };
    }
    const from = findPhysicalCard(next, selected.physical.instanceId);
    if (!from || !["spirits", "other"].includes(from.zone) || !["spirits", "other"].includes(source.zone)) {
      return { match: next, notes: ["As cartas precisam estar no campo para mover Core."], manualResolutionNeeded: true, executed: false };
    }
    const amount = Math.max(1, Number(action.amount ?? action.count ?? 1));
    const availableRegular = Number(from.card.cores?.regular || 0);
    const moved = Math.min(amount, availableRegular);
    if (moved <= 0) return { match: next, notes: ["A carta escolhida não possui Core regular disponível."], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    let player = next.players[from.playerId];
    player = updateFieldCard(player, from.card.instanceId, (physical) => ({
      ...physical, cores: { ...physical.cores, regular: Number(physical.cores?.regular || 0) - moved }
    }));
    player = updateFieldCard(player, source.card.instanceId, (physical) => ({
      ...physical, cores: { ...physical.cores, regular: Number(physical.cores?.regular || 0) + moved }
    }));
    next = { ...next, players: { ...next.players, [from.playerId]: player } };
    return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: moved };
  }

  if (type === "payAccelCost") {
    const playerId = context.sourcePlayerId;
    const sourceCard = context.sourceCard;
    if (!playerId || !sourceCard) return { match: next, notes: ["Fonte inválida para pagamento de Accel."], manualResolutionNeeded: true, executed: false };
    const accelCard = { ...sourceCard, cost: Math.max(0, Number(action.cost ?? sourceCard.cost ?? 0)), reduction: Array.isArray(action.reduction) ? action.reduction : (sourceCard.reduction || []) };
    const payable = calculateReduction(next, playerId, accelCard, cardIndex).payable;
    if (payable <= 0) {
      const nested = asActionArray(action.actions ?? action.then ?? action.onPaid);
      return nested.length ? resolveNested(next, nested, cardIndex, context) : { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    }
    const payment = autoBuildPayment(next, playerId, payable, cardIndex);
    if (!payment) return { match: next, notes: ["Cores insuficientes para pagar o custo de Accel."], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    const paid = payCoreCost(next, playerId, payment, payable, cardIndex);
    if (!paid.ok) return { match: next, notes: [paid.error || "Falha ao pagar o custo de Accel."], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    const nested = asActionArray(action.actions ?? action.then ?? action.onPaid);
    if (nested.length) {
      const resolved = resolveNested(paid.match, nested, cardIndex, context);
      return { ...resolved, executed: true, affectedCount: Number(resolved.affectedCount || 0) + payable };
    }
    return { match: paid.match, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: payable };
  }

  if (type === "paySourceCost") {
    const playerId = context.sourcePlayerId;
    const card = context.sourceCard;
    if (!playerId || !card) return { match: next, notes: ["Fonte inválida para pagamento de custo."], manualResolutionNeeded: true, executed: false };
    const payable = calculateReduction(next, playerId, card, cardIndex).payable;
    if (payable <= 0) return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    const payment = autoBuildPayment(next, playerId, payable, cardIndex);
    if (!payment) return { match: next, notes: ["Cores insuficientes para pagar o custo opcional."], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    const paid = payCoreCost(next, playerId, payment, payable, cardIndex);
    if (!paid.ok) return { match: next, notes: [paid.error || "Falha ao pagar o custo opcional."], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    const nested = asActionArray(action.actions ?? action.then ?? action.onPaid);
    if (nested.length) {
      const resolved = resolveNested(paid.match, nested, cardIndex, context);
      return { ...resolved, executed: true, affectedCount: Number(resolved.affectedCount || 0) + payable };
    }
    return { match: paid.match, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: payable };
  }

  if (type === "adjustLife" || type === "healLife") {
    const playerId = resolvePlayerId(next, action, context);
    const player = next.players?.[playerId];
    if (!player) return { match, notes: ["Jogador alvo inválido para Life."], manualResolutionNeeded: true, executed: false };
    let configuredLifeAmount = Number(action.amount ?? action.count ?? 1);
    if (action.countFromSourceSymbols === true && context.sourcePhysical) configuredLifeAmount = getEffectiveSymbols(next, cardIndex, context.sourcePhysical).length;
    const delta = type === "healLife" ? Math.abs(configuredLifeAmount) : Number(action.delta ?? action.amount ?? 0);
    const oldLife = Number(player.life || 0);
    const life = Math.max(0, oldLife + delta);
    const actualLoss = delta < 0 ? Math.min(-delta, oldLife) : 0;
    next = { ...next, players: { ...next.players, [playerId]: { ...player, life, reserve: Number(player.reserve || 0) + actualLoss } } };
    if (life <= 0) next = { ...next, winnerId: otherPlayerId(next, playerId), winnerReason: "life" };
    return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: Math.abs(delta) };
  }


  if (type === "dealLifeDamage" || type === "moveLifeToReserve") {
    const playerId = resolvePlayerId(next, action, context);
    const player = next.players?.[playerId];
    if (!player) return { match, notes: ["Jogador alvo inválido para Life damage."], manualResolutionNeeded: true, executed: false };
    if (context.sourcePlayerId !== playerId && getContinuousPlayerNumericModifier(next, playerId, "opponentEffectLifeDamageBlocked") > 0) {
      return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    }
    if (String(context.sourceCard?.cardType || "").toLowerCase() === "spirit" && context.sourcePlayerId !== playerId && getContinuousPlayerNumericModifier(next, playerId, "opponentSpiritEffectLifeDamageBlocked") > 0) {
      return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    }
    const rawRequested = Math.max(0, Number(action.amount ?? action.count ?? 1));
    const capped = capUltimateEffectLifeLoss(next, playerId, rawRequested, context);
    const moved = Math.min(capped.requested, Number(player.life || 0));
    const life = Math.max(0, Number(player.life || 0) - moved);
    next = { ...next, players: { ...next.players, [playerId]: { ...player, life, reserve: Number(player.reserve || 0) + moved } } };
    next = recordTurnProtectionUsage(next, playerId, capped.type, moved);
    if (life <= 0 && moved > 0) next = { ...next, winnerId: otherPlayerId(next, playerId), winnerReason: "life" };
    return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: moved };
  }

  if (type === "moveLifeToTrash") {
    const playerId = resolvePlayerId(next, action, context);
    const player = next.players?.[playerId];
    if (!player) return { match, notes: ["Jogador alvo inválido para mover Life ao Trash."], manualResolutionNeeded: true, executed: false };
    const rawRequested = Math.max(0, Number(action.amount ?? action.count ?? 1));
    const capped = capUltimateEffectLifeLoss(next, playerId, rawRequested, context);
    const moved = Math.min(capped.requested, Number(player.life || 0));
    const life = Math.max(0, Number(player.life || 0) - moved);
    next = {
      ...next,
      players: {
        ...next.players,
        [playerId]: { ...player, life, trashCores: Number(player.trashCores || 0) + moved }
      }
    };
    next = recordTurnProtectionUsage(next, playerId, capped.type, moved);
    if (life <= 0 && moved > 0) next = { ...next, winnerId: otherPlayerId(next, playerId), winnerReason: "life" };
    return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: moved };
  }

  if (type === "negateUltimateTrigger") {
    if (!next.battle?.ultimateTrigger) {
      return { match: next, notes: ["Não existe Ultimate/XU Trigger ativo para anular."], manualResolutionNeeded: true, executed: false };
    }
    const trigger = next.battle.ultimateTrigger;
    next = {
      ...next,
      battle: {
        ...next.battle,
        ultimateTrigger: {
          ...trigger,
          originalHit: Boolean(trigger.originalHit ?? trigger.hit),
          hit: false,
          countered: true
        }
      }
    };
    return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 1 };
  }

  if (type === "returnAllTrashMatchingToHand") {
    const selector = typeof action.selector === "object" && action.selector ? action.selector : {};
    const targets = collectTrashTargets(next, cardIndex, { ...selector, owner: selector.owner ?? action.owner ?? "self" }, context);
    for (const target of targets) next = moveTargetOut(next, target, "hand", cardIndex, context);
    return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: targets.length };
  }


  if (["addModifier", "modifyCost", "modifySymbols", "gainKeyword", "loseKeyword"].includes(type)) {
    let descriptor = action.modifier || action;
    if (descriptor?.selector?.instanceIdFromContext) {
      const dynamicId = valueFromContext(context, descriptor.selector.instanceIdFromContext, null);
      descriptor = { ...descriptor, selector: { ...descriptor.selector, instanceIdFromContext: undefined, instanceId: dynamicId } };
    }
    if (descriptor.valueFromPlayerLifeMultiplier != null) {
      const playerId = resolvePlayerId(next, descriptor, context);
      descriptor = { ...descriptor, value: Number(next.players?.[playerId]?.life || 0) * Number(descriptor.valueFromPlayerLifeMultiplier || 0) };
    }
    if (descriptor.valueFromSelectorCount && typeof descriptor.valueFromSelectorCount === "object") {
      const count = collectTargets(next, cardIndex, descriptor.valueFromSelectorCount, context).length;
      if (descriptor.repeatValue != null) descriptor = { ...descriptor, value: Array.from({ length: count }, () => descriptor.repeatValue) };
      else descriptor = { ...descriptor, value: count * Number(descriptor.valueMultiplier ?? 1) };
    }
    if (descriptor.valueFromSelectorFamilies && typeof descriptor.valueFromSelectorFamilies === "object") {
      const families = collectTargets(next, cardIndex, descriptor.valueFromSelectorFamilies, context)
        .flatMap((target) => getEffectiveFamilies(next, cardIndex, target.physical));
      descriptor = { ...descriptor, value: [...new Set(families)] };
    }
    if (descriptor?.selector?.selectedTargets === true && Array.isArray(context.selectedTargets)) {
      let working = next;
      let count = 0;
      for (const selected of context.selectedTargets) {
        const instanceId = selected?.physical?.instanceId;
        if (!instanceId) continue;
        const perTarget = { ...descriptor, selector: { ...descriptor.selector, selectedTargets: undefined, instanceId } };
        const registered = registerContinuousModifier(working, perTarget, context);
        if (registered.modifier) { working = registered.match; count += 1; }
      }
      return { match: working, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: count };
    }
    if (descriptor?.selector?.selectedTarget === true && Array.isArray(context.selectedTargets) && context.selectedTargets[0]?.physical?.instanceId) {
      descriptor = { ...descriptor, selector: { ...descriptor.selector, selectedTarget: undefined, instanceId: context.selectedTargets[0].physical.instanceId } };
    }
    if (type === "modifyCost") descriptor = { ...descriptor, property: "cost", value: Number(action.amount ?? action.value ?? 0), operation: action.operation || "add" };
    if (type === "modifySymbols") descriptor = { ...descriptor, property: "symbols", value: action.symbols ?? action.value ?? [], operation: action.operation || "add" };
    if (type === "gainKeyword") descriptor = { ...descriptor, property: "keywords", value: action.keyword ?? action.keywords ?? action.value ?? [], operation: "add" };
    if (type === "loseKeyword") descriptor = { ...descriptor, property: "keywords", value: action.keyword ?? action.keywords ?? action.value ?? [], operation: "remove" };
    const registered = registerContinuousModifier(next, descriptor, context);
    if (!registered.modifier) return { match, notes: ["Modifier without property."], manualResolutionNeeded: true, executed: false };
    return { match: registered.match, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 1 };
  }

  if (type === "removeModifier") {
    const modifierId = action.modifierId || action.id;
    const sourceEffectId = action.sourceEffectId || context.effectId;
    const updated = removeContinuousModifiers(next, (modifier) => {
      if (modifierId) return modifier.id === modifierId;
      if (sourceEffectId) return modifier.sourceEffectId === sourceEffectId;
      return false;
    });
    return { match: updated, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 1 };
  }

  if ([
    "modifyBP", "refresh", "exhaust", "destroy", "returnToHand", "returnToTopDeck",
    "destroyAllMatching", "refreshAllMatching", "exhaustAllMatching", "returnAllMatchingToHand"
  ].includes(type)) {
    const allType = ["destroyAllMatching", "refreshAllMatching", "exhaustAllMatching", "returnAllMatchingToHand"].includes(type);
    const baseType = type === "destroyAllMatching" ? "destroy"
      : type === "refreshAllMatching" ? "refresh"
      : type === "exhaustAllMatching" ? "exhaust"
      : type === "returnAllMatchingToHand" ? "returnToHand"
      : type;
    const targetAction = allType ? { ...action, all: true } : action;

    return applyToTargets(next, targetAction, cardIndex, context, (working, target) => {
      if (baseType === "modifyBP") {
        let amount = Number(action.amount ?? action.value ?? action.bp ?? 0);
        if (action.amountPerMatching != null && action.countSelector) {
          const matches = collectTargets(working, cardIndex, action.countSelector, context);
          amount = Number(action.amountPerMatching || 0) * matches.length;
        }
        if (action.amountPerSourceCore != null && context.sourcePhysical) {
          const sourceCores = Number(context.sourcePhysical.cores?.regular || 0) + (context.sourcePhysical.cores?.soul ? 1 : 0);
          amount = Number(action.amountPerSourceCore || 0) * sourceCores;
        }
        if (action.amountPerPlayerLife != null) {
          const playerId = resolvePlayerId(working, { ...action, player: action.lifePlayer || action.player || "self" }, context);
          amount = Number(action.amountPerPlayerLife || 0) * Number(working.players?.[playerId]?.life || 0);
        }
        if (action.amountFromSelectedBP === true) {
          const selected = Array.isArray(context.selectedTargets) ? context.selectedTargets[0] : null;
          const selectedPhysical = selected?.physical || null;
          amount = selectedPhysical ? getEffectiveBP(working, cardIndex, selectedPhysical) : 0;
        }
        if (action.amountPerBattleOpponentSymbol != null) {
          const battle = working.battle || {};
          const sourceId = context.sourceInstanceId || null;
          const eventId = context.eventSourceInstanceId || null;
          let opponentId = null;
          if (sourceId && sourceId === battle.attackerInstanceId) opponentId = battle.blockerInstanceId || null;
          else if (sourceId && sourceId === battle.blockerInstanceId) opponentId = battle.attackerInstanceId || null;
          else if (eventId && eventId === battle.attackerInstanceId) opponentId = battle.blockerInstanceId || null;
          else if (eventId && eventId === battle.blockerInstanceId) opponentId = battle.attackerInstanceId || null;
          const opponent = opponentId ? findPhysicalCard(working, opponentId) : null;
          const symbols = opponent ? getEffectiveSymbols(working, cardIndex, opponent.card).length : 0;
          amount = Number(action.amountPerBattleOpponentSymbol || 0) * symbols;
        }
        if (String(rawAction.type || "").replace(/[\s_-]+/g, "").toLowerCase() === "reducebp") amount = -Math.abs(amount);
        const current = findPhysicalCard(working, target.physical.instanceId);
        if (!current) return working;
        const beforeBP = getEffectiveBP(working, cardIndex, current.card);
        if (action.setTo != null) amount = Number(action.setTo) - beforeBP;
        if (action.setToLevel != null) {
          const targetCard = getDatabaseCard(cardIndex, current.card);
          const level = (targetCard?.levels || []).find((entry) => Number(entry.level) === Number(action.setToLevel));
          if (level) amount = Number(level.bp || 0) - beforeBP;
        }
        if (amount < 0 && context.sourcePlayerId && current.playerId !== context.sourcePlayerId && String(target.card?.cardType || "").toLowerCase() === "spirit") {
          amount -= Math.max(0, fieldModifierTotal(working, cardIndex, context.sourcePlayerId, "bpReductionBonus"));
        }
        const player = updateFieldCard(working.players[current.playerId], current.card.instanceId, (physical) => addBPModifier(
          physical,
          amount,
          action.duration,
          { battleId: working.battle?.id || null, sourceEffectId: context.effectId || null }
        ));
        let updated = { ...working, players: { ...working.players, [current.playerId]: player } };
        const afterCtx = findPhysicalCard(updated, current.card.instanceId);
        const afterBP = afterCtx ? getEffectiveBP(updated, cardIndex, afterCtx.card) : beforeBP;
        if (beforeBP > 0 && afterBP <= 0 && afterCtx) {
          const seen = Boolean(updated.temporary?.bpZeroSeen?.[current.card.instanceId]);
          updated = {
            ...updated,
            temporary: {
              ...(updated.temporary || {}),
              bpZeroSeen: { ...(updated.temporary?.bpZeroSeen || {}), [current.card.instanceId]: true }
            }
          };
          updated = queueDeferredCanonicalEvent(updated, {
            event: "bpBecameZero",
            sourcePlayerId: current.playerId,
            sourceInstanceId: current.card.instanceId,
            sourcePhysical: afterCtx.card,
            sourceCardId: target.card?.id || afterCtx.card?.cardId || null,
            eventPlayerId: current.playerId,
            context: {
              zeroedInstanceId: current.card.instanceId,
              zeroedCardId: target.card?.id || afterCtx.card?.cardId || null,
              zeroedPlayerId: current.playerId,
              zeroedCardType: target.card?.cardType || null,
              zeroedByPlayerId: context.sourcePlayerId || null,
              zeroedByInstanceId: context.sourceInstanceId || null,
              zeroedByCardId: context.sourceCard?.id || null,
              firstTimeThisTurn: !seen,
              battleId: updated.battle?.id || context.battleId || null
            }
          });
          const reactingPlayerId = otherPlayerId(updated, current.playerId);
          if (reactingPlayerId && getContinuousPlayerNumericModifier(updated, reactingPlayerId, "zeroBPExhaustAllZeroBP") > 0) {
            const zeroSpirits = collectTargets(updated, cardIndex, { owner: "any", zones: ["field"], cardTypes: ["spirit"], maximumBP: 0 }, { ...context, sourcePlayerId: reactingPlayerId });
            for (const zero of zeroSpirits) {
              const zeroCurrent = findPhysicalCard(updated, zero.physical.instanceId);
              if (!zeroCurrent) continue;
              const zeroPlayer = updateFieldCard(updated.players[zeroCurrent.playerId], zeroCurrent.card.instanceId, (physical) => ({ ...physical, exhausted: true }));
              updated = { ...updated, players: { ...updated.players, [zeroCurrent.playerId]: zeroPlayer } };
            }
          }
        }
        return updated;
      }
      if (baseType === "refresh" || baseType === "exhaust") {
        const current = findPhysicalCard(working, target.physical.instanceId);
        if (!current) return working;
        const wasExhausted = Boolean(current.card.exhausted);
        const player = updateFieldCard(working.players[current.playerId], current.card.instanceId, (physical) => ({ ...physical, exhausted: baseType === "exhaust" }));
        let updated = { ...working, players: { ...working.players, [current.playerId]: player } };
        if (baseType === "exhaust" && !wasExhausted) {
          updated = queueDeferredCanonicalEvent(updated, {
            event: "cardExhausted",
            sourcePlayerId: current.playerId,
            sourceInstanceId: current.card.instanceId,
            sourceCardId: target.card?.id || current.card.cardId || null,
            eventPlayerId: current.playerId,
            context: { exhaustedInstanceId: current.card.instanceId, exhaustedCardId: target.card?.id || current.card.cardId || null, exhaustedByPlayerId: context.sourcePlayerId || null, exhaustedByInstanceId: context.sourceInstanceId || null }
          });
        }
        if (baseType === "refresh" && wasExhausted) {
          updated = queueDeferredCanonicalEvent(updated, {
            event: "cardRefreshed",
            sourcePlayerId: current.playerId,
            sourceInstanceId: current.card.instanceId,
            sourceCardId: target.card?.id || current.card.cardId || null,
            eventPlayerId: current.playerId,
            context: {
              refreshedInstanceId: current.card.instanceId,
              refreshedCardId: target.card?.id || current.card.cardId || null,
              refreshedByPlayerId: context.sourcePlayerId || null,
              refreshedByInstanceId: context.sourceInstanceId || null,
              refreshedByCardType: context.sourceCard?.cardType || null
            }
          });
        }
        return updated;
      }
      if (baseType === "destroy") {
        const current = findPhysicalCard(working, target.physical.instanceId);
        if (current && current.playerId !== context.sourcePlayerId && getContinuousNumericModifier(working, cardIndex, current.card, "effectDestructionImmune", 0) > 0) {
          return working;
        }
        const destroyedPhysical = target.physical;
        const destroyedCard = target.card;
        const destroyedPlayerId = target.playerId;
        let moved = moveTargetOut(working, target, "trash", cardIndex, context);
        moved = queueDeferredCanonicalEvent(moved, {
          event: "whenDestroyed",
          sourcePlayerId: destroyedPlayerId,
          sourcePhysical: destroyedPhysical,
          sourceCardId: destroyedCard?.id || destroyedPhysical?.cardId || null,
          eventPlayerId: destroyedPlayerId,
          context: {
            cause: "effect",
            destroyedByPlayerId: context.sourcePlayerId || null,
            destroyedByCardType: context.sourceCard?.cardType || null,
            destroyedByCardId: context.sourceCard?.id || null,
            destroyedByInstanceId: context.sourceInstanceId || null
          }
        });
        if (["spirit", "ultimate"].includes(String(destroyedCard?.cardType || "").toLowerCase()) && context.sourcePlayerId && context.sourcePlayerId !== destroyedPlayerId) {
          moved = openBurstOpportunityForEvent(moved, BurstEvent.OWN_SPIRIT_DESTROYED, destroyedPlayerId, cardIndex, {
            sourcePlayerId: context.sourcePlayerId,
            sourceInstanceId: context.sourceInstanceId || null,
            cause: "effectDestruction"
          });
        }
        return moved;
      }
      if (baseType === "returnToHand") return moveTargetOut(working, target, "hand", cardIndex, context);
      if (baseType === "returnToTopDeck") return moveTargetOut(working, target, "topDeck", cardIndex, context);
      return working;
    });
  }

  if (type === "setTurnProtection") {
    const protection = typeof action.protection === "object" && action.protection ? action.protection : null;
    if (!protection?.type) {
      return { match: next, notes: ["Proteção de turno sem tipo estruturado."], manualResolutionNeeded: true, executed: false };
    }
    const playerId = resolvePlayerId(next, action, context);
    if (!next.players?.[playerId]) {
      return { match: next, notes: ["Jogador inválido para proteção de turno."], manualResolutionNeeded: true, executed: false };
    }
    const current = next.temporary?.turnProtections?.[playerId] || {};
    let normalized = protection;
    if (protection.type === "blockSpiritAttackLifeDamageFromInstanceIds") {
      const selectedIds = Array.isArray(context.selectedTargets) ? context.selectedTargets.map((entry) => entry?.physical?.instanceId).filter(Boolean) : [];
      normalized = { ...protection, instanceIds: [...new Set([...(protection.instanceIds || []), ...selectedIds])] };
    }
    if (["limitSpiritAttackLifeDamage", "limitUltimateEffectLifeDamage"].includes(protection.type)) {
      normalized = {
        type: protection.type,
        maxDamage: Math.max(0, Number(protection.maxDamage ?? 1)),
        sourceInstanceId: protection.sourceInstanceId || context.sourceInstanceId || null
      };
    }
    next = {
      ...next,
      temporary: {
        ...(next.temporary || {}),
        turnProtections: {
          ...(next.temporary?.turnProtections || {}),
          [playerId]: {
            ...current,
            [normalized.type]: normalized
          }
        }
      }
    };
    return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 1 };
  }

  if (type === "discardOpponentSetBurst") {
    const playerId = otherPlayerId(next, context.sourcePlayerId);
    const player = next.players?.[playerId];
    if (!player) {
      return { match: next, notes: ["Oponente inválido para descartar Burst."], manualResolutionNeeded: true, executed: false };
    }
    if (!player.burst) {
      return { match: next, notes: ["O oponente não possui Burst setada."], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    }
    const discarded = cleanPhysical({ ...player.burst, faceDown: false, hidden: false });
    next = {
      ...next,
      players: {
        ...next.players,
        [playerId]: {
          ...player,
          burst: null,
          trash: [...player.trash, discarded]
        }
      }
    };
    if (next.burstOpportunity?.playerId === playerId) next = { ...next, burstOpportunity: null };
    return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 1 };
  }

  if (type === "topDeckToTrash" || type === "revealTop") {
    const playerId = resolvePlayerId(next, action, context);
    let player = next.players?.[playerId];
    if (!player) return { match, notes: ["Jogador alvo inválido para o deck."], manualResolutionNeeded: true, executed: false };
    const selectorCount = action.countFromSelector && typeof action.countFromSelector === "object"
      ? collectTargets(next, cardIndex, action.countFromSelector, context).length
      : null;
    let requested = selectorCount != null
      ? selectorCount * Number(action.countMultiplier ?? action.amountPerMatching ?? 1)
      : Number(action.count ?? action.amount ?? 1);
    if (action.maxCount != null) requested = Math.min(requested, Number(action.maxCount));
    if (type === "topDeckToTrash") {
      const cap = getContinuousPlayerNumericModifier(next, playerId, "maxDeckDiscardPerTurn");
      if (cap > 0) {
        const used = Number(next.temporary?.deckDiscardedByEffect?.[playerId] || 0);
        requested = Math.min(requested, Math.max(0, cap - used));
      }
    }
    const count = Math.max(0, Number(requested));
    const deck = [...player.deck];
    const moved = [];
    for (let i = 0; i < count && deck.length; i += 1) moved.push(deck.shift());
    if (type === "topDeckToTrash") player = { ...player, deck, trash: [...player.trash, ...moved] };
    else player = { ...player, deck, revealed: [...(player.revealed || []), ...moved] };
    next = { ...next, players: { ...next.players, [playerId]: player } };
    if (type === "topDeckToTrash" && moved.length) {
      next = {
        ...next,
        temporary: {
          ...(next.temporary || {}),
          deckDiscardedByEffect: {
            ...(next.temporary?.deckDiscardedByEffect || {}),
            [playerId]: Number(next.temporary?.deckDiscardedByEffect?.[playerId] || 0) + moved.length
          }
        }
      };
      const movedCards = moved.map((physical) => getDatabaseCard(cardIndex, physical)).filter(Boolean);
      const requiredFamily = action.onMovedFamily || action.ifMovedFamily || null;
      const nested = asActionArray(action.onMovedFamilyActions ?? action.thenIfMovedFamily);
      if (requiredFamily && nested.length && movedCards.some((card) => (card.families || []).includes(requiredFamily))) {
        const resolved = resolveNested(next, nested, cardIndex, { ...context, movedCards, movedCardIds: movedCards.map((card) => card.id) });
        return { ...resolved, executed: true, affectedCount: Number(resolved.affectedCount || 0) + moved.length };
      }
    }
    return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: moved.length };
  }

  if (type === "conditional") {
    const condition = action.condition ?? action.if ?? null;
    const branch = conditionMatchesEffect(next, condition, context, cardIndex)
      ? (action.then ?? action.actions ?? action.onTrue ?? [])
      : (action.else ?? action.onFalse ?? []);
    return resolveNested(next, asActionArray(branch), cardIndex, context);
  }

  if (type === "performSpecifiedAttack") {
    const target = context.selectedTargets?.[0] || null;
    const battle = next.battle;
    if (!battle || !target?.physical?.instanceId) {
      return { match: next, notes: ["Specified attack requires an active battle and a selected opposing Spirit/Ultimate."], manualResolutionNeeded: true, executed: false };
    }
    if (target.playerId !== battle.defenderPlayerId) {
      return { match: next, notes: ["Specified attack target must belong to the defending player."], manualResolutionNeeded: true, executed: false };
    }
    const targetCard = getDatabaseCard(cardIndex, target.physical);
    if (!["spirit", "ultimate"].includes(String(targetCard?.cardType || "").toLowerCase())) {
      return { match: next, notes: ["Specified attack target must be a Spirit or Ultimate."], manualResolutionNeeded: true, executed: false };
    }

    let defender = next.players[battle.defenderPlayerId];
    defender = updateFieldCard(defender, target.physical.instanceId, (physical) => ({ ...physical, exhausted: true }));
    next = {
      ...next,
      players: { ...next.players, [battle.defenderPlayerId]: defender },
      battle: {
        ...battle,
        blockerInstanceId: target.physical.instanceId,
        stage: "flash2",
        flash: { number: 2, priorityPlayerId: battle.defenderPlayerId, consecutivePasses: 0 },
        restrictions: { ...(battle.restrictions || {}), specifiedAttack: true, specifiedBlockerInstanceId: target.physical.instanceId }
      }
    };

    const battleContext = {
      battleId: battle.id,
      attackerPlayerId: battle.attackerPlayerId,
      defenderPlayerId: battle.defenderPlayerId,
      attackerInstanceId: battle.attackerInstanceId,
      blockerInstanceId: target.physical.instanceId,
      directAttack: false,
      blocked: true,
      specifiedAttack: true
    };
    next = queueDeferredCanonicalEvent(next, {
      event: "whenBlocks",
      sourcePlayerId: battle.defenderPlayerId,
      sourceInstanceId: target.physical.instanceId,
      eventPlayerId: battle.defenderPlayerId,
      context: battleContext
    });
    next = queueDeferredCanonicalEvent(next, {
      event: "whenBlocked",
      sourcePlayerId: battle.attackerPlayerId,
      sourceInstanceId: battle.attackerInstanceId,
      eventPlayerId: battle.attackerPlayerId,
      context: battleContext
    });
    next = queueDeferredCanonicalEvent(next, {
      event: "whenBattles",
      sourcePlayerId: battle.attackerPlayerId,
      sourceInstanceId: battle.attackerInstanceId,
      eventPlayerId: battle.attackerPlayerId,
      context: battleContext
    });
    next = queueDeferredCanonicalEvent(next, {
      event: "whenBattles",
      sourcePlayerId: battle.defenderPlayerId,
      sourceInstanceId: target.physical.instanceId,
      eventPlayerId: battle.defenderPlayerId,
      context: battleContext
    });
    return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 1 };
  }

  if (type === "setBattleRestriction") {
    if (!next.battle) {
      return { match: next, notes: ["Não existe batalha ativa para aplicar a restrição."], manualResolutionNeeded: true, executed: false };
    }

    const rawType = String(rawAction.type || "").replace(/[\s_-]+/g, "").toLowerCase();
    const restriction = {
      ...(typeof action.restriction === "object" && action.restriction ? action.restriction : {}),
      ...(typeof action.value === "object" && action.value ? action.value : {})
    };

    if (["preventspiritblock", "cannotbeblockedbyspirits"].includes(rawType)) {
      restriction.spiritsCannotBlock = true;
    }
    if (rawType === "cannotbeblockedbylowerlevel") {
      const level = Number(context.sourceCard && context.sourcePhysical
        ? context.sourceCard.levels?.filter((entry) => Number(entry.cores) <= (Number(context.sourcePhysical.cores?.regular || 0) + (context.sourcePhysical.cores?.soul ? 1 : 0))).sort((a, b) => Number(a.level) - Number(b.level)).at(-1)?.level || 0
        : 0);
      restriction.minimumBlockerLevel = level;
    }
    if (action.spiritsCannotBlock != null) restriction.spiritsCannotBlock = Boolean(action.spiritsCannotBlock);
    if (action.ultimatesCannotBlock != null) restriction.ultimatesCannotBlock = Boolean(action.ultimatesCannotBlock);
    if (action.mustBlockIfAble != null) restriction.mustBlockIfAble = Boolean(action.mustBlockIfAble);
    if (action.preventOpponentBurst === true) restriction.burstBlockedPlayerId = otherPlayerId(next, context.sourcePlayerId);
    if (action.minimumBlockerLevel != null) restriction.minimumBlockerLevel = Number(action.minimumBlockerLevel);

    if (!Object.keys(restriction).length) {
      return { match: next, notes: ["Restrição de batalha sem dados estruturados."], manualResolutionNeeded: true, executed: false };
    }

    next = {
      ...next,
      battle: {
        ...next.battle,
        restrictions: {
          ...(next.battle.restrictions || {}),
          ...restriction
        }
      }
    };
    return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 1 };
  }

  if (["chooseCardsFromHand", "chooseCardsFromTrash", "chooseCardsFromDeck"].includes(type)) {
    const zone = type === "chooseCardsFromHand" ? "hand" : type === "chooseCardsFromTrash" ? "trash" : "deck";
    const selector = { ...(action.selector || action.target || {}), zones: [zone] };
    const selectionAction = {
      ...action,
      type: "selectMultipleTargets",
      selector,
      minTargets: action.minTargets ?? action.minimum ?? (action.allowZero ? 0 : 1),
      maxTargets: action.maxTargets ?? action.maximum ?? action.count ?? action.amount ?? 1
    };
    const resolvedTargets = resolveActionTargets(next, selectionAction, cardIndex, context);
    if (resolvedTargets.status === "manual") {
      return {
        match,
        notes: [resolvedTargets.reason],
        manualResolutionNeeded: true,
        executed: false,
        decision: { ...decisionFromTargets(next, action, resolvedTargets, context, cardIndex), kind: type, action }
      };
    }
    if (resolvedTargets.status === "none") return { match, notes: ["Nenhuma carta válida encontrada para a escolha."], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    const selectedContext = { ...context, selectedTargets: resolvedTargets.targets, selectionResolved: true };
    const main = asActionArray(action.onSelect ?? action.onConfirm ?? action.actions ?? action.then);
    return main.length
      ? resolveNested(next, main, cardIndex, selectedContext)
      : { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: resolvedTargets.targets.length };
  }

  if (type === "chooseOrder") {
    const selector = action.selector || action.target || { owner: "self", zones: ["field"] };
    const candidates = collectTargets(next, cardIndex, selector, context);
    if (candidates.length <= 1) {
      const orderedContext = { ...context, selectedTargets: candidates, orderedTargets: candidates, selectionResolved: true };
      const main = asActionArray(action.onConfirm ?? action.actions ?? action.then);
      return main.length ? resolveNested(next, main, cardIndex, orderedContext) : { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: candidates.length };
    }
    return {
      match,
      notes: ["Escolha a ordem de resolução das cartas."],
      manualResolutionNeeded: true,
      executed: false,
      decision: decisionFromOrder(action, context, candidates)
    };
  }

  if (type === "chooseCoreDistribution") {
    const selector = action.selector || action.target || { owner: "self", zones: ["field"] };
    const candidates = collectTargets(next, cardIndex, selector, context);
    const amount = Math.max(0, Number(action.amount ?? action.count ?? action.totalCores ?? 0));
    if (!candidates.length || amount === 0) {
      const main = asActionArray(action.onConfirm ?? action.actions ?? action.then);
      const emptyContext = { ...context, coreDistribution: {}, selectedTargets: [], selectionResolved: true };
      return main.length ? resolveNested(next, main, cardIndex, emptyContext) : { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: 0 };
    }
    return {
      match,
      notes: ["Distribuição de Cores aguardando escolha do jogador."],
      manualResolutionNeeded: true,
      executed: false,
      decision: decisionFromCoreDistribution(action, context, candidates)
    };
  }

  if (["selectTarget", "selectTrashTarget", "selectMultipleTargets"].includes(type)) {
    const resolvedTargets = resolveActionTargets(next, action, cardIndex, context);
    if (resolvedTargets.status === "manual") {
      return {
        match,
        notes: [resolvedTargets.reason],
        manualResolutionNeeded: true,
        executed: false,
        decision: decisionFromTargets(next, action, resolvedTargets, context, cardIndex)
      };
    }
    if (resolvedTargets.status === "none") return { match, notes: ["Nenhum alvo válido encontrado."], manualResolutionNeeded: false, executed: true, affectedCount: 0 };

    const main = asActionArray(action.onSelect ?? action.onConfirm ?? action.actions ?? action.then);
    const selectedContext = { ...context, selectedTargets: resolvedTargets.targets, selectionResolved: true };
    let result = main.length
      ? resolveNested(next, main, cardIndex, selectedContext)
      : { match: next, notes: ["Seleção de alvo sem ação estruturada."], manualResolutionNeeded: true, executed: false, affectedCount: 0 };

    const after = asActionArray(action.afterSelect ?? action.afterConfirm);
    if (after.length && !result.manualResolutionNeeded) result = mergeResults(result, resolveNested(result.match, after, cardIndex, selectedContext));
    const afterIfAny = asActionArray(action.afterIfAny);
    if (afterIfAny.length && resolvedTargets.targets.length > 0 && !result.manualResolutionNeeded) {
      result = mergeResults(result, resolveNested(result.match, afterIfAny, cardIndex, selectedContext));
    }
    return result;
  }

  if (type === "chooseYesNo") {
    return {
      match,
      notes: ["Escolha Sim/Não necessária."],
      manualResolutionNeeded: true,
      executed: false,
      decision: decisionFromYesNo(action, context)
    };
  }

  if (type === "chooseOption") {
    const options = Array.isArray(action.options) ? action.options : [];
    if (!options.length) return { match, notes: ["Escolha de efeito sem opções estruturadas."], manualResolutionNeeded: true, executed: false };
    if (options.length > 1) {
      return {
        match,
        notes: ["Escolha manual entre opções de efeito necessária."],
        manualResolutionNeeded: true,
        executed: false,
        decision: decisionFromOptions(action, context)
      };
    }
    return resolveNested(next, asActionArray(options[0].actions), cardIndex, context);
  }

  return { match, notes: [`Operação manual necessária: ${type}`], manualResolutionNeeded: true, executed: false };
}

export function resolveActionList(match, actions = [], cardIndex, context = {}) {
  let result = { match, notes: [], manualResolutionNeeded: false, executed: false, affectedCount: 0, decision: null };
  const list = Array.isArray(actions) ? actions : [];

  for (let index = 0; index < list.length; index += 1) {
    const action = list[index];
    const current = resolveAction(result.match, action, cardIndex, context, resolveActionList);
    result = mergeResults(result, current);
    result.match = pruneContinuousModifiers(result.match);

    if (current.manualResolutionNeeded) {
      if (current.decision) {
        current.decision.context = current.decision.context || context;
        current.decision.continuationActions = [
          ...(current.decision.continuationActions || []),
          ...list.slice(index + 1)
        ];
        result.decision = current.decision;
      }
      break;
    }
  }

  return result;
}
