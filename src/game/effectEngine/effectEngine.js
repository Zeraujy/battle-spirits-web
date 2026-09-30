import { findPhysicalCard, getBraveAttachment, getDatabaseCard, getEffectiveBP } from "../selectors.js";
import { appendLog, uid } from "../utils.js";
import { updateFieldCard } from "../zones.js";
import { entryConditionsMatch } from "./conditionResolver.js";
import { entryMatchesTriggerContext, getEntryActions, getTriggeredEntries, normalizeEventName } from "./normalizer.js";
import { resolveActionList } from "./actionResolver.js";
import { drainEffectQueue, enqueueEffectEvents, markEffectQueueWaiting } from "./effectQueue.js";
import { finalizePendingMagicResolution } from "./magicAutomation.js";
import { applyTriggerGroupOrder, nextAmbiguousTriggerGroup, orderedTriggerDispatches, resolveAutomaticTriggerGroups, triggerOrderDecision } from "./triggerOrderingEngine.js";
import { dispatchEffectEvent } from "./triggerDispatcher.js";

function sourceContext(match, cardIndex, input = {}) {
  const found = input.sourceInstanceId ? findPhysicalCard(match, input.sourceInstanceId) : null;
  const sourcePhysical = input.sourcePhysical || found?.card || input.context?.sourcePhysical || null;
  const sourcePlayerId = input.sourcePlayerId || found?.playerId || input.context?.sourcePlayerId || null;
  const sourceCard = input.sourceCard || input.context?.sourceCard || (sourcePhysical ? getDatabaseCard(cardIndex, sourcePhysical) : (input.sourceCardId ? cardIndex.get(input.sourceCardId) : null));
  const sourceInstanceId = input.sourceInstanceId || sourcePhysical?.instanceId || input.context?.sourceInstanceId || null;
  const combinedBrave = sourceInstanceId ? getBraveAttachment(match, sourceInstanceId) : null;
  return {
    ...(input.context || {}),
    event: normalizeEventName(input.event || input.context?.event),
    sourcePlayerId,
    sourceInstanceId,
    sourcePhysical,
    sourceCard,
    sourceZone: found?.zone || input.sourceZone || input.context?.sourceZone || null,
    combinedBrave
  };
}

function makePendingDecision(decision = {}) {
  return {
    id: uid("effect-decision"),
    kind: decision.kind,
    playerId: decision.playerId || decision.context?.sourcePlayerId || null,
    action: decision.action || null,
    context: decision.context || {},
    candidates: decision.candidates || [],
    options: decision.options || [],
    minimum: Number(decision.minimum ?? 1),
    maximum: Number(decision.maximum ?? 1),
    allowZero: Boolean(decision.allowZero),
    maxTotalBP: decision.maxTotalBP == null ? null : Number(decision.maxTotalBP),
    titlePT: decision.titlePT || null,
    titleEN: decision.titleEN || null,
    instructionPT: decision.instructionPT || null,
    instructionEN: decision.instructionEN || null,
    totalCores: decision.totalCores == null ? null : Number(decision.totalCores),
    exactTotal: decision.exactTotal !== false,
    sourceCoreZone: decision.sourceCoreZone || null,
    continuationActions: decision.continuationActions || [],
    continuationBatches: decision.continuationBatches || [],
    continuationEvents: decision.continuationEvents || []
  };
}

function attachDecision(match, decision, extraBatches = []) {
  if (!decision) return match;
  const pending = makePendingDecision({
    ...decision,
    continuationBatches: [
      ...(decision.continuationBatches || []),
      ...(extraBatches || [])
    ]
  });
  return { ...match, pendingEffectDecision: pending };
}

function targetFromId(match, cardIndex, instanceId) {
  const found = findPhysicalCard(match, instanceId);
  if (!found) return null;
  return {
    playerId: found.playerId,
    zone: found.zone,
    physical: found.card,
    card: getDatabaseCard(cardIndex, found.card)
  };
}

function pendingContext(match, cardIndex, pending) {
  return sourceContext(match, cardIndex, {
    event: pending.context?.event,
    sourcePlayerId: pending.context?.sourcePlayerId || pending.playerId,
    sourceInstanceId: pending.context?.sourceInstanceId,
    sourcePhysical: pending.context?.sourcePhysical,
    sourceCard: pending.context?.sourceCard,
    sourceCardId: pending.context?.sourceCard?.id || pending.context?.sourcePhysical?.cardId,
    sourceZone: pending.context?.sourceZone,
    context: pending.context || {}
  });
}

