import test from "node:test";
import assert from "node:assert/strict";
import { ChallengeRegistry, ChallengeStatus } from "./index.js";

test("friend challenge can only be accepted by the challenged socket", () => {
  const registry = new ChallengeRegistry({ expiresInMs: 60_000 });
  const request = registry.create({ challengerSocketId: "a", challengedSocketId: "b", challengerUserId: "u1", challengedUserId: "u2" });
  assert.equal(request.accept("a"), false);
  assert.equal(request.accept("b"), true);
  assert.equal(request.status, ChallengeStatus.ACCEPTED);
  registry.delete(request.challengeId);
});

test("challenge snapshot never exposes the challenger's deck", () => {
  const registry = new ChallengeRegistry({ expiresInMs: 60_000 });
  const request = registry.create({ challengerSocketId: "a", challengedSocketId: "b", challengerDeck: { deckId: "secret", cards: [1, 2] } });
  const snapshot = request.snapshotFor("b");
  assert.equal("challengerDeck" in snapshot, false);
  assert.equal(snapshot.role, "challenged");
  registry.delete(request.challengeId);
});
