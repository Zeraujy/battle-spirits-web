import test from "node:test";
import assert from "node:assert/strict";
import { createArenaInteractionHints } from "./arenaInteractionHints.js";

test("derives playable hand and actionable field instance IDs from legal actions", () => {
  const hints = createArenaInteractionHints({
    viewerPlayerId: "player1",
    actions: [
      { type: "SUMMON", instanceId: "hand-1", label: "Summon" },
      { type: "USE_MAGIC", instanceId: "hand-2", label: "Magic" },
      { type: "DECLARE_ATTACK", instanceId: "field-1", label: "Attack" },
      { type: "ADVANCE_PHASE", label: "Advance" }
    ]
  });

  assert.deepEqual(hints.playableHandInstanceIds.sort(), ["hand-1", "hand-2"]);
  assert.deepEqual(hints.actionableFieldInstanceIds, ["field-1"]);
  assert.deepEqual(hints.actionTypesByInstanceId["hand-1"], ["SUMMON"]);
  assert.deepEqual(hints.actionLabelsByInstanceId["field-1"], ["Attack"]);
});

test("exposes target candidates only to the player who owns the pending decision", () => {
  const pendingEffectDecision = {
    kind: "selectMultipleTargets",
    playerId: "player1",
    candidates: [{ instanceId: "field-a" }, { instanceId: "field-b" }],
    minimum: 1,
    maximum: 2
  };

  const owner = createArenaInteractionHints({
    viewerPlayerId: "player1",
    pendingEffectDecision
  });
  assert.equal(owner.targeting.active, true);
  assert.deepEqual(owner.targetableInstanceIds, ["field-a", "field-b"]);

  const opponent = createArenaInteractionHints({
    viewerPlayerId: "player2",
    pendingEffectDecision
  });
  assert.equal(opponent.targeting.active, false);
  assert.deepEqual(opponent.targetableInstanceIds, []);
});
