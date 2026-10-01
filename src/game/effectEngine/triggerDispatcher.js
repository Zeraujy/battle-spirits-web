import { fieldCards, findPhysicalCard, getDatabaseCard } from "../selectors.js";
import { otherPlayerId } from "../utils.js";
import { resolveCardEvent } from "./effectEngine.js";
import { drainEffectQueue, enqueueEffectEvents } from "./effectQueue.js";
import {
  entryMatchesTriggerContext,
  getEntryTriggerScope,
  getTriggeredEntries
} from "./normalizer.js";
import { EffectTriggerScope, isEffectSchemaV2 } from "./effectSchema.js";
import { EffectEvent, compactEventName, normalizeCanonicalEvent } from "./canonicalEvents.js";
import { conditionMatchesEffect } from "./conditionEngine.js";
import { getContinuousNumericModifier, reconcileContinuousModifierConditions } from "./modifierResolver.js";
import { buildTriggerBatch, nextAmbiguousTriggerGroup, orderedTriggerDispatches, resolveAutomaticTriggerGroups, triggerOrderDecision } from "./triggerOrderingEngine.js";


const AMBIENT_LEGACY_EVENTS = new Set([
  EffectEvent.START_STEP,
  EffectEvent.CORE_STEP,
  EffectEvent.DRAW_STEP,
  EffectEvent.REFRESH_STEP,
  EffectEvent.MAIN_STEP,
  EffectEvent.ATTACK_STEP,
  EffectEvent.END_STEP,
  EffectEvent.LIFE_DECREASED
]);

function legacyAmbientRelationMatches(entry, controllerId, eventPlayerId) {
  const raw = compactEventName(entry?.event || entry?.timing || entry?.trigger?.event || entry?.type || "");
  if (!raw || !eventPlayerId) return true;
  if (raw.startsWith("your")) return controllerId === eventPlayerId;
  if (raw.startsWith("opponent")) return controllerId !== eventPlayerId;
  if (raw.startsWith("either")) return true;
  return controllerId === eventPlayerId;
}
function eventInput(input = {}) {
  const eventPlayerId = input.eventPlayerId || input.sourcePlayerId || input.context?.eventPlayerId || null;
  return {
    ...input,
    event: normalizeCanonicalEvent(input.event || input.context?.event),
    context: {
      ...(input.context || {}),
      eventPlayerId,
      eventSourcePlayerId: input.sourcePlayerId || input.context?.eventSourcePlayerId || null,
      eventSourceInstanceId: input.sourceInstanceId || input.context?.eventSourceInstanceId || null,
      eventSourceCardId: input.sourceCardId || input.sourceCard?.id || input.context?.eventSourceCardId || null
    }
  };
}

function sourceDispatchInput(input) {
  return {
    ...input,
    dispatchMode: "source"
  };
}

function observerDispatchInput(input, playerId, physical, dispatchMode = "observerV2") {
  return {
    event: input.event,
    sourcePlayerId: playerId,
    sourceInstanceId: physical.instanceId,
    sourcePhysical: physical,
    dispatchMode,
    context: {
      ...(input.context || {}),
      eventPlayerId: input.context?.eventPlayerId || null,
      eventSourcePlayerId: input.sourcePlayerId || input.context?.eventSourcePlayerId || null,
      eventSourceInstanceId: input.sourceInstanceId || input.context?.eventSourceInstanceId || null,
      eventSourceCardId: input.sourceCardId || input.sourceCard?.id || input.context?.eventSourceCardId || null
    }
  };
}


