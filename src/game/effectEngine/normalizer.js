const EVENT_ALIASES = new Map([
  ["onsummon", "whenSummoned"],
  ["whensummoned", "whenSummoned"],
  ["summoned", "whenSummoned"],
  ["ondeploy", "whenDeployed"],
  ["whendeployed", "whenDeployed"],
  ["deployed", "whenDeployed"],
  ["onattack", "whenAttacks"],
  ["whenattacks", "whenAttacks"],
  ["attacks", "whenAttacks"],
  ["onblock", "whenBlocks"],
  ["whenblocks", "whenBlocks"],
  ["blocks", "whenBlocks"],
  ["ondestroyed", "whenDestroyed"],
  ["whendestroyed", "whenDestroyed"],
  ["destroyed", "whenDestroyed"],
  ["main", "magicMain"],
  ["magicmain", "magicMain"],
  ["flash", "magicFlash"],
  ["magicflash", "magicFlash"],
  ["afterlifedecreases", "burstLifeDecrease"],
  ["burstlifedecrease", "burstLifeDecrease"],
  ["burst", "burst"],
  ["continuous", "continuous"],
  ["ultimatetriggerhit", "ultimateTriggerHit"],
  ["utriggerhit", "ultimateTriggerHit"],
  ["ultimatetriggerguard", "ultimateTriggerGuard"],
  ["utriggerguard", "ultimateTriggerGuard"],
  ["ultimatetriggerresolved", "ultimateTriggerResolved"]
]);

export function normalizeEventName(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const compact = raw.replace(/[\s_-]+/g, "").toLowerCase();
  return EVENT_ALIASES.get(compact) || raw;
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
    // Ultimate Trigger possui uma etapa de regra própria. O texto de display
    // não deve virar um fallback manual de whenAttacks no Effect Engine.
    if (source === "effects") {
      const specialType = String(entry?.type || "").replace(/[\s_-]+/g, "").toLowerCase();
      if (specialType === "ultimatetrigger") return false;
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
