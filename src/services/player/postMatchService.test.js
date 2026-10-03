import test from "node:test";
import assert from "node:assert/strict";
import { buildPostMatchSummary, formatMatchDuration } from "./postMatchService.js";

test("post-match summary derives perspective, duration and mastery XP", () => {
  const match = {
    id: "m1",
    winnerId: "player1",
    winnerReason: "life",
    turnNumber: 7,
    players: {
      player1: { name: "A", life: 2 },
      player2: { name: "B", life: 0, username: "b" }
    }
  };
  const summary = buildPostMatchSummary({
    match,
    mode: "online",
    viewerPlayerId: "player1",
    startedAt: 1000,
    endedAt: 61000,
    deckSnapshot: { name: "Deck", cardIds: ["A", "A", "B"], coverCardId: "A" }
  });
  assert.equal(summary.result, "win");
  assert.equal(summary.durationSeconds, 60);
  assert.equal(summary.mastery.trackedCards, 2);
  assert.equal(summary.mastery.totalXp, 135);
  assert.equal(summary.opponent.username, "b");
});

test("duration formatter uses mm:ss", () => {
  assert.equal(formatMatchDuration(125), "2:05");
});
