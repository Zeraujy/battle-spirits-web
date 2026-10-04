export const ARENA_RULES_STATE_PRESENTATION_STATUS = Object.freeze({
  PRESENTED: "PRESENTED",
  INTERNAL_ONLY: "INTERNAL_ONLY"
});

export const ARENA_RULES_STATE_PRESENTATION_REGISTRY = Object.freeze([
  { stateKey: "phase", status: "PRESENTED", presentation: "ArenaVisualPhaseBar", evidence: "src/features/arena-visual/components/layout/ArenaVisualPhaseBar.jsx" },
  { stateKey: "battle", status: "PRESENTED", presentation: "ArenaVisualBattleState", evidence: "src/features/arena-visual/components/battle/ArenaVisualBattleState.jsx" },
  { stateKey: "burstOpportunity", status: "PRESENTED", presentation: "ArenaVisualBurstPrompt", evidence: "src/features/arena-visual/components/burst/ArenaVisualBurstPrompt.jsx" },
  { stateKey: "pendingEffectDecision", status: "PRESENTED", presentation: "ArenaVisualDecisionHost", evidence: "src/features/arena-visual/components/decisions/ArenaVisualDecisionHost.jsx" },
  { stateKey: "pendingManualPlay", status: "PRESENTED", presentation: "ArenaVisualSummonPaymentPanel", evidence: "src/features/arena-visual/components/battlefield/ArenaVisualSummonPaymentPanel.jsx" },
  { stateKey: "pendingManualCost", status: "PRESENTED", presentation: "ArenaVisualActionCenter + Core interaction", evidence: "src/features/arena-visual/components/layout/ArenaVisualActionCenter.jsx" },
  { stateKey: "winnerId", status: "PRESENTED", presentation: "ArenaVisualMatchResult", evidence: "src/features/arena-visual/components/result/ArenaVisualMatchResult.jsx" },
  { stateKey: "players.*.burst", status: "PRESENTED", presentation: "Burst zone + BurstPresentation", evidence: "src/features/arena/components/BurstPresentation.jsx" },
  { stateKey: "players.*.mirage", status: "PRESENTED", presentation: "ArenaVisualMirageZone", evidence: "src/features/arena-visual/components/zones/ArenaVisualMirageZone.jsx" },
  { stateKey: "players.*.revealed", status: "PRESENTED", presentation: "Manual revealed-card fallback", evidence: "src/features/arena-visual/components/layout/ArenaVisualUtilityPanel.jsx" },
  { stateKey: "players.*.soulCore", status: "PRESENTED", presentation: "ArenaVisualCorePool / Core overlay", evidence: "src/features/arena-visual/components/resources/ArenaVisualCorePool.jsx" },
  { stateKey: "players.*.mulliganUsed", status: "PRESENTED", presentation: "ArenaVisualMulliganPrompt", evidence: "src/features/arena-visual/components/setup/ArenaVisualMulliganPrompt.jsx" },
  { stateKey: "physical.exhausted", status: "PRESENTED", presentation: "ArenaVisualBattlefieldCard", evidence: "src/features/arena-visual/components/battlefield/ArenaVisualBattlefieldCard.jsx" },
  { stateKey: "physical.pendingDestruction", status: "PRESENTED", presentation: "ArenaVisualBattlefieldCard / BattleRestrictionHint", evidence: "src/features/arena-visual/components/battle/ArenaVisualBattleRestrictionHint.jsx" },
  { stateKey: "actionLog", status: "PRESENTED", presentation: "CardMotionLayer / BurstPresentation", evidence: "src/features/arena/components/CardMotionLayer.jsx" },
  { stateKey: "log", status: "PRESENTED", presentation: "GameEventToast / Log tab", evidence: "src/features/arena/components/GameEventToast.jsx" },
  { stateKey: "temporary", status: "PRESENTED", presentation: "Selector-derived card stats", evidence: "src/features/arena-visual/controller/ArenaVisualControllerBridge.js" },
  { stateKey: "persistentEffects", status: "PRESENTED", presentation: "Selector-derived BP/symbol presentation", evidence: "src/features/arena-visual/controller/ArenaVisualControllerBridge.js" },

  { stateKey: "triggerBatch", status: "INTERNAL_ONLY", presentation: "Rules Engine queue only", evidence: "src/game/effectEngine/triggerDispatcher.js" },
  { stateKey: "effectQueue", status: "INTERNAL_ONLY", presentation: "Rules Engine queue only", evidence: "src/game/effectEngine" },
  { stateKey: "modifierRegistry", status: "INTERNAL_ONLY", presentation: "Rules Engine modifier storage", evidence: "src/game" },
  { stateKey: "pending", status: "INTERNAL_ONLY", presentation: "Rules Engine internal pending list", evidence: "src/game/state.js" },
  { stateKey: "deferredCanonicalEvents", status: "INTERNAL_ONLY", presentation: "Rules Engine continuation queue", evidence: "src/game/effects.js" },
  { stateKey: "pendingMagicResolution", status: "INTERNAL_ONLY", presentation: "Magic automation continuation state", evidence: "src/game/effectEngine/magicAutomation.js" }
]);

export function getArenaRulesStatePresentation(stateKey) {
  return ARENA_RULES_STATE_PRESENTATION_REGISTRY.find((entry) => entry.stateKey === stateKey) || null;
}

export function playerFacingArenaRulesStates() {
  return ARENA_RULES_STATE_PRESENTATION_REGISTRY.filter((entry) => entry.status === ARENA_RULES_STATE_PRESENTATION_STATUS.PRESENTED);
}
