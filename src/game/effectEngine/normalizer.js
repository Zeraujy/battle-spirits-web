import { normalizeCanonicalEvent } from "./canonicalEvents.js";

export function normalizeEventName(value) {
  return normalizeCanonicalEvent(value);
}

export function getEntryEventCandidates(entry = {}) {
  return [entry.event, entry.timing, entry.type]
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

export function getTriggeredEntries(card, event) {
  if (!card) return [];
  const entries = [
    ...(Array.isArray(card.effects) ? card.effects.map((entry) => ({ entry, source: "effects" })) : []),
    ...(Array.isArray(card.abilities) ? card.abilities.map((entry) => ({ entry, source: "abilities" })) : [])
  ].filter(({ entry, source }) => {
    if (source === "effects") {
      const specialType = String(entry?.type || "").replace(/[\s_-]+/g, "").toLowerCase();
      if (specialType.includes("ultimatetrigger")) return false;
    }
    return entryMatchesEvent(entry, event);
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