function sourceHasTriggeredEntries(match, input, cardIndex) {
  const found = input.sourceInstanceId ? findPhysicalCard(match, input.sourceInstanceId) : null;
  const physical = input.sourcePhysical || found?.card || null;
  const card = input.sourceCard || (physical ? getDatabaseCard(cardIndex, physical) : null) || (input.sourceCardId ? cardIndex.get(input.sourceCardId) : null);
  if (!card) return false;
  if (input.event === EffectEvent.WHEN_SUMMONED && Number(match.persistentEffects?.suppressWhenSummonedEndSteps?.[input.sourcePlayerId] || 0) > 0) return false;
  if (physical && getContinuousNumericModifier(match, cardIndex, physical, "effectsDisabled") > 0) return false;
  const context = {
    ...(input.context || {}),
    sourcePlayerId: input.sourcePlayerId || found?.playerId || input.context?.sourcePlayerId || null,
    sourceInstanceId: input.sourceInstanceId || physical?.instanceId || null,
    sourcePhysical: physical,
    sourceCard: card,
    eventPlayerId: input.context?.eventPlayerId || null
  };
  return getTriggeredEntries(card, input.event, { dispatchMode: "source" })
    .some(({ entry }) => entryMatchesTriggerContext(entry, context, match));
}

function sourceHasV2ContinuousEffect(match, input, cardIndex) {
  const found = input.sourceInstanceId ? findPhysicalCard(match, input.sourceInstanceId) : null;
  const physical = input.sourcePhysical || found?.card || null;
  const card = input.sourceCard || (physical ? getDatabaseCard(cardIndex, physical) : null) || (input.sourceCardId ? cardIndex.get(input.sourceCardId) : null);
  if (!card) return false;
  if (input.event === EffectEvent.WHEN_SUMMONED && Number(match.persistentEffects?.suppressWhenSummonedEndSteps?.[input.sourcePlayerId] || 0) > 0) return false;
  if (physical && getContinuousNumericModifier(match, cardIndex, physical, "effectsDisabled") > 0) return false;
  return getTriggeredEntries(card, "continuous", { dispatchMode: "source" })
    .some(({ entry }) => isEffectSchemaV2(entry));
}

function observerCandidates(match, input, cardIndex) {
  const out = [];
  const event = input.event;
  for (const [playerId, player] of Object.entries(match.players || {})) {
    for (const physical of fieldCards(player)) {
      const card = getDatabaseCard(cardIndex, physical);
      if (!card) continue;
      if (getContinuousNumericModifier(match, cardIndex, physical, "effectsDisabled") > 0) continue;
      const context = {
        ...(input.context || {}),
        sourcePlayerId: playerId,
        sourceInstanceId: physical.instanceId,
        sourcePhysical: physical,
        sourceCard: card,
        eventPlayerId: input.context?.eventPlayerId || null
      };
      const v2Entries = getTriggeredEntries(card, event, { dispatchMode: "observerV2" })
        .filter(({ entry }) => getEntryTriggerScope(entry) === EffectTriggerScope.CONTROLLER_FIELD)
        .filter(({ entry }) => entryMatchesTriggerContext(entry, context, match));
      if (v2Entries.length) {
        out.push(observerDispatchInput(input, playerId, physical, "observerV2"));
        continue;
      }

      // Step/phase events historically lived as source-style legacy entries even
      // though there is no source card for a phase transition. Phase 12 treats
      // these as ambient battlefield observations while preserving relationship
      // words such as your/opponent/either.
      if (AMBIENT_LEGACY_EVENTS.has(event)) {
        const legacyEntries = getTriggeredEntries(card, event, { dispatchMode: "observerLegacy" })
          .filter(({ entry }) => legacyAmbientRelationMatches(entry, playerId, input.context?.eventPlayerId || null));
        if (legacyEntries.length) out.push(observerDispatchInput(input, playerId, physical, "observerLegacy"));
      }
    }

    // Content Migration Batch 07: optional reactions that live in hand (for
    // example Brave cards that may be summoned after an Ultimate is summoned).
    // These remain explicit Schema v2 observers so legacy hand cards are not
    // scanned or executed accidentally.
    for (const physical of [...(player.hand || []), ...(player.openArea || [])]) {
      const card = getDatabaseCard(cardIndex, physical);
      if (!card) continue;
      const context = {
        ...(input.context || {}),
        sourcePlayerId: playerId,
        sourceInstanceId: physical.instanceId,
        sourcePhysical: physical,
        sourceCard: card,
        eventPlayerId: input.context?.eventPlayerId || null
      };
      const handEntries = getTriggeredEntries(card, event, { dispatchMode: "observerV2" })
        .filter(({ entry }) => getEntryTriggerScope(entry) === EffectTriggerScope.CONTROLLER_HAND)
        .filter(({ entry }) => entryMatchesTriggerContext(entry, context, match));
      if (handEntries.length) out.push(observerDispatchInput(input, playerId, physical, "observerV2"));
    }

    // Content Migration Batch 09: Schema v2 effects may remain active in the
    // controller's Trash (for example Immortality and End Step recovery).
    for (const physical of player.trash || []) {
      const card = getDatabaseCard(cardIndex, physical);
      if (!card) continue;
      const context = {
        ...(input.context || {}),
        sourcePlayerId: playerId,
        sourceInstanceId: physical.instanceId,
        sourcePhysical: physical,
        sourceCard: card,
        sourceZone: "trash",
        eventPlayerId: input.context?.eventPlayerId || null
      };
      const trashEntries = getTriggeredEntries(card, event, { dispatchMode: "observerV2" })
        .filter(({ entry }) => getEntryTriggerScope(entry) === EffectTriggerScope.CONTROLLER_TRASH)
        .filter(({ entry }) => entryMatchesTriggerContext(entry, context, match));
      if (trashEntries.length) out.push(observerDispatchInput(input, playerId, physical, "observerV2"));
    }
  }
  return out;
}

