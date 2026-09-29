import { findPhysicalCard, getDatabaseCard } from "../selectors.js";
import { removeFieldCard, updateFieldCard } from "../zones.js";
import { otherPlayerId } from "../utils.js";
import { calculateReduction, autoBuildPayment } from "../cost.js";
import { payCoreCost } from "../cores.js";
import { conditionMatchesEffect } from "./conditionResolver.js";
import {
  addBPModifier,
  pruneContinuousModifiers,
  registerContinuousModifier,
  removeContinuousModifiers
} from "./modifierResolver.js";
import { canonicalActionType, supportsCoreActionType } from "./coreActionLibrary.js";
import { collectTargets, collectTrashTargets, resolveActionTargets } from "./targetResolver.js";
import { preventReplacementEvent, replaceCurrentEvent } from "./replacementState.js";

export function supportsActionType(type) {
  return supportsCoreActionType(type);
}

function queueDeferredCanonicalEvent(match, event) {
  if (!event) return match;
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

function minimumCores(card) {
  const levels = (card?.levels || []).map((level) => Number(level.cores)).filter(Number.isFinite);
  if (!levels.length) return ["spirit", "ultimate", "brave"].includes(card?.cardType) ? 1 : 0;
  return Math.min(...levels);
}

function detachAttachedBrave(match, playerId, hostInstanceId, cardIndex) {
  let player = match.players[playerId];
  const attached = (player.field?.other || []).find((physical) => physical.combinedWith === hostInstanceId);
  if (!attached) return match;
  const braveCard = getDatabaseCard(cardIndex, attached);
  const min = minimumCores(braveCard);
  if (min <= Number(player.reserve || 0)) {
    player = { ...player, reserve: Number(player.reserve || 0) - min };
    player = updateFieldCard(player, attached.instanceId, (physical) => ({
      ...physical,
      combinedWith: null,
      cores: { regular: min, soul: false }
    }));
  } else {
    const removed = removeFieldCard(player, attached.instanceId);
    if (removed.card) player = { ...removed.player, trash: [...removed.player.trash, cleanPhysical(removed.card)] };
  }
  return { ...match, players: { ...match.players, [playerId]: player } };
}

function moveTargetOut(match, target, destination, cardIndex) {
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
    return next;
  }

  if (current.zone === "trash" && destination === "hand") {
    const player = match.players[current.playerId];
    const trash = [...player.trash];
    const index = trash.findIndex((card) => card.instanceId === instanceId);
    if (index < 0) return match;
    const [card] = trash.splice(index, 1);
    return {
      ...match,
      players: {
        ...match.players,
        [current.playerId]: { ...player, trash, hand: [...player.hand, cleanPhysical(card)] }
      }
    };
  }

  return match;
}


function removeFromSimpleZone(player, zone, instanceId) {
  if (!["hand", "trash", "revealed", "deck"].includes(zone)) return { player, card: null };
  const list = [...(player[zone] || [])];
  const index = list.findIndex((card) => card.instanceId === instanceId);
  if (index < 0) return { player, card: null };
  const [card] = list.splice(index, 1);
  return { player: { ...player, [zone]: list }, card };
}

