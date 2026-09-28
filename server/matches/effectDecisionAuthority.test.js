import test from "node:test";
import assert from "node:assert/strict";
import { validateServerEffectDecisionIntent } from "./effectDecisionAuthority.js";

const match = { pendingEffectDecision: { id: "decision-7", playerId: "player1", kind: "chooseOption" } };

test("server effect authority accepts current owner/current decision id", () => {
  assert.equal(validateServerEffectDecisionIntent({ match, playerId: "player1", action: { type: "RESOLVE_EFFECT_DECISION", decisionId: "decision-7", payload: { optionId: "yes" } } }).ok, true);
});

test("server effect authority rejects wrong owner", () => {
  const result = validateServerEffectDecisionIntent({ match, playerId: "player2", action: { type: "RESOLVE_EFFECT_DECISION", decisionId: "decision-7", payload: {} } });
  assert.equal(result.ok, false);
  assert.equal(result.code, "EFFECT_DECISION_OWNER_MISMATCH");
});

test("server effect authority rejects stale/missing decision id", () => {
  assert.equal(validateServerEffectDecisionIntent({ match, playerId: "player1", action: { type: "RESOLVE_EFFECT_DECISION", payload: {} } }).code, "STALE_EFFECT_DECISION");
  assert.equal(validateServerEffectDecisionIntent({ match, playerId: "player1", action: { type: "RESOLVE_EFFECT_DECISION", decisionId: "decision-old", payload: {} } }).code, "STALE_EFFECT_DECISION");
});
