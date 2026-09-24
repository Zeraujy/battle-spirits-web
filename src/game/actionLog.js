import { clone } from "./utils.js";

const MAX_STRUCTURED_ACTIONS = 1000;

function safeClone(value) {
  try {
    return clone(value);
  } catch {
    return JSON.parse(JSON.stringify(value ?? null));
  }
}

export function appendStructuredAction(beforeMatch, afterMatch, action, actorId) {
  const previous = Array.isArray(beforeMatch?.actionLog) ? beforeMatch.actionLog : [];
  const sequence = previous.length ? Number(previous.at(-1)?.sequence || previous.length) + 1 : 1;
  const entry = {
    sequence,
    actorId,
    type: action?.type || "UNKNOWN",
    turn: Number(beforeMatch?.turnNumber || 0),
    phaseBefore: beforeMatch?.phase || null,
    phaseAfter: afterMatch?.phase || null,
    action: safeClone(action || {})
  };

  return {
    ...afterMatch,
    actionLog: [...previous, entry].slice(-MAX_STRUCTURED_ACTIONS)
  };
}

export function getStructuredActionLog(match) {
  return Array.isArray(match?.actionLog) ? match.actionLog : [];
}
