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
import { normalizeCanonicalEvent } from "./canonicalEvents.js";
import { conditionMatchesEffect } from "./conditionEngine.js";
import { reconcileContinuousModifierConditions } from "./modifierResolver.js";

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

function observerDispatchInput(input, playerId, physical) {
  return {
    event: input.event,
    sourcePlayerId: playerId,
    sourceInstanceId: physical.instanceId,
    sourcePhysical: physical,
    dispatchMode: "observerV2",
    context: {
      ...(input.context || {}),
      eventPlayerId: input.context?.eventPlayerId || null,
      eventSourcePlayerId: input.sourcePlayerId || input.context?.eventSourcePlayerId || null,
      eventSourceInstanceId: input.sourceInstanceId || input.context?.eventSourceInstanceId || null,
      eventSourceCardId: input.sourceCardId || input.sourceCard?.id || input.context?.eventSourceCardId || null
    }
  };
}

function sourceHasV2ContinuousEffect(match, input, cardIndex) {
  const found = input.sourceInstanceId ? findPhysicalCard(match, input.sourceInstanceId) : null;
  const physical = found?.card || input.sourcePhysical || null;
  const card = input.sourceCard || (physical ? getDatabaseCard(cardIndex, physical) : null) || (input.sourceCardId ? cardIndex.get(input.sourceCardId) : null);
  if (!card) return false;
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
      const context = {
        ...(input.context || {}),
        sourcePlayerId: playerId,
        sourceInstanceId: physical.instanceId,
        sourcePhysical: physical,
        sourceCard: card,
        eventPlayerId: input.context?.eventPlayerId || null
      };
      const entries = getTriggeredEntries(card, event, { dispatchMode: "observerV2" })
        .filter(({ entry }) => getEntryTriggerScope(entry) === EffectTriggerScope.CONTROLLER_FIELD)
        .filter(({ entry }) => entryMatchesTriggerContext(entry, context, match));
      if (!entries.length) continue;

      // Source-scoped effects are handled by the first dispatch. Observer-scoped
      // effects may legally live on the same physical card, so they are not
      // excluded here.
      out.push(observerDispatchInput(input, playerId, physical));
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
    dispatches.push(sourceDispatchInput(input));
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

  let queued = enqueueEffectEvents(match, dispatches).match;
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
  result.pendingEffectDecision = result.match.pendingEffectDecision || null;
  result.manualResolutionNeeded = Boolean(result.manualResolutionNeeded || drained.waiting);
  return result;
}

export function getEventOpponentId(match, eventPlayerId) {
  return eventPlayerId ? otherPlayerId(match, eventPlayerId) : null;
}