function runBatches(match, batches, cardIndex) {
  let next = match;
  const notes = [];
  let executed = false;

  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index];
    if (!batch?.actions?.length) continue;
    const result = resolveActionList(next, batch.actions, cardIndex, batch.context || {});
    next = result.match;
    notes.push(...(result.notes || []));
    executed = executed || Boolean(result.executed);

    if (result.decision) {
      const remainingBatches = batches.slice(index + 1);
      const decision = {
        ...result.decision,
        continuationBatches: [
          ...(result.decision.continuationBatches || []),
          ...remainingBatches
        ]
      };
      return {
        match: attachDecision(next, decision),
        notes,
        executed,
        manualResolutionNeeded: true
      };
    }

    if (result.manualResolutionNeeded) {
      return {
        match: next,
        notes,
        executed,
        manualResolutionNeeded: true
      };
    }
  }

  return { match: next, notes, executed, manualResolutionNeeded: false };
}

function serializeEventInput(input = {}) {
  return {
    event: input.event || input.context?.event || null,
    sourcePlayerId: input.sourcePlayerId || input.context?.sourcePlayerId || null,
    sourceInstanceId: input.sourceInstanceId || input.context?.sourceInstanceId || null,
    sourcePhysical: input.sourcePhysical || input.context?.sourcePhysical || null,
    sourceCardId: input.sourceCardId || input.sourceCard?.id || input.context?.sourceCard?.id || null,
    sourceZone: input.sourceZone || input.context?.sourceZone || null,
    dispatchMode: input.dispatchMode || null,
    context: input.context || {}
  };
}

function appendContinuationEvents(match, events = []) {
  if (!match.pendingEffectDecision || !events.length) return match;
  return {
    ...match,
    pendingEffectDecision: {
      ...match.pendingEffectDecision,
      continuationEvents: [
        ...(match.pendingEffectDecision.continuationEvents || []),
        ...events
      ]
    }
  };
}

export function resolveOperations(match, sourcePlayerId, operations = [], cardIndex, context = {}) {
  const fullContext = sourceContext(match, cardIndex, { ...context, sourcePlayerId });
  const result = resolveActionList(match, operations, cardIndex, fullContext);
  if (result.decision) result.match = attachDecision(result.match, result.decision);
  return result;
}

export function resolveCardEvent(match, input = {}, cardIndex) {
  if (match.pendingEffectDecision) {
    let queued = markEffectQueueWaiting(enqueueEffectEvents(match, [serializeEventInput(input)]).match);
    const compatibilityEvents = (queued.effectQueue?.items || []).map((item) => item.payload).filter(Boolean);
    queued = {
      ...queued,
      pendingEffectDecision: {
        ...queued.pendingEffectDecision,
        continuationEvents: compatibilityEvents
      }
    };
    return {
      match: queued,
      triggered: 0,
      automatic: 0,
      manualResolutionNeeded: true,
      pendingEffectDecision: queued.pendingEffectDecision,
      notes: ["Evento de efeito colocado na Effect Queue após a decisão atual."]
    };
  }

  const context = sourceContext(match, cardIndex, input);
  if (!context.sourceCard || !context.sourcePlayerId || !context.event) {
    return { match, triggered: 0, automatic: 0, manualResolutionNeeded: false, notes: [] };
  }

  const triggered = getTriggeredEntries(context.sourceCard, context.event, { dispatchMode: input.dispatchMode || "any" })
    .filter(({ entry }) => entryMatchesTriggerContext(entry, context, match));
  let next = match;
  let automatic = 0;
  let manualResolutionNeeded = false;
  const notes = [];

  const applicable = triggered.filter(({ entry }) => entryConditionsMatch(next, entry, context, cardIndex));
  const structured = applicable.filter(({ entry }) => getEntryActions(entry).length > 0);
  const displayOnly = applicable.filter(({ entry, source }) => source === "effects" && getEntryActions(entry).length === 0);
  const unresolvedDisplayCount = Math.max(0, displayOnly.length - structured.length);
  if (unresolvedDisplayCount > 0) {
    manualResolutionNeeded = true;
    notes.push(`${unresolvedDisplayCount} efeito(s) de ${context.event} ainda não possuem operações estruturadas.`);
  }

  for (let index = 0; index < structured.length; index += 1) {
    const { entry } = structured[index];
    const actions = getEntryActions(entry);
    const entryContext = { ...context, effectId: entry.id || null };
    const resolved = resolveActionList(next, actions, cardIndex, entryContext);
    next = resolved.match;
    if (resolved.executed) automatic += 1;
    notes.push(...resolved.notes);

    if (resolved.decision) {
      const remainingEntries = structured.slice(index + 1).map(({ entry: laterEntry }) => ({
        actions: getEntryActions(laterEntry),
        context: { ...context, effectId: laterEntry.id || null }
      }));
      next = attachDecision(next, resolved.decision, remainingEntries);
      manualResolutionNeeded = true;
      break;
    }

    if (resolved.manualResolutionNeeded) {
      manualResolutionNeeded = true;
      break;
    }
  }

  if (automatic > 0) {
    const name = context.sourceCard.namePT || context.sourceCard.nameEN || context.sourceCard.id;
    next = appendLog(next, `${name}: ${automatic} efeito(s) resolvido(s) automaticamente em ${context.event}.`, "effect");
  }

  return {
    match: next,
    triggered: triggered.length,
    automatic,
    manualResolutionNeeded,
    pendingEffectDecision: next.pendingEffectDecision || null,
    notes
  };
}

