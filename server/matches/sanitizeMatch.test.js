import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeMatchForViewer } from "./sanitizeMatch.js";

test("opponent hidden zones never expose card identity", () => {
  const match = {
    id: "m1",
    players: {
      player1: {
        hand: [{ instanceId: "a", cardId: "SECRET-A", name: "Secret A" }],
        deck: [{ instanceId: "b", cardId: "SECRET-B", name: "Secret B" }],
        burst: { instanceId: "c", cardId: "SECRET-C", name: "Secret C" }
      },
      player2: {
        hand: [{ instanceId: "d", cardId: "OWN-D" }],
        deck: [{ instanceId: "e", cardId: "OWN-E" }],
        burst: null
      }
    }
  };

  const view = sanitizeMatchForViewer(match, "player2");
  assert.deepEqual(view.players.player1.hand, [{ instanceId: "a", hidden: true }]);
  assert.deepEqual(view.players.player1.deck, [{ instanceId: "b", hidden: true }]);
  assert.deepEqual(view.players.player1.burst, { instanceId: "c", hidden: true, faceDown: true });
  assert.equal(view.players.player1.hand[0].cardId, undefined);
  assert.equal(view.players.player2.hand[0].cardId, "OWN-D");
});

test("opponent cannot inspect another player's pending effect candidates", () => {
  const match = {
    players: { player1: { hand: [], deck: [], burst: null }, player2: { hand: [], deck: [], burst: null } },
    pendingEffectDecision: {
      id: "decision-secret",
      kind: "chooseCardsFromHand",
      playerId: "player1",
      titlePT: "Escolha uma carta",
      candidates: [{ instanceId: "secret-card", cardId: "SECRET" }],
      options: [{ id: "secret", actions: [{ type: "draw", amount: 2 }] }]
    }
  };
  const opponent = sanitizeMatchForViewer(match, "player2");
  assert.equal(opponent.pendingEffectDecision.hidden, true);
  assert.equal(opponent.pendingEffectDecision.candidateCount, 1);
  assert.deepEqual(opponent.pendingEffectDecision.candidates, []);
  assert.deepEqual(opponent.pendingEffectDecision.options, []);

  const owner = sanitizeMatchForViewer(match, "player1");
  assert.equal(owner.pendingEffectDecision.candidates[0].cardId, "SECRET");
});
