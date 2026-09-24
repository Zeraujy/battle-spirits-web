export function clone(value) {
  return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

export function uid(prefix = "id") {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function shuffle(items, random = Math.random) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function otherPlayerId(match, playerId) {
  return Object.keys(match.players).find((id) => id !== playerId) ?? null;
}

export function appendLog(match, text, kind = "info") {
  return {
    ...match,
    log: [
      ...(match.log || []),
      { id: uid("log"), turn: match.turnNumber, phase: match.phase, kind, text }
    ].slice(-250)
  };
}

export function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