export function resolveEffectDecision(match, actorId, payload = {}, cardIndex) {
  const pending = match.pendingEffectDecision;
  if (!pending) return { ok: false, error: "Não existe decisão de efeito pendente." };
  if (pending.playerId !== actorId) return { ok: false, error: "Esta decisão pertence ao outro jogador." };

  const baseContext = pendingContext(match, cardIndex, pending);
  let selectedTargets = [];
  let firstActions = [];
  let decisionContext = baseContext;
  let next = { ...match, pendingEffectDecision: null };

  if (pending.kind === "chooseTriggerOrder") {
    const batch = match.triggerBatch;
    const ids = Array.isArray(payload.orderedTriggerIds) ? payload.orderedTriggerIds.map(String) : [];
    let updatedBatch = applyTriggerGroupOrder(batch, pending.playerId, ids);
    if (!updatedBatch) return { ok: false, error: "A ordem escolhida precisa conter todos os gatilhos válidos exatamente uma vez." };
    updatedBatch = resolveAutomaticTriggerGroups(updatedBatch);
    const nextGroup = nextAmbiguousTriggerGroup(updatedBatch);
    if (nextGroup) {
      const decision = triggerOrderDecision(updatedBatch, nextGroup);
      return {
        ok: true,
        match: { ...match, triggerBatch: updatedBatch, pendingEffectDecision: decision },
        manualResolutionNeeded: true,
        pendingEffectDecision: decision,
        notes: ["Próximo controlador deve ordenar seus gatilhos simultâneos."]
      };
    }
    next = { ...match, pendingEffectDecision: null, triggerBatch: null };
    const dispatches = orderedTriggerDispatches(updatedBatch);
    if (dispatches.length) next = enqueueEffectEvents(next, dispatches).match;
    next = drainEffectQueue(next, (working, item) => resolveCardEvent(working, item.payload, cardIndex)).match;
    if (!next.pendingEffectDecision && next.pendingMagicResolution) {
      next = finalizePendingMagicResolution(next, cardIndex);
      while (!next.pendingEffectDecision && Array.isArray(next.deferredCanonicalEvents) && next.deferredCanonicalEvents.length) {
        const [deferred, ...rest] = next.deferredCanonicalEvents;
        next = { ...next, deferredCanonicalEvents: rest };
        next = dispatchEffectEvent(next, deferred, cardIndex).match;
      }
    }
    return {
      ok: true,
      match: next,
      manualResolutionNeeded: Boolean(next.pendingEffectDecision),
      pendingEffectDecision: next.pendingEffectDecision || null,
      notes: []
    };
  } else if (["chooseOption", "chooseYesNo"].includes(pending.kind)) {
    const optionId = String(payload.optionId ?? "");
    const option = (pending.action?.options || []).find((item, index) => String(item.id ?? index) === optionId);
    if (!option) return { ok: false, error: "Opção de efeito inválida." };
    firstActions = Array.isArray(option.actions) ? option.actions : [];
    decisionContext = { ...baseContext, chosenOptionId: optionId, chosenOption: option };
  } else if (pending.kind === "chooseOrder") {
    const ids = Array.isArray(payload.orderedInstanceIds) ? payload.orderedInstanceIds.map(String) : [];
    const allowed = (pending.candidates || []).map((candidate) => String(candidate.instanceId));
    if (ids.length !== allowed.length || new Set(ids).size !== allowed.length || ids.some((id) => !allowed.includes(id))) {
      return { ok: false, error: "A ordem escolhida precisa conter todas as cartas válidas exatamente uma vez." };
    }
    selectedTargets = ids.map((id) => targetFromId(match, cardIndex, id)).filter(Boolean);
    if (selectedTargets.length !== ids.length) return { ok: false, error: "Uma das cartas da ordem não está mais disponível." };
    decisionContext = { ...baseContext, selectedTargets, orderedTargets: selectedTargets, selectionResolved: true };
    const main = pending.action?.onConfirm ?? pending.action?.actions ?? pending.action?.then ?? [];
    firstActions = Array.isArray(main) ? main : [main];
  } else if (pending.kind === "chooseCoreDistribution") {
    const raw = payload.coreDistribution && typeof payload.coreDistribution === "object" ? payload.coreDistribution : {};
    const allowed = new Set((pending.candidates || []).map((candidate) => String(candidate.instanceId)));
    const distribution = {};
    let total = 0;
    for (const [instanceId, rawAmount] of Object.entries(raw)) {
      if (!allowed.has(String(instanceId))) return { ok: false, error: "A distribuição contém um alvo inválido." };
      const amount = Math.max(0, Math.floor(Number(rawAmount || 0)));
      if (!Number.isFinite(amount)) return { ok: false, error: "Quantidade de Core inválida." };
      if (amount > 0) distribution[String(instanceId)] = amount;
      total += amount;
    }
    const required = Math.max(0, Number(pending.totalCores || 0));
    if (pending.exactTotal !== false && total !== required) return { ok: false, error: `Distribua exatamente ${required} Core(s).` };
    if (pending.exactTotal === false && total > required) return { ok: false, error: `Distribua no máximo ${required} Core(s).` };

    const sourceZone = pending.sourceCoreZone || "reserve";
    const player = next.players?.[actorId];
    if (!player) return { ok: false, error: "Jogador inválido para distribuição de Cores." };
    if (sourceZone === "reserve" && Number(player.reserve || 0) < total) return { ok: false, error: "Não há Cores suficientes na Reserva." };
    if (["trash", "coreTrash"].includes(sourceZone) && Number(player.trashCores || 0) < total) return { ok: false, error: "Não há Cores suficientes no Core Trash." };

    let updatedPlayer = { ...player };
    if (sourceZone === "reserve") updatedPlayer.reserve = Number(updatedPlayer.reserve || 0) - total;
    if (["trash", "coreTrash"].includes(sourceZone)) updatedPlayer.trashCores = Number(updatedPlayer.trashCores || 0) - total;
    next = { ...next, players: { ...next.players, [actorId]: updatedPlayer } };

    selectedTargets = [];
    for (const [instanceId, amount] of Object.entries(distribution)) {
      const target = targetFromId(next, cardIndex, instanceId);
      if (!target || !["spirits", "nexuses", "other"].includes(target.zone)) return { ok: false, error: "Um dos alvos da distribuição não está mais no campo." };
      const owner = next.players[target.playerId];
      const withCore = updateFieldCard(owner, instanceId, (physical) => ({
        ...physical,
        cores: { ...physical.cores, regular: Number(physical.cores?.regular || 0) + amount }
      }));
      next = { ...next, players: { ...next.players, [target.playerId]: withCore } };
      selectedTargets.push(targetFromId(next, cardIndex, instanceId));
    }
    decisionContext = { ...baseContext, selectedTargets, coreDistribution: distribution, distributedCores: total, selectionResolved: true };
    const main = pending.action?.onConfirm ?? pending.action?.actions ?? pending.action?.then ?? [];
    firstActions = Array.isArray(main) ? main : [main];
  } else {
    const ids = Array.isArray(payload.selectedInstanceIds)
      ? [...new Set(payload.selectedInstanceIds.map(String))]
      : (payload.instanceId ? [String(payload.instanceId)] : []);

    const allowed = new Set((pending.candidates || []).map((candidate) => String(candidate.instanceId)));
    if (ids.some((id) => !allowed.has(id))) return { ok: false, error: "Um dos alvos escolhidos não é válido para este efeito." };
    if (ids.length < Number(pending.minimum || 0)) return { ok: false, error: `Escolha pelo menos ${pending.minimum} alvo(s).` };
    if (ids.length > Number(pending.maximum || 1)) return { ok: false, error: `Escolha no máximo ${pending.maximum} alvo(s).` };

    selectedTargets = ids.map((id) => targetFromId(match, cardIndex, id)).filter(Boolean);
    if (selectedTargets.length !== ids.length) return { ok: false, error: "Um dos alvos escolhidos não está mais disponível." };

    if (pending.maxTotalBP != null) {
      const totalBP = selectedTargets.reduce((sum, target) => {
        if (!["spirits", "nexuses", "other"].includes(target.zone)) return sum;
        return sum + Number(getEffectiveBP(match, cardIndex, target.physical) || 0);
      }, 0);
      if (totalBP > Number(pending.maxTotalBP)) return { ok: false, error: `O total de BP selecionado excede ${pending.maxTotalBP}.` };
    }

    const action = pending.action || {};
    const isSelectionWrapper = ["selectTarget", "selectTrashTarget", "selectMultipleTargets", "chooseCardsFromHand", "chooseCardsFromTrash", "chooseCardsFromDeck"].includes(action.type);
    const main = isSelectionWrapper
      ? (action.onSelect ?? action.onConfirm ?? action.actions ?? action.then ?? [])
      : [{ ...action, target: "selected", selector: undefined, targets: undefined }];
    firstActions = Array.isArray(main) ? main : [main];
    decisionContext = { ...baseContext, selectedTargets, selectionResolved: true };
  }

  const batches = [];
  if (firstActions.length) batches.push({ actions: firstActions, context: decisionContext });

  if (!["chooseOption", "chooseYesNo", "chooseOrder", "chooseCoreDistribution"].includes(pending.kind)) {
    const after = pending.action?.afterSelect ?? pending.action?.afterConfirm ?? [];
    const afterActions = Array.isArray(after) ? after : [after];
    if (afterActions.length) batches.push({ actions: afterActions, context: decisionContext });

    const afterIfAny = pending.action?.afterIfAny ?? [];
    const afterIfAnyActions = Array.isArray(afterIfAny) ? afterIfAny : [afterIfAny];
    if (selectedTargets.length > 0 && afterIfAnyActions.length) batches.push({ actions: afterIfAnyActions, context: decisionContext });
  }

  if ((pending.continuationActions || []).length) batches.push({ actions: pending.continuationActions, context: baseContext });
  batches.push(...(pending.continuationBatches || []));

  const result = runBatches(next, batches, cardIndex);
  next = result.match;

  const queuedEvents = pending.continuationEvents || [];
  const queueAlreadyHasEvents = Boolean(next.effectQueue?.items?.length);
  if (queuedEvents.length && !queueAlreadyHasEvents) next = enqueueEffectEvents(next, queuedEvents).match;

  // Content Migration Batch 04: actions completed through a player decision may
  // emit canonical events (for example, a destruction selected by the player).
  // Feed them back through the full dispatcher so battlefield observers and
  // trigger ordering behave exactly like automatic action resolution.
  const deferredEvents = Array.isArray(next.deferredCanonicalEvents) ? next.deferredCanonicalEvents : [];
  if (deferredEvents.length) {
    next = { ...next, deferredCanonicalEvents: [] };
    for (const deferred of deferredEvents) {
      const dispatched = dispatchEffectEvent(next, deferred, cardIndex);
      next = dispatched.match;
      if (next.pendingEffectDecision) break;
    }
  }

  if (next.pendingEffectDecision) next = markEffectQueueWaiting(next);
  else next = drainEffectQueue(next, (working, item) => resolveCardEvent(working, item.payload, cardIndex)).match;

  if (!next.pendingEffectDecision && next.pendingMagicResolution) {
      next = finalizePendingMagicResolution(next, cardIndex);
      while (!next.pendingEffectDecision && Array.isArray(next.deferredCanonicalEvents) && next.deferredCanonicalEvents.length) {
        const [deferred, ...rest] = next.deferredCanonicalEvents;
        next = { ...next, deferredCanonicalEvents: rest };
        next = dispatchEffectEvent(next, deferred, cardIndex).match;
      }
    }

  if (!next.pendingEffectDecision) {
    const sourceName = baseContext.sourceCard?.namePT || baseContext.sourceCard?.nameEN || baseContext.sourceCard?.id || "Efeito";
    next = appendLog(next, `${sourceName}: decisão de efeito resolvida.`, "effect");
  }

  return {
    ok: true,
    match: next,
    manualResolutionNeeded: Boolean(next.pendingEffectDecision || result.manualResolutionNeeded),
    pendingEffectDecision: next.pendingEffectDecision || null,
    notes: result.notes || []
  };
}
