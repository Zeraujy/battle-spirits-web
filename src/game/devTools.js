import { getLegalActions } from "./legalActions.js";
import { validateMatchState } from "./stateValidation.js";

export function getMatchDebugSnapshot(match, playerId, cardIndex) {
  return {
    turnNumber: match?.turnNumber ?? null,
    phase: match?.phase ?? null,
    activePlayerId: match?.activePlayerId ?? null,
    battleStage: match?.battle?.stage ?? null,
    pendingEffectDecision: Boolean(match?.pendingEffectDecision),
    burstOpportunity: match?.burstOpportunity || null,
    legalActions: getLegalActions(match, playerId, cardIndex),
    integrity: validateMatchState(match, cardIndex)
  };
}
