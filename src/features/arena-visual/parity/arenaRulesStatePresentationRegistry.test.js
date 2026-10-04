import assert from "node:assert/strict";
import test from "node:test";
import {
  ARENA_RULES_STATE_PRESENTATION_REGISTRY,
  ARENA_RULES_STATE_PRESENTATION_STATUS,
  getArenaRulesStatePresentation
} from "./arenaRulesStatePresentationRegistry.js";

test("all registered Rules Engine states have an explicit presentation or internal-only classification", () => {
  assert.ok(ARENA_RULES_STATE_PRESENTATION_REGISTRY.length >= 20);
  for (const entry of ARENA_RULES_STATE_PRESENTATION_REGISTRY) {
    assert.ok([ARENA_RULES_STATE_PRESENTATION_STATUS.PRESENTED, ARENA_RULES_STATE_PRESENTATION_STATUS.INTERNAL_ONLY].includes(entry.status));
    assert.ok(entry.presentation);
    assert.ok(entry.evidence);
  }
});

test("critical transient player-facing states are mapped to New Arena presentation", () => {
  for (const key of ["battle", "burstOpportunity", "pendingEffectDecision", "pendingManualPlay", "pendingManualCost", "winnerId"]) {
    assert.equal(getArenaRulesStatePresentation(key)?.status, "PRESENTED", key);
  }
});
