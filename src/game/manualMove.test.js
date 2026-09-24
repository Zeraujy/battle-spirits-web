import test from "node:test";
import assert from "node:assert/strict";
import { makeCardIndex, normalizeCard } from "./cardAdapter.js";
import { createMatch, makePhysicalCard } from "./state.js";
import { applyGameAction } from "./reducer.js";

const cards = [
  normalizeCard({
    id: "MOVE-1",
    namePT: "Movement Test",
    cardType: "spirit",
    colors: ["red"],
    cost: 0,
    symbols: ["red"],
    levels: [{ level: 1, cores: 1, bp: 1000 }]
  })
];
const cardIndex = makeCardIndex(cards);
const deck = Array.from({ length: 40 }, () => "MOVE-1");

function makeMatch() {
  return createMatch({
    player1: { name: "A", deck },
    player2: { name: "B", deck },
    firstPlayerId: "player1",
    cardIndex,
    random: () => 0.5
  });
}

test("manual drag movement can move a hand card to Trash and back to Hand", () => {
  let match = makeMatch();
  const physical = { ...makePhysicalCard("MOVE-1", cardIndex), instanceId: "drag-card" };
  match.players.player1.hand.unshift(physical);

  let result = applyGameAction(match, {
    type: "MANUAL",
    payload: { type: "moveCard", instanceId: "drag-card", destination: "trash" }
  }, "player1", cardIndex);

  assert.equal(result.ok, true);
  assert.equal(result.match.players.player1.hand.some((card) => card.instanceId === "drag-card"), false);
  assert.equal(result.match.players.player1.trash.at(-1).instanceId, "drag-card");

  result = applyGameAction(result.match, {
    type: "MANUAL",
    payload: { type: "moveCard", instanceId: "drag-card", destination: "hand" }
  }, "player1", cardIndex);

  assert.equal(result.ok, true);
  assert.equal(result.match.players.player1.hand.at(-1).instanceId, "drag-card");
});

test("manual field movement returns regular and Soul Cores before moving to deck", () => {
  let match = makeMatch();
  const physical = {
    ...makePhysicalCard("MOVE-1", cardIndex),
    instanceId: "field-card",
    cores: { regular: 2, soul: true }
  };
  match.players.player1.field.spirits = [physical];
  match.players.player1.reserve = 1;
  match.players.player1.soulCore = { zone: "card", instanceId: "field-card" };

  const result = applyGameAction(match, {
    type: "MANUAL",
    payload: {
      type: "moveCard",
      instanceId: "field-card",
      destination: "deck",
      placement: "top"
    }
  }, "player1", cardIndex);

  assert.equal(result.ok, true);
  assert.equal(result.match.players.player1.reserve, 3);
  assert.equal(result.match.players.player1.soulCore.zone, "reserve");
  assert.equal(result.match.players.player1.field.spirits.length, 0);
  assert.equal(result.match.players.player1.deck[0].instanceId, "field-card");
  assert.deepEqual(result.match.players.player1.deck[0].cores, { regular: 0, soul: false });
});

test("manual movement rejects moving another player's card", () => {
  let match = makeMatch();
  const physical = { ...makePhysicalCard("MOVE-1", cardIndex), instanceId: "other-card" };
  match.players.player2.hand.unshift(physical);

  const result = applyGameAction(match, {
    type: "MANUAL",
    payload: { type: "moveCard", instanceId: "other-card", destination: "trash" }
  }, "player1", cardIndex);

  assert.equal(result.ok, false);
  assert.match(result.error, /próprias cartas/i);
});
