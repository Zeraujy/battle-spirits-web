import test from "node:test";
import assert from "node:assert/strict";
import { buildServerMatchHistoryRecords } from "./matchHistoryRecord.js";

test("server history is derived from authoritative match state", () => {
  const room = {
    code: "ABC123",
    players: {
      player1: { profile: { name: "A" }, deckSnapshot: { deckId: "d1", deckName: "Deck A", coverCardId: "C1", cards: [{ cardId: "C1", quantity: 2 }] } },
      player2: { profile: { name: "B", username: "bee" }, deckSnapshot: { deckId: "d2", deckName: "Deck B", cards: [{ cardId: "C2", quantity: 1 }] } }
    }
  };
  const session = {
    mode: "casual",
    startedAt: 1000,
    gameState: {
      id: "m1",
      winnerId: "player1",
      winnerReason: "life",
      turnNumber: 5,
      players: { player1: { life: 2 }, player2: { life: 0 } }
    }
  };
  const records = buildServerMatchHistoryRecords({ room, session, cardIndex: new Map(), finishedAt: 11000 });
  assert.equal(records.player1.result, "win");
  assert.equal(records.player2.result, "loss");
  assert.equal(records.player1.duration_seconds, 10);
  assert.equal(records.player1.server_authoritative, true);
  assert.equal(records.player1.opponent_username, "bee");
  assert.deepEqual(records.player1.deck_card_ids, ["C1"]);
});
