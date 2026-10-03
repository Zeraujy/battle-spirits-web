import test from "node:test";
import assert from "node:assert/strict";
import { analyzeDeck } from "./deckAnalytics.js";

test("analyzeDeck weighs quantities in cost, color and type summaries", () => {
  const index = new Map([
    ["A", { id: "A", cost: 2, cardType: "spirit", colors: ["red"], reduction: ["red"], symbols: ["red"] }],
    ["B", { id: "B", cost: 8, cardType: "magic", colors: ["blue"], reduction: ["blue", "blue"], symbols: [] }]
  ]);
  const result = analyzeDeck([{ cardId: "A", quantity: 3 }, { cardId: "B", quantity: 1 }], index);
  assert.equal(result.total, 4);
  assert.equal(result.averageCost, 3.5);
  assert.equal(result.costCurve[2], 3);
  assert.equal(result.costCurve[7], 1);
  assert.equal(result.colors.red, 3);
  assert.equal(result.colors.blue, 1);
  assert.equal(result.types.spirit, 3);
  assert.equal(result.types.magic, 1);
});
