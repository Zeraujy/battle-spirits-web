import test from "node:test";
import assert from "node:assert/strict";
import { formatCoins, normalizeWallet, summarizeCollection } from "./economyService.js";

test("normalizeWallet sanitizes economy values", () => {
  assert.deepEqual(normalizeWallet({ spirit_coins: 1200.9, craft_coins: -5 }), {
    spiritCoins: 1200,
    craftCoins: 0
  });
});

test("summarizeCollection counts unique cards and duplicates", () => {
  assert.deepEqual(summarizeCollection([
    { cardId: "A", quantity: 3 },
    { cardId: "B", quantity: 1 },
    { cardId: "C", quantity: 0 }
  ]), {
    uniqueCards: 2,
    totalCopies: 4,
    duplicateCopies: 2
  });
});

test("formatCoins returns a readable integer", () => {
  assert.match(formatCoins(1234), /1[\.,]234/);
});
