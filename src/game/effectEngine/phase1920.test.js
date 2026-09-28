import test from "node:test";
import assert from "node:assert/strict";
import { buildTriggerBatch, nextAmbiguousTriggerGroup, applyTriggerGroupOrder, orderedTriggerDispatches, resolveAutomaticTriggerGroups } from "./triggerOrderingEngine.js";

const match = { activePlayerId: "player1", turnNumber: 3, phase: "attack" };
const dispatches = [
  { event: "whenAttacks", sourcePlayerId: "player2", sourceInstanceId: "b", sourceCardId: "B" },
  { event: "whenAttacks", sourcePlayerId: "player1", sourceInstanceId: "a1", sourceCardId: "A1" },
  { event: "whenAttacks", sourcePlayerId: "player1", sourceInstanceId: "a2", sourceCardId: "A2" }
];

test("TriggerBatch applies active-player controller group before opponent group", () => {
  const batch = resolveAutomaticTriggerGroups(buildTriggerBatch(match, dispatches, new Map()));
  assert.equal(batch.groups[0].controllerId, "player1");
  assert.equal(batch.groups[1].controllerId, "player2");
  assert.equal(nextAmbiguousTriggerGroup(batch)?.controllerId, "player1");
});

test("TriggerBatch validates and preserves chosen intra-controller order", () => {
  let batch = resolveAutomaticTriggerGroups(buildTriggerBatch(match, dispatches, new Map()));
  const group = nextAmbiguousTriggerGroup(batch);
  batch = applyTriggerGroupOrder(batch, "player1", [...group.triggerIds].reverse());
  assert.ok(batch);
  const ordered = orderedTriggerDispatches(batch);
  assert.equal(ordered[0].sourceInstanceId, "a2");
  assert.equal(ordered[1].sourceInstanceId, "a1");
  assert.equal(ordered[2].sourceInstanceId, "b");
});

test("TriggerBatch rejects forged trigger order", () => {
  const batch = buildTriggerBatch(match, dispatches, new Map());
  assert.equal(applyTriggerGroupOrder(batch, "player1", ["forged"]), null);
});
