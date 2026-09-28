import test from "node:test";
import assert from "node:assert/strict";
import { createDeckSnapshot, validateDeckSnapshot, cloneDeckSnapshot } from "./deckLock.js";

const cardIndex = new Map([
  ["A", { id: "A", type: "Spirit", color: "red" }],
  ["B", { id: "B", type: "Spirit", color: "blue" }]
]);

const validationOptions = { minimumDeckSize: 2, maxSameName: 6 };

// validateDeck accepts the project's canonical entry shape; this compact test
// focuses on immutability/fingerprint behavior after a valid snapshot exists.
test("deck snapshot is immutable and fingerprinted", () => {
  const deck = [{ cardId: "A", quantity: 1 }, { cardId: "B", quantity: 1 }];
  const result = createDeckSnapshot({ deck, deckId: "deck-1", deckName: "Test", coverCardId: "B" }, cardIndex, validationOptions);
  assert.equal(result.ok, true);
  assert.equal(result.snapshot.coverCardId, "B");
  assert.equal(result.snapshot.cardCount, 2);
  assert.equal(Object.isFrozen(result.snapshot), true);
  assert.equal(Object.isFrozen(result.snapshot.cards), true);
  assert.equal(validateDeckSnapshot(result.snapshot, cardIndex, validationOptions).ok, true);
});

test("cloned snapshot cannot mutate the locked source", () => {
  const deck = [{ cardId: "A", quantity: 1 }, { cardId: "B", quantity: 1 }];
  const result = createDeckSnapshot({ deck }, cardIndex, validationOptions);
  assert.equal(result.ok, true);
  const clone = cloneDeckSnapshot(result.snapshot);
  clone.cards[0].quantity = 99;
  assert.notEqual(clone.cards[0].quantity, result.snapshot.cards[0].quantity);
});