function reconcileModifierConditions(match, cardIndex) {
  return reconcileContinuousModifierConditions(match, (modifier) => {
    if (!modifier.condition) return true;
    const found = modifier.sourceInstanceId ? findPhysicalCard(match, modifier.sourceInstanceId) : null;
    if (!found) return false;
    const sourceCard = getDatabaseCard(cardIndex, found.card);
    if (!sourceCard) return false;
    return conditionMatchesEffect(match, modifier.condition, {
      sourcePlayerId: found.playerId,
      sourceInstanceId: found.card.instanceId,
      sourcePhysical: found.card,
      sourceCard,
      effectId: modifier.sourceEffectId || null
    }, cardIndex);
  });
}

function mergeResult(base, current) {
  return {
    match: current.match,
    triggered: Number(base.triggered || 0) + Number(current.triggered || 0),
    automatic: Number(base.automatic || 0) + Number(current.automatic || 0),
    manualResolutionNeeded: Boolean(base.manualResolutionNeeded || current.manualResolutionNeeded),
    pendingEffectDecision: current.match?.pendingEffectDecision || current.pendingEffectDecision || null,
    notes: [...(base.notes || []), ...(current.notes || [])],
    dispatchedSources: Number(base.dispatchedSources || 0) + 1
  };
}

/**
 * Central trigger entry point for gameplay events.
 *
 * Legacy entries keep source-only behavior. Effect Schema v2 entries may opt
 * into controllerField observation, allowing a card already on the battlefield
 * to react to an event generated by another card/player.
 */
