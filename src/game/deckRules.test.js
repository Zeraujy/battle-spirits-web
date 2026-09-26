import test from "node:test";
import assert from "node:assert/strict";
import { makeCardIndex } from "./cardAdapter.js";
import { validateDeck } from "./state.js";

function baseCards() {
  const cards = [];
  for (let i = 1; i <= 40; i += 1) {
    cards.push({ id: `T-${i}`, nameEN: `Card ${i}`, namePT: `Carta ${i}`, cardType: "spirit", subtypes: [] });
  }
  return cards;
}

function deckOf(ids) {
  return ids.map((cardId) => ({ cardId, quantity: 1 }));
}

test("Eternal requires 40+ cards and max 3 copies by same deck-construction name", () => {
  const cards = baseCards();
  cards.push({ id: "A-1", nameEN: "Same", namePT: "Mesmo Nome", cardType: "spirit" });
  cards.push({ id: "A-2", nameEN: "Same Alt", namePT: "Mesmo Nome", cardType: "spirit" });
  const index = makeCardIndex(cards);
  const ids = baseCards().slice(0, 36).map((c) => c.id).concat(["A-1", "A-1", "A-2", "A-2"]);
  const result = validateDeck(deckOf(ids), index);
  assert.equal(result.size, 40);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.code === "same_name_limit"));
});

test("Eternal rejects a currently banned Japanese card", () => {
  const cards = baseCards();
  cards[0] = { ...cards[0], id: "BS13-059", nameEN: "Forbidden Vulture", namePT: "Forbidden Vulture" };
  const index = makeCardIndex(cards);
  const deck = deckOf(cards.map((c) => c.id));
  const eternal = validateDeck(deck, index, { regulation: "eternal" });
  assert.equal(eternal.ok, false);
  assert.ok(eternal.issues.some((issue) => issue.code === "eternal_banned"));
  const official = validateDeck(deck, index, { regulation: "official" });
  assert.equal(official.ok, false);
});

test("official Eternal applies current one-copy restriction", () => {
  const cards = baseCards();
  cards[0] = { ...cards[0], id: "BS13-062", nameEN: "The Shining Galaxy", namePT: "The Shining Galaxy" };
  const index = makeCardIndex(cards);
  const ids = cards.slice(1).map((c) => c.id).concat(["BS13-062", "BS13-062"]);
  const official = validateDeck(deckOf(ids), index, { regulation: "official" });
  assert.equal(official.ok, false);
  assert.ok(official.issues.some((issue) => issue.code === "official_copy_limit"));
});

test("Eternal allows only one type of Contract card in a deck", () => {
  const cards = baseCards();
  cards[0] = { ...cards[0], id: "CX-A", nameEN: "Contract A", namePT: "Contrato A", cardType: "nexus", subtypes: ["contract"] };
  cards[1] = { ...cards[1], id: "CX-B", nameEN: "Contract B", namePT: "Contrato B", cardType: "spirit", subtypes: ["contract"] };
  const index = makeCardIndex(cards);
  const result = validateDeck(deckOf(cards.map((c) => c.id)), index);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.code === "multiple_contract_types"));
});
