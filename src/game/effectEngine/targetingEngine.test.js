import test from "node:test";
import assert from "node:assert/strict";

import { collectTargets, normalizeTargetSelector, targetMatchesSelector } from "./targetingEngine.js";

function physical(cardId, instanceId, regular = 1, extra = {}) {
  return { cardId, instanceId, exhausted: false, cores: { regular, soul: false }, combinedWith: null, effectModifiers: [], ...extra };
}
function player() {
  return { life: 5, reserve: 3, trashCores: 0, hand: [], deck: [], trash: [], revealed: [], field: { spirits: [], nexuses: [], other: [] }, burst: null, soulCore: { zone: "reserve", instanceId: null } };
}
function fixture() {
  const match = { activePlayerId: "player1", phase: "main", players: { player1: player(), player2: player() } };
  match.players.player1.field.spirits.push(physical("RED", "red-1", 2));
  match.players.player2.field.spirits.push(physical("BLUE", "blue-1", 1, { exhausted: true }));
  match.players.player2.trash.push(physical("MAGIC", "magic-1", 0));
  const index = new Map([
    ["RED", { id: "RED", cardType: "spirit", colors: ["red"], families: ["Dragon"], cost: 4, symbols: ["red"], levels: [{ level: 1, cores: 1, bp: 3000 }, { level: 2, cores: 2, bp: 6000 }] }],
    ["BLUE", { id: "BLUE", cardType: "spirit", colors: ["blue"], families: ["Warrior"], cost: 2, symbols: ["blue"], levels: [{ level: 1, cores: 1, bp: 2000 }] }],
    ["MAGIC", { id: "MAGIC", cardType: "magic", colors: ["red"], cost: 3, symbols: [] }]
  ]);
  return { match, index };
}

test("Targeting Engine v2 normalizes field selectors and filters effective card properties", () => {
  const { match, index } = fixture();
  const selector = normalizeTargetSelector({ owner: "self", zone: "field", cardType: "spirit", color: "red", minimumBP: 5000, minimumLevel: 2, symbol: "red" });
  const targets = collectTargets(match, index, selector, { sourcePlayerId: "player1" });
  assert.equal(targets.length, 1);
  assert.equal(targets[0].physical.instanceId, "red-1");
});

test("Targeting Engine v2 handles opponent state and non-field zones", () => {
  const { match, index } = fixture();
  const exhausted = collectTargets(match, index, { owner: "opponent", zone: "field", state: "exhausted", maximumCost: 2 }, { sourcePlayerId: "player1" });
  assert.deepEqual(exhausted.map((target) => target.physical.instanceId), ["blue-1"]);

  const trash = collectTargets(match, index, { owner: "opponent", zone: "trash", cardType: "magic", color: "red" }, { sourcePlayerId: "player1" });
  assert.deepEqual(trash.map((target) => target.physical.instanceId), ["magic-1"]);
});

test("Targeting Engine can evaluate a candidate directly", () => {
  const { match, index } = fixture();
  const physicalCard = match.players.player1.field.spirits[0];
  const candidate = { playerId: "player1", zone: "spirits", physical: physicalCard, card: index.get("RED") };
  assert.equal(targetMatchesSelector(match, index, candidate, { family: "Dragon", minCost: 4 }, { sourcePlayerId: "player1" }), true);
  assert.equal(targetMatchesSelector(match, index, candidate, { family: "Warrior" }, { sourcePlayerId: "player1" }), false);
});
