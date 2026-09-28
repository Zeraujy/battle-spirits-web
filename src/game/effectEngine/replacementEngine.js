import { uid } from "../utils.js";
import { dispatchEffectEvent } from "./triggerDispatcher.js";

export const ReplacementEvent = Object.freeze({
  WOULD_BE_DESTROYED: "wouldBeDestroyed",
  WOULD_LOSE_LIFE: "wouldLoseLife"
});

export function beginReplacementWindow(match, descriptor = {}) {
  const window = {
    id: descriptor.id || uid("replacement"),
    event: String(descriptor.event || ""),
    targetPlayerId: descriptor.targetPlayerId || null,
    targetInstanceId: descriptor.targetInstanceId || null,
    amount: descriptor.amount == null ? null : Number(descriptor.amount),
    cause: descriptor.cause || null,
    context: { ...(descriptor.context || {}) },
    prevented: false,
    replacement: null,
    createdAtTurn: Number(match.turnNumber || 0)
  };
  return { ...match, replacementWindow: window };
}

export function clearReplacementWindow(match) {
  if (!match.replacementWindow) return match;
  const { replacementWindow: _ignored, ...rest } = match;
  return rest;
}

export function resolveReplacementWindow(match, descriptor = {}, cardIndex) {
  let next = beginReplacementWindow(match, descriptor);
  const dispatched = dispatchEffectEvent(next, {
    event: descriptor.event,
    eventPlayerId: descriptor.targetPlayerId || descriptor.eventPlayerId || null,
    sourcePlayerId: descriptor.targetPlayerId || null,
    sourceInstanceId: descriptor.targetInstanceId || null,
    sourcePhysical: descriptor.sourcePhysical || null,
    sourceCardId: descriptor.sourceCardId || null,
    context: {
      ...(descriptor.context || {}),
      replacementWindowId: next.replacementWindow.id,
      replacementEvent: descriptor.event,
      targetPlayerId: descriptor.targetPlayerId || null,
      targetInstanceId: descriptor.targetInstanceId || null,
      amount: descriptor.amount == null ? null : Number(descriptor.amount),
      cause: descriptor.cause || null
    }
  }, cardIndex);
  next = dispatched.match;
  const outcome = next.replacementWindow || null;
  return {
    match: next,
    outcome,
    prevented: Boolean(outcome?.prevented),
    replacement: outcome?.replacement || null,
    pending: Boolean(next.pendingEffectDecision),
    manualResolutionNeeded: Boolean(dispatched.manualResolutionNeeded),
    notes: dispatched.notes || []
  };
}
