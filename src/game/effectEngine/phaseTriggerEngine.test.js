import test from "node:test";
import assert from "node:assert/strict";
import { dispatchPhaseEntry, eventForPhase } from "./phaseTriggerEngine.js";

function physical(cardId, instanceId) { return { cardId, instanceId, exhausted: false, cores: { regular: 1, soul: false }, combinedWith: null, effectModifiers: [] }; }
function player() { return { life: 5, reserve: 0, hand: [], deck: [], trash: [], revealed: [], field: { spirits: [], nexuses: [], other: [] } }; }

test("Phase Trigger Engine maps all turn phases to canonical step events", () => {
  assert.equal(eventForPhase("start"), "startStep");
  assert.equal(eventForPhase("attack"), "attackStep");
  assert.equal(eventForPhase("end"), "endStep");
});

test("Phase Trigger Engine dispatches v2 controllerField effects for the active player", () => {
  const observer = physical("STEP", "step-1");
  const drawn = physical("DRAW", "draw-1");
  const match = { activePlayerId: "player1", phase: "attack", turnNumber: 2, players: { player1: player(), player2: player() }, battle: null };
  match.players.player1.field.nexuses.push(observer);
  match.players.player1.deck.push(drawn);
  const index = new Map([
    ["STEP", { id: "STEP", cardType: "nexus", levels: [{ level: 1, cores: 0, bp: 0 }], effects: [{ schemaVersion: 2, id: "attack-step-draw", trigger: { event: "attackStep", scope: "controllerField", eventPlayer: "self" }, actions: [{ type: "draw", count: 1 }] }] }],
    ["DRAW", { id: "DRAW", cardType: "spirit", levels: [{ level: 1, cores: 1, bp: 1000 }] }]
  ]);
  const result = dispatchPhaseEntry(match, "attack", index);
  assert.equal(result.match.players.player1.hand.length, 1);
});

test("legacy yourAttackStep entries are treated as ambient own-step triggers", () => {
  const observer = physical("LEGACY", "legacy-1");
  const drawn = physical("DRAW", "draw-2");
  const match = { activePlayerId: "player1", phase: "attack", turnNumber: 2, players: { player1: player(), player2: player() }, battle: null };
  match.players.player1.field.nexuses.push(observer);
  match.players.player1.deck.push(drawn);
  const index = new Map([
    ["LEGACY", { id: "LEGACY", cardType: "nexus", levels: [{ level: 1, cores: 0, bp: 0 }], abilities: [{ id: "legacy-step", event: "yourAttackStep", actions: [{ type: "draw", count: 1 }] }] }],
    ["DRAW", { id: "DRAW", cardType: "spirit", levels: [{ level: 1, cores: 1, bp: 1000 }] }]
  ]);
  const result = dispatchPhaseEntry(match, "attack", index);
  assert.equal(result.match.players.player1.hand.length, 1);
});
