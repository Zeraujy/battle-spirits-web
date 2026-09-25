import test from "node:test";
import assert from "node:assert/strict";
import { buildPlayerSocialInsights, formatMasteryLabel } from "../services/socialInsights.js";

const index = new Map([
  ["A", { id: "A", name: "Alpha", colors: ["red"], image: "/a.webp" }],
  ["B", { id: "B", name: "Beta", colors: ["blue"], image: "/b.webp" }]
]);

test("social insights rank cards by deck presence and cover use", () => {
  const decks = [
    { id: "1", coverCardId: "A", cards: [{ cardId: "A", quantity: 3 }, { cardId: "B", quantity: 1 }] },
    { id: "2", coverCardId: "A", cards: [{ cardId: "A", quantity: 2 }] }
  ];
  const result = buildPlayerSocialInsights(decks, index);
  assert.equal(result.totalDecks, 2);
  assert.equal(result.uniqueCards, 2);
  assert.equal(result.topCards[0].id, "A");
  assert.ok(result.topCards[0].points > result.topCards[1].points);
  assert.equal(result.primaryColor, "red");
});

test("mastery label exposes seven readable levels", () => {
  assert.equal(formatMasteryLabel(1, "ptBR"), "Maestria I");
  assert.equal(formatMasteryLabel(7, "en"), "Mastery VII");
});
