import { EffectEvent } from "./canonicalEvents.js";
import { dispatchEffectEvent } from "./triggerDispatcher.js";

export const PHASE_EVENT_MAP = Object.freeze({
  start: EffectEvent.START_STEP,
  core: EffectEvent.CORE_STEP,
  draw: EffectEvent.DRAW_STEP,
  refresh: EffectEvent.REFRESH_STEP,
  main: EffectEvent.MAIN_STEP,
  attack: EffectEvent.ATTACK_STEP,
  end: EffectEvent.END_STEP
});

export function eventForPhase(phase) {
  return PHASE_EVENT_MAP[String(phase || "")] || null;
}

export function dispatchPhaseEntry(match, phase, cardIndex, metadata = {}) {
  const event = eventForPhase(phase);
  if (!event) return { match, event: null, manualResolutionNeeded: false, notes: [] };
  const eventPlayerId = metadata.eventPlayerId || match.activePlayerId;
  const result = dispatchEffectEvent(match, {
    event,
    eventPlayerId,
    context: {
      phase,
      turnNumber: match.turnNumber,
      activePlayerId: match.activePlayerId,
      eventPlayerId,
      previousPhase: metadata.previousPhase || null,
      turnStarted: Boolean(metadata.turnStarted)
    }
  }, cardIndex);
  return { ...result, event };
}
