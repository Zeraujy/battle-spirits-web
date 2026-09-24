import { findPhysicalCard, getBraveAttachment, getDatabaseCard, getEffectiveBP } from "../selectors.js";
import { appendLog, uid } from "../utils.js";
import { entryConditionsMatch } from "./conditionResolver.js";
import { getEntryActions, getTriggeredEntries, normalizeEventName } from "./normalizer.js";
import { resolveActionList } from "./actionResolver.js";

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
    const queued = appendContinuationEvents(
      match,
      [serializeEventInput(input)]
    );
    return {
      match: queued,
      triggered: 0,
      automatic: 0,
      manualResolutionNeeded: true,
      pendingEffectDecision: queued.pendingEffectDecision,
      notes: ["Evento de efeito colocado na fila após a decisão atual."]
    };
  }

  const context = sourceContext(match, cardIndex, input);
  if (!context.sourceCard || !context.sourcePlayerId || !context.event) {
    return { match, triggered: 0, automatic: 0, manualResolutionNeeded: false, notes: [] };
  }

  const triggered = getTriggeredEntries(context.sourceCard, context.event);
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

  if (pending.kind === "chooseOption") {
    const optionId = String(payload.optionId ?? "");
    const option = (pending.action?.options || []).find((item, index) => String(item.id ?? index) === optionId);
    if (!option) return { ok: false, error: "Opção de efeito inválida." };
    firstActions = Array.isArray(option.actions) ? option.actions : [];
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
      if (totalBP > Number(pending.maxTotalBP)) {
        return { ok: false, error: `O total de BP selecionado excede ${pending.maxTotalBP}.` };
      }
    }

    const action = pending.action || {};
    const isSelectionWrapper = ["selectTarget", "selectTrashTarget", "selectMultipleTargets"].includes(action.type);
    const main = isSelectionWrapper
      ? (action.onSelect ?? action.onConfirm ?? action.actions ?? action.then ?? [])
      : [{ ...action, target: "selected", selector: undefined, targets: undefined }];
    firstActions = Array.isArray(main) ? main : [main];
  }

  let next = { ...match, pendingEffectDecision: null };
  const batches = [];

  if (pending.kind === "chooseOption") {
    if (firstActions.length) batches.push({ actions: firstActions, context: baseContext });
  } else {
    const selectedContext = {
      ...baseContext,
      selectedTargets,
      selectionResolved: true
    };
    if (firstActions.length) batches.push({ actions: firstActions, context: selectedContext });

    const after = pending.action?.afterSelect ?? pending.action?.afterConfirm ?? [];
    const afterActions = Array.isArray(after) ? after : [after];
    if (afterActions.length) batches.push({ actions: afterActions, context: selectedContext });

    const afterIfAny = pending.action?.afterIfAny ?? [];
    const afterIfAnyActions = Array.isArray(afterIfAny) ? afterIfAny : [afterIfAny];
    if (selectedTargets.length > 0 && afterIfAnyActions.length) {
      batches.push({ actions: afterIfAnyActions, context: selectedContext });
    }
  }

  if ((pending.continuationActions || []).length) {
    batches.push({ actions: pending.continuationActions, context: baseContext });
  }
  batches.push(...(pending.continuationBatches || []));

  const result = runBatches(next, batches, cardIndex);
  next = result.match;

  const queuedEvents = pending.continuationEvents || [];
  if (next.pendingEffectDecision) {
    next = appendContinuationEvents(next, queuedEvents);
  } else {
    for (let index = 0; index < queuedEvents.length; index += 1) {
      const eventResult = resolveCardEvent(next, queuedEvents[index], cardIndex);
      next = eventResult.match;
      if (next.pendingEffectDecision) {
        next = appendContinuationEvents(next, queuedEvents.slice(index + 1));
        break;
      }
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