function moveCardGeneric(match, target, destination, cardIndex) {
  const instanceId = target?.physical?.instanceId;
  if (!instanceId) return match;
  const current = findPhysicalCard(match, instanceId);
  if (!current) return match;
  if (["spirits", "nexuses", "other"].includes(current.zone) && ["hand", "trash", "topDeck"].includes(destination)) {
    return moveTargetOut(match, target, destination, cardIndex);
  }
  if (current.zone === "trash" && destination === "hand") return moveTargetOut(match, target, destination, cardIndex);
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
  else if (destination === "removed") player = { ...player, removed: [...(player.removed || []), removedCard] };
  else return match;

  return { ...match, players: { ...match.players, [current.playerId]: player } };
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

function decisionFromTargets(match, action, resolvedTargets, context) {
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
    maxTotalBP: action.maxTotalBP != null ? Number(action.maxTotalBP) : null,
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
      decision: decisionFromTargets(match, action, resolved, context)
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
    return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: drew };
  }


  if (type === "discard") {
    return applyToTargets(next, { ...action, selector: action.selector || action.target || { owner: "self", zones: ["hand"] } }, cardIndex, context, (working, target) => moveCardGeneric(working, target, "trash", cardIndex));
  }

  if (["moveCard", "returnToDeck", "returnToBottomDeck"].includes(type)) {
    const destination = type === "returnToBottomDeck" ? "bottomDeck"
      : type === "returnToDeck" ? (action.position === "top" ? "topDeck" : action.position === "bottom" ? "bottomDeck" : "deck")
      : String(action.destination || action.to || "");
    if (!destination) return { match, notes: ["moveCard requires a destination."], manualResolutionNeeded: true, executed: false };
    return applyToTargets(next, action, cardIndex, context, (working, target) => moveCardGeneric(working, target, destination, cardIndex));
  }

  if (type === "addCoreToReserveFromVoid") {
    const playerId = resolvePlayerId(next, action, context);
    const player = next.players?.[playerId];
    if (!player) return { match, notes: ["Jogador alvo inválido para Core do Void."], manualResolutionNeeded: true, executed: false };
    const count = Math.max(0, Number(action.count ?? action.amount ?? 1));
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
        : { ...updated, reserve: Number(updated.reserve || 0) + moved };
      return { ...working, players: { ...working.players, [current.playerId]: withDestination } };
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
    const delta = type === "healLife" ? Math.abs(Number(action.amount ?? action.count ?? 1)) : Number(action.delta ?? action.amount ?? 0);
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
    for (const target of targets) next = moveTargetOut(next, target, "hand", cardIndex);
    return { match: next, notes: [], manualResolutionNeeded: false, executed: true, affectedCount: targets.length };
  }


  if (["addModifier", "modifyCost", "modifySymbols", "gainKeyword", "loseKeyword"].includes(type)) {
    let descriptor = action.modifier || action;
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
        if (String(rawAction.type || "").replace(/[\s_-]+/g, "").toLowerCase() === "reducebp") amount = -Math.abs(amount);
        const current = findPhysicalCard(working, target.physical.instanceId);
        if (!current) return working;
        const player = updateFieldCard(working.players[current.playerId], current.card.instanceId, (physical) => addBPModifier(
          physical,
          amount,
          action.duration,
          { battleId: working.battle?.id || null, sourceEffectId: context.effectId || null }
        ));
        return { ...working, players: { ...working.players, [current.playerId]: player } };
      }
      if (baseType === "refresh" || baseType === "exhaust") {
        const current = findPhysicalCard(working, target.physical.instanceId);
        if (!current) return working;
        const player = updateFieldCard(working.players[current.playerId], current.card.instanceId, (physical) => ({ ...physical, exhausted: baseType === "exhaust" }));
        return { ...working, players: { ...working.players, [current.playerId]: player } };
      }
      if (baseType === "destroy") {
        const destroyedPhysical = target.physical;
        const destroyedCard = target.card;
        const destroyedPlayerId = target.playerId;
        let moved = moveTargetOut(working, target, "trash", cardIndex);
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
        return moved;
      }
      if (baseType === "returnToHand") return moveTargetOut(working, target, "hand", cardIndex);
      if (baseType === "returnToTopDeck") return moveTargetOut(working, target, "topDeck", cardIndex);
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
    const count = Math.max(1, Number(action.count ?? action.amount ?? 1));
    const deck = [...player.deck];
    const moved = [];
    for (let i = 0; i < count && deck.length; i += 1) moved.push(deck.shift());
    if (type === "topDeckToTrash") player = { ...player, deck, trash: [...player.trash, ...moved] };
    else player = { ...player, deck, revealed: [...(player.revealed || []), ...moved] };
    next = { ...next, players: { ...next.players, [playerId]: player } };
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
        decision: { ...decisionFromTargets(next, action, resolvedTargets, context), kind: type, action }
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
        decision: decisionFromTargets(next, action, resolvedTargets, context)
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
