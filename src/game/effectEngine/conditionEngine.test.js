import test from "node:test";
import assert from "node:assert/strict";

import { conditionMatchesEffect } from "./conditionEngine.js";

function physical(cardId, instanceId, regular = 1) {
  return { cardId, instanceId, exhausted: false, cores: { regular, soul: false }, combinedWith: null, effectModifiers: [] };
}
function player() {
  return { life: 5, reserve: 3, trashCores: 1, hand: [], deck: [], trash: [], revealed: [], field: { spirits: [], nexuses: [], other: [] }, burst: null, soulCore: { zone: "reserve", instanceId: null } };
}
function fixture() {
  const source = physical("RED", "red-1", 2);
  const match = { activePlayerId: "player1", phase: "main", players: { player1: player(), player2: player() }, battle: null };
  match.players.player1.life = 3;
  match.players.player1.hand = [physical("HAND", "hand-1", 0), physical("HAND", "hand-2", 0)];
  match.players.player1.field.spirits.push(source);
  match.players.player2.field.spirits.push(physical("BLUE", "blue-1", 1));
  const index = new Map([
    ["RED", { id: "RED", cardType: "spirit", colors: ["red"], families: ["Dragon"], cost: 4, symbols: ["red"], levels: [{ level: 1, cores: 1, bp: 3000 }, { level: 2, cores: 2, bp: 6000 }] }],
    ["BLUE", { id: "BLUE", cardType: "spirit", colors: ["blue"], cost: 2, symbols: ["blue"], levels: [{ level: 1, cores: 1, bp: 2000 }] }],
    ["HAND", { id: "HAND", cardType: "magic", colors: ["white"], cost: 1, symbols: [] }]
  ]);
  const context = { sourcePlayerId: "player1", sourcePhysical: source, sourceCard: index.get("RED") };
  return { match, index, context };
}

test("Condition Engine v2 evaluates player resources and source properties", () => {
  const { match, index, context } = fixture();
  assert.equal(conditionMatchesEffect(match, { type: "lifeAtMost", value: 3 }, context, index), true);
  assert.equal(conditionMatchesEffect(match, { type: "handSize", atLeast: 2 }, context, index), true);
  assert.equal(conditionMatchesEffect(match, { type: "reserve", atLeast: 3 }, context, index), true);
  assert.equal(conditionMatchesEffect(match, { type: "sourceLevel", atLeast: 2 }, context, index), true);
  assert.equal(conditionMatchesEffect(match, { type: "sourceCost", value: 4 }, context, index), true);
  assert.equal(conditionMatchesEffect(match, { type: "soulCoreLocation", zone: "reserve" }, context, index), true);
});

test("Condition Engine v2 evaluates field selectors, symbols and boolean composition", () => {
  const { match, index, context } = fixture();
  assert.equal(conditionMatchesEffect(match, { type: "fieldCount", selector: { color: "red" }, atLeast: 1 }, context, index), true);
  assert.equal(conditionMatchesEffect(match, { type: "symbolCount", color: "red", atLeast: 1 }, context, index), true);
  assert.equal(conditionMatchesEffect(match, { type: "controlsColor", color: "red" }, context, index), true);
  assert.equal(conditionMatchesEffect(match, { all: [{ type: "lifeAtMost", value: 3 }, { type: "phase", value: "main" }] }, context, index), true);
  assert.equal(conditionMatchesEffect(match, { any: [{ type: "controlsColor", color: "green" }, { type: "controlsColor", color: "red" }] }, context, index), true);
  assert.equal(conditionMatchesEffect(match, { not: { type: "controlsColor", color: "green" } }, context, index), true);
});

test("Condition Engine v2 can inspect opponent resources", () => {
  const { match, index, context } = fixture();
  match.players.player2.life = 2;
  assert.equal(conditionMatchesEffect(match, { type: "lifeAtMost", player: "opponent", value: 2 }, context, index), true);
  assert.equal(conditionMatchesEffect(match, { type: "fieldCount", player: "opponent", selector: { cardType: "spirit" }, equals: 1 }, context, index), true);
});
