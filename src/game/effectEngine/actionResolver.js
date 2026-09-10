import { findPhysicalCard, getDatabaseCard } from "../selectors.js";
import { removeFieldCard, updateFieldCard } from "../zones.js";
import { otherPlayerId } from "../utils.js";
import { conditionMatchesEffect } from "./conditionResolver.js";
import { addBPModifier } from "./modifierResolver.js";
import { resolveActionTargets } from "./targetResolver.js";

const ACTION_ALIASES = {
  modifybp: "modifyBP",
  temporarybp: "modifyBP",
  bpmodifier: "modifyBP",
  gainbp: "modifyBP",
  reducebp: "modifyBP",
  reservecorefromvoid: "addCoreToReserveFromVoid",
  voidtoreserve: "addCoreToReserveFromVoid",
  addcorefromvoid: "addCoreFromVoid",
  returnhand: "returnToHand",
  returntohand: "returnToHand",
  returnallmatchingtohand: "returnAllMatchingToHand",
  destroyallmatching: "destroyAllMatching",
  refreshallmatching: "refreshAllMatching",
  exhaustallmatching: "exhaustAllMatching",
  topdecktotrash: "topDeckToTrash",
  revealtop: "revealTop",
  adjustlife: "adjustLife",
  heallife: "healLife",
  selecttarget: "selectTarget",
  selecttrashtarget: "selectTrashTarget",
  selectmultipletargets: "selectMultipleTargets",
  chooseoption: "chooseOption",
  conditional: "conditional",
  setbattlerestriction: "setBattleRestriction",
  setbattleflag: "setBattleRestriction",
  preventspiritblock: "setBattleRestriction",
  cannotbeblockedbyspirits: "setBattleRestriction"
};

function canonicalType(type) {
  const raw = String(type || "").trim();
  const compact = raw.replace(/[\s_-]+/g, "").toLowerCase();
  return ACTION_ALIASES[compact] || raw;
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

function decisionCandidate(target) {
  return {
    instanceId: target?.physical?.instanceId || null,
    playerId: target?.playerId || null,
    zone: target?.zone || null,
    cardId: target?.physical?.cardId || target?.card?.id || null
  };
}

function decisionFromTargets(action, resolvedTargets, context) {
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
    kind: canonicalType(action.type) === "selectTrashTarget"
      ? "selectTrashTarget"
      : canonicalType(action.type) === "selectMultipleTargets" || Number(resolvedTargets.requested || 1) > 1
        ? "selectMultipleTargets"
        : "selectTarget",
    playerId: context.sourcePlayerId,
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

function applyToTargets(match, action, cardIndex, context, updater) {
  const resolved = resolveActionTargets(match, action, cardIndex, context);
  if (resolved.status === "manual") {
    return {
      match,
      notes: [resolved.reason],
      manualResolutionNeeded: true,
      executed: false,
      decision: decisionFromTargets(action, resolved, context)
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
  const type = canonicalType(rawAction.type);
  const action = { ...rawAction, type };
  let next = match;

  if (!type) return { match, notes: ["Operação sem tipo estruturado."], manualResolutionNeeded: true, executed: false };

  if (type === "draw") {
    const playerId = resolvePlayerId(next, action, context);
    let player = next.players?.[playerId];
    if (!player) return { match, notes: ["Jogador alvo inválido para draw."], manualResolutionNeeded: true, executed: false };
    const deck = [...player.deck];
    const hand = [...player.hand];
    const count = Math.max(0, Number(action.count ?? action.amount ?? 1));
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

  if ([
    "modifyBP", "refresh", "exhaust", "destroy", "returnToHand",
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
      if (baseType === "destroy") return moveTargetOut(working, target, "trash", cardIndex);
      if (baseType === "returnToHand") return moveTargetOut(working, target, "hand", cardIndex);
      return working;
    });
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
    if (action.spiritsCannotBlock != null) restriction.spiritsCannotBlock = Boolean(action.spiritsCannotBlock);
    if (action.ultimatesCannotBlock != null) restriction.ultimatesCannotBlock = Boolean(action.ultimatesCannotBlock);
    if (action.mustBlockIfAble != null) restriction.mustBlockIfAble = Boolean(action.mustBlockIfAble);

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

  if (["selectTarget", "selectTrashTarget", "selectMultipleTargets"].includes(type)) {
    const resolvedTargets = resolveActionTargets(next, action, cardIndex, context);
    if (resolvedTargets.status === "manual") {
      return {
        match,
        notes: [resolvedTargets.reason],
        manualResolutionNeeded: true,
        executed: false,
        decision: decisionFromTargets(action, resolvedTargets, context)
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
