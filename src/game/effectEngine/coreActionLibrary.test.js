import test from "node:test";
import assert from "node:assert/strict";

import { canonicalActionType, supportsCoreActionType } from "./coreActionLibrary.js";
import { resolveActionList } from "./actionResolver.js";
import { getEffectiveCost, getEffectiveSymbols } from "../selectors.js";

function physical(cardId, instanceId) {
  return { cardId, instanceId, cardType: "spirit", exhausted: false, cores: { regular: 1, soul: false }, combinedWith: null, effectModifiers: [] };
}
function fixture() {
  const source = physical("SRC", "source-1");
  const handCard = physical("HAND", "hand-1");
  const match = {
    turnNumber: 1,
    phase: "main",
    battle: null,
    players: {
      player1: { life: 5, reserve: 3, trashCores: 0, hand: [handCard], deck: [], trash: [], revealed: [], removed: [], field: { spirits: [source], nexuses: [], other: [] }, burst: null },
      player2: { life: 5, reserve: 3, trashCores: 0, hand: [], deck: [], trash: [], revealed: [], removed: [], field: { spirits: [], nexuses: [], other: [] }, burst: null }
    },
    modifierRegistry: { nextSequence: 1, items: [] }
  };
  const index = new Map([
    ["SRC", { id: "SRC", cardType: "spirit", colors: ["red"], cost: 4, symbols: ["red"], levels: [{ level: 1, cores: 1, bp: 3000 }] }],
    ["HAND", { id: "HAND", cardType: "spirit", colors: ["blue"], cost: 2, symbols: ["blue"], levels: [{ level: 1, cores: 1, bp: 1000 }] }]
  ]);
  const context = { sourcePlayerId: "player1", sourceInstanceId: "source-1", sourcePhysical: source, sourceCard: index.get("SRC"), effectId: "test-effect" };
  return { match, index, source, context };
}

test("Core Action Library centralizes aliases and supported action types", () => {
  assert.equal(canonicalActionType("mill_deck"), "topDeckToTrash");
  assert.equal(canonicalActionType("gain_keyword"), "gainKeyword");
  assert.equal(supportsCoreActionType("modifyCost"), true);
  assert.equal(supportsCoreActionType("notReal"), false);
});

test("Core actions can discard and move cards without card-specific code", () => {
  const { match, index, context } = fixture();
  const result = resolveActionList(match, [{ type: "discard", targetInstanceId: "hand-1" }], index, context);
  assert.equal(result.manualResolutionNeeded, false);
  assert.equal(result.match.players.player1.hand.length, 0);
  assert.equal(result.match.players.player1.trash[0].cardId, "HAND");
});

test("modifier actions affect effective cost and symbols through ModifierRegistry", () => {
  const { match, index, source, context } = fixture();
  const result = resolveActionList(match, [
    { type: "modifyCost", target: "source", amount: -2, duration: "thisTurn" },
    { type: "modifySymbols", target: "source", symbols: ["white"], duration: "thisTurn" }
  ], index, context);
  assert.equal(result.manualResolutionNeeded, false);
  assert.equal(getEffectiveCost(result.match, index, source), 2);
  assert.deepEqual(getEffectiveSymbols(result.match, index, source).sort(), ["red", "white"]);
});
