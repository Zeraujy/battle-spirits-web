import test from "node:test";
import assert from "node:assert/strict";
import { AbandonPolicy } from "./AbandonPolicy.js";
import { DisconnectPolicy } from "./DisconnectPolicy.js";

test("abandon policy assigns loss to conceding player", () => {
  const result = new AbandonPolicy().resolveConcede({ playerId: "player2" });
  assert.equal(result.ok, true);
  assert.equal(result.winnerId, "player1");
  assert.equal(result.loserId, "player2");
  assert.equal(result.penalty, "ranked_loss");
});

test("disconnect policy uses server time window", () => {
  const policy = new DisconnectPolicy({ reconnectWindowMs: 10_000 });
  assert.equal(policy.hasExpired({ disconnectedAt: 1_000, now: 10_999 }), false);
  assert.equal(policy.hasExpired({ disconnectedAt: 1_000, now: 11_000 }), true);
  const result = policy.resolveTimeout({ playerId: "player1" });
  assert.equal(result.winnerId, "player2");
  assert.equal(result.reason, "disconnect_timeout");
});
