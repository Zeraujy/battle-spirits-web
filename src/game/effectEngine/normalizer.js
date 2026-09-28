import { normalizeCanonicalEvent } from "./canonicalEvents.js";
import {
  EffectTriggerScope,
  EventPlayerRelation,
  isEffectSchemaV2,
  normalizeEffectSchemaV2
} from "./effectSchema.js";

export function normalizeEventName(value) {
  return normalizeCanonicalEvent(value);
}

export function getEntryEventCandidates(entry = {}) {
  return [entry.trigger?.event, entry.event, entry.timing, entry.type]
    .map(normalizeEventName)
    .filter(Boolean);
}

export function entryMatchesEvent(entry, event) {
  const requested = normalizeEventName(event);
  if (!requested) return false;
  return getEntryEventCandidates(entry).includes(requested);
}

export function getEntryActions(entry = {}) {
  const actions = entry.actions ?? entry.operations ?? entry.ops ?? [];
  return Array.isArray(actions) ? actions : [];
}

export function getEntryTriggerScope(entry = {}) {
  if (!isEffectSchemaV2(entry)) return EffectTriggerScope.SOURCE;
  return normalizeEffectSchemaV2(entry).trigger.scope;
}

export function getEntryEventPlayerRelation(entry = {}) {
  if (!isEffectSchemaV2(entry)) return EventPlayerRelation.ANY;
  return normalizeEffectSchemaV2(entry).trigger.eventPlayer;
}

export function entryMatchesTriggerContext(entry = {}, context = {}, match = null) {
  if (!isEffectSchemaV2(entry)) return true;
  const effect = normalizeEffectSchemaV2(entry);
  const relation = effect.trigger.eventPlayer;
  if (relation === EventPlayerRelation.ANY) return true;

  const eventPlayerId = context.eventPlayerId || context.eventSourcePlayerId || null;
  const controllerId = context.sourcePlayerId || null;
  if (!eventPlayerId || !controllerId) return false;
  if (relation === EventPlayerRelation.SELF) return eventPlayerId === controllerId;
  if (relation === EventPlayerRelation.OPPONENT) {
    if (match?.players) {
      return eventPlayerId !== controllerId && Boolean(match.players[eventPlayerId]);
    }
    return eventPlayerId !== controllerId;
  }
  return true;
}

export function getTriggeredEntries(card, event, options = {}) {
  if (!card) return [];
  const dispatchMode = options.dispatchMode || "any";
  const entries = [
    ...(Array.isArray(card.effects) ? card.effects.map((entry) => ({ entry, source: "effects" })) : []),
    ...(Array.isArray(card.abilities) ? card.abilities.map((entry) => ({ entry, source: "abilities" })) : [])
  ].filter(({ entry, source }) => {
    if (source === "effects") {
      const specialType = String(entry?.type || "").replace(/[\s_-]+/g, "").toLowerCase();
      if (specialType.includes("ultimatetrigger")) return false;
    }
    if (!entryMatchesEvent(entry, event)) return false;

    if (dispatchMode === "source") {
      return !isEffectSchemaV2(entry) || getEntryTriggerScope(entry) === EffectTriggerScope.SOURCE;
    }
    if (dispatchMode === "observerV2") {
      return isEffectSchemaV2(entry) && getEntryTriggerScope(entry) !== EffectTriggerScope.SOURCE;
    }
    if (dispatchMode === "observerLegacy") {
      return !isEffectSchemaV2(entry);
    }
    return true;
  });

  const seen = new Set();
  return entries.filter(({ entry, source }) => {
    const id = entry?.id || entry?.key || null;
    const signature = id
      ? `${source}:${id}`
      : `${source}:${JSON.stringify([getEntryEventCandidates(entry), getEntryActions(entry), entry?.levels || null])}`;
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}
