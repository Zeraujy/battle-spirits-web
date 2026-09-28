import test from "node:test";
import assert from "node:assert/strict";
import { calculateRankedRatingChange, finalizeMatchResult } from "./finalizeMatchResult.js";
import { validateMatchResult } from "./validateMatchResult.js";

function rankedContext() {
  return {
    settled: false,
    players: {
      player1: { userId: "u1", rp: 1000, deckId: "d1", deckName: "One" },
      player2: { userId: "u2", rp: 1000, deckId: "d2", deckName: "Two" }
    }
  };
}

test("ranked rating change is server calculated", () => {
  const rating = calculateRankedRatingChange(1000, 1000);
  assert.equal(rating.winnerDelta, 16);
  assert.equal(rating.loserDelta, -16);
});

test("result validation rejects a winner conflicting with authoritative state", () => {
  const result = validateMatchResult({
    ranked: rankedContext(),
    match: { id: "m", winnerId: "player1" },
    winnerId: "player2",
    reason: "game"
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "WINNER_MISMATCH");
});

test("finalize result persists only server-derived payload", async () => {
  let called = null;
  const supabase = {
    async rpc(name, payload) {
      called = { name, payload };
      return { error: null };
    }
  };
  const result = await finalizeMatchResult({
    ranked: rankedContext(),
    match: { id: "match-1", winnerId: "player1" },
    roomCode: "ABC123",
    winnerId: "player1",
    reason: "life",
    season: "S0",
    supabase,
    players: {
      player1: { profile: { name: "A" } },
      player2: { profile: { name: "B" } }
    }
  });
  assert.equal(result.ok, true);
  assert.equal(result.winnerId, "player1");
  assert.equal(result.reason, "life");
  assert.equal(called.name, "bs_ranked_settle_match");
  assert.equal(called.payload.p_winner_id, "u1");
  assert.equal(called.payload.p_loser_id, "u2");
});