export function dispatchEffectEvent(match, rawInput = {}, cardIndex) {
  match = reconcileModifierConditions(match, cardIndex);
  const input = eventInput(rawInput);
  if (!input.event) {
    return { match, triggered: 0, automatic: 0, manualResolutionNeeded: false, pendingEffectDecision: null, notes: [], dispatchedSources: 0 };
  }

  const dispatches = [];
  if (input.sourceInstanceId || input.sourcePhysical || input.sourceCardId || input.sourceCard) {
    if (sourceHasTriggeredEntries(match, input, cardIndex)) dispatches.push(sourceDispatchInput(input));
    if (["whenSummoned", "whenDeployed"].includes(input.event) && sourceHasV2ContinuousEffect(match, input, cardIndex)) {
      dispatches.push(sourceDispatchInput({
        ...input,
        event: "continuous",
        context: { ...(input.context || {}), activationEvent: input.event }
      }));
    }
  }
  dispatches.push(...observerCandidates(match, input, cardIndex));

  if (!dispatches.length) {
    return { match, triggered: 0, automatic: 0, manualResolutionNeeded: false, pendingEffectDecision: null, notes: [], dispatchedSources: 0 };
  }

  const triggerBatch = resolveAutomaticTriggerGroups(buildTriggerBatch(match, dispatches, cardIndex));
  const ambiguousGroup = nextAmbiguousTriggerGroup(triggerBatch);
  let queued;
  if (ambiguousGroup && !match.pendingEffectDecision) {
    queued = {
      ...match,
      triggerBatch,
      pendingEffectDecision: triggerOrderDecision(triggerBatch, ambiguousGroup)
    };
    return {
      match: queued,
      triggered: 0,
      automatic: 0,
      manualResolutionNeeded: true,
      pendingEffectDecision: queued.pendingEffectDecision,
      notes: ["Multiple simultaneous triggers are waiting for controller ordering."],
      dispatchedSources: 0
    };
  }

  const orderedDispatches = orderedTriggerDispatches(triggerBatch);
  queued = enqueueEffectEvents({ ...match, triggerBatch: null }, orderedDispatches).match;
  if (queued.pendingEffectDecision) {
    const compatibilityEvents = (queued.effectQueue?.items || []).map((item) => item.payload).filter(Boolean);
    queued = {
      ...queued,
      pendingEffectDecision: {
        ...queued.pendingEffectDecision,
        // Compatibility mirror. Effect Queue is the authoritative continuation store.
        continuationEvents: compatibilityEvents
      }
    };
    return {
      match: queued,
      triggered: 0,
      automatic: 0,
      manualResolutionNeeded: true,
      pendingEffectDecision: queued.pendingEffectDecision,
      notes: ["Trigger dispatch queued until the current effect decision is resolved."],
      dispatchedSources: 0
    };
  }

  const drained = drainEffectQueue(queued, (working, item) => resolveCardEvent(working, item.payload, cardIndex));
  let result = {
    match: drained.match,
    triggered: 0,
    automatic: 0,
    manualResolutionNeeded: Boolean(drained.match.pendingEffectDecision),
    pendingEffectDecision: drained.match.pendingEffectDecision || null,
    notes: [],
    dispatchedSources: 0
  };

  for (const entry of drained.results) {
    result = mergeResult(result, entry.result);
  }
  result.match = drained.match;
  if (drained.waiting && result.match.pendingEffectDecision) {
    const queuedEvents = (result.match.effectQueue?.items || []).map((item) => item.payload).filter(Boolean);
    result.match = {
      ...result.match,
      pendingEffectDecision: {
        ...result.match.pendingEffectDecision,
        // Compatibility mirror for v5.0.x UI/tests. Effect Queue remains authoritative.
        continuationEvents: queuedEvents
      }
    };
  }
  result.match = reconcileModifierConditions(result.match, cardIndex);

  // Content Migration Batch 02: destruction and other canonical events emitted
  // from inside action resolution are deferred until the current effect queue
  // item finishes. This avoids resolver import cycles while still allowing
  // controller-field observers to react authoritatively.
  if (!result.match.pendingEffectDecision && Array.isArray(result.match.deferredCanonicalEvents) && result.match.deferredCanonicalEvents.length) {
    const [deferred, ...remainingDeferred] = result.match.deferredCanonicalEvents;
    result.match = { ...result.match, deferredCanonicalEvents: remainingDeferred };
    const deferredResult = dispatchEffectEvent(result.match, deferred, cardIndex);
    result = mergeResult(result, deferredResult);
    result.match = deferredResult.match;
  }

  result.pendingEffectDecision = result.match.pendingEffectDecision || null;
  result.manualResolutionNeeded = Boolean(result.manualResolutionNeeded || drained.waiting || result.pendingEffectDecision);
  return result;
}

export function getEventOpponentId(match, eventPlayerId) {
  return eventPlayerId ? otherPlayerId(match, eventPlayerId) : null;
}
