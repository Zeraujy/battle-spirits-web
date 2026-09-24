import { clone } from "./utils.js";
import { validateMatchState } from "./stateValidation.js";
import { applyGameAction } from "./reducer.js";

export const SNAPSHOT_VERSION = 1;

export function createMatchSnapshot(match, metadata = {}) {
  return {
    snapshotVersion: SNAPSHOT_VERSION,
    simulatorVersion: "3.3.1c",
    metadata: clone(metadata || {}),
    match: clone(match)
  };
}

export function restoreMatchSnapshot(snapshot, cardIndex = null) {
  if (!snapshot || Number(snapshot.snapshotVersion) !== SNAPSHOT_VERSION || !snapshot.match) {
    return { ok: false, error: "Snapshot incompatível ou inválido." };
  }
  const match = clone(snapshot.match);
  const integrity = validateMatchState(match, cardIndex);
  return { ok: integrity.ok, match, integrity, error: integrity.ok ? null : "O snapshot contém inconsistências estruturais." };
}

export function serializeMatchSnapshot(snapshot) {
  return JSON.stringify(snapshot, null, 2);
}

export function parseMatchSnapshot(text, cardIndex = null) {
  try {
    return restoreMatchSnapshot(JSON.parse(String(text || "")), cardIndex);
  } catch {
    return { ok: false, error: "Não foi possível ler o snapshot." };
  }
}

export function replayStructuredActions(initialMatch, entries, cardIndex) {
  let match = clone(initialMatch);
  const failures = [];
  for (const entry of entries || []) {
    const result = applyGameAction(match, clone(entry.action || {}), entry.actorId, cardIndex);
    if (!result.ok) {
      failures.push({ sequence: entry.sequence, error: result.error });
      break;
    }
    match = result.match;
  }
  return { ok: failures.length === 0, match, failures };
}
