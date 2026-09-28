import test from "node:test";
import assert from "node:assert/strict";

import {
  applyContinuousCollectionModifiers,
  getContinuousNumericModifier,
  pruneContinuousModifiers,
  registerContinuousModifier
} from "./modifierResolver.js";

function physical(cardId, instanceId) {
  return { cardId, instanceId, exhausted: false, cores: { regular: 1, soul: false }, combinedWith: null, effectModifiers: [] };
}
function player() {
  return { field: { spirits: [], nexuses: [], other: [] }, hand: [], deck: [], trash: [], revealed: [] };
}
function fixture() {
  const source = physical("SRC", "source-1");
  const ally = physical("ALLY", "ally-1");
  const opponent = physical("ENEMY", "enemy-1");
  const match = {
    turnNumber: 2,
    phase: "main",
    battle: null,
    players: { player1: player(), player2: player() },
    modifierRegistry: { nextSequence: 1, items: [] }
  };
  match.players.player1.field.spirits.push(source, ally);
  match.players.player2.field.spirits.push(opponent);
  const index = new Map([
    ["SRC", { id: "SRC", cardType: "spirit", colors: ["red"], families: ["Dragon"], cost: 4, symbols: ["red"] }],
    ["ALLY", { id: "ALLY", cardType: "spirit", colors: ["red"], families: ["Dragon"], cost: 3, symbols: ["red"] }],
    ["ENEMY", { id: "ENEMY", cardType: "spirit", colors: ["blue"], families: ["Warrior"], cost: 2, symbols: ["blue"] }]
  ]);
  return { match, index, source, ally, opponent };
}

test("Continuous modifier applies dynamically to matching controlled cards", () => {
  const { match, index, ally, opponent } = fixture();
  const registered = registerContinuousModifier(match, {
    property: "bp",
    value: 2000,
    selector: { owner: "self", cardType: "spirit", color: "red" },
    duration: "whileSourceExists"
  }, { sourcePlayerId: "player1", sourceInstanceId: "source-1", effectId: "aura" });
  assert.equal(getContinuousNumericModifier(registered.match, index, ally, "bp"), 2000);
  assert.equal(getContinuousNumericModifier(registered.match, index, opponent, "bp"), 0);
});

test("Continuous collection modifiers add and remove symbols", () => {
  const { match, index, ally } = fixture();
  const added = registerContinuousModifier(match, {
    property: "symbols",
    value: ["white"],
    selector: { owner: "self" },
    duration: "thisTurn"
  }, { sourcePlayerId: "player1", sourceInstanceId: "source-1" }).match;
  assert.deepEqual(applyContinuousCollectionModifiers(added, index, ally, "symbols", ["red"]).sort(), ["red", "white"]);
});

test("whileSourceExists modifiers are pruned when their source leaves the field", () => {
  const { match } = fixture();
  let next = registerContinuousModifier(match, {
    property: "bp",
    value: 1000,
    selector: { owner: "self" },
    duration: "whileSourceExists"
  }, { sourcePlayerId: "player1", sourceInstanceId: "source-1" }).match;
  next.players.player1.field.spirits = next.players.player1.field.spirits.filter((card) => card.instanceId !== "source-1");
  next = pruneContinuousModifiers(next);
  assert.equal(next.modifierRegistry.items.length, 0);
});

test("symbol modifiers preserve duplicate symbols because each symbol contributes separately", () => {
  const { match, index, ally } = fixture();
  assert.deepEqual(applyContinuousCollectionModifiers(match, index, ally, "symbols", ["red", "red"]), ["red", "red"]);
});
