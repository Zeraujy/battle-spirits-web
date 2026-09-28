import test from "node:test";
import assert from "node:assert/strict";
import { resolveReplacementWindow, ReplacementEvent } from "./replacementEngine.js";

function physical(cardId, instanceId) {
  return { cardId, instanceId, exhausted: false, cores: { regular: 1, soul: false }, combinedWith: null, effectModifiers: [] };
}
function player() { return { life: 5, reserve: 0, hand: [], deck: [], trash: [], revealed: [], field: { spirits: [], nexuses: [], other: [] } }; }

test("Replacement Engine can prevent a destruction event declaratively", () => {
  const source = physical("WARD", "ward-1");
  const match = { activePlayerId: "player1", phase: "attack", turnNumber: 1, players: { player1: player(), player2: player() }, battle: null };
  match.players.player1.field.spirits.push(source);
  const index = new Map([["WARD", { id: "WARD", cardType: "spirit", levels: [{ level: 1, cores: 1, bp: 1000 }], effects: [{ schemaVersion: 2, id: "ward", trigger: { event: "wouldBeDestroyed", scope: "source" }, actions: [{ type: "preventEvent" }] }] }]]);
  const result = resolveReplacementWindow(match, { event: ReplacementEvent.WOULD_BE_DESTROYED, targetPlayerId: "player1", targetInstanceId: "ward-1", sourcePhysical: source, sourceCardId: "WARD" }, index);
  assert.equal(result.prevented, true);
  assert.equal(result.match.replacementWindow.prevented, true);
});

test("Replacement Engine can describe a replacement destination", () => {
  const source = physical("RETURNER", "return-1");
  const match = { activePlayerId: "player1", phase: "attack", turnNumber: 1, players: { player1: player(), player2: player() }, battle: null };
  match.players.player1.field.spirits.push(source);
  const index = new Map([["RETURNER", { id: "RETURNER", cardType: "spirit", levels: [{ level: 1, cores: 1, bp: 1000 }], effects: [{ schemaVersion: 2, id: "return", trigger: { event: "wouldBeDestroyed", scope: "source" }, actions: [{ type: "replaceEvent", replacementType: "move", destination: "hand" }] }] }]]);
  const result = resolveReplacementWindow(match, { event: ReplacementEvent.WOULD_BE_DESTROYED, targetPlayerId: "player1", targetInstanceId: "return-1", sourcePhysical: source, sourceCardId: "RETURNER" }, index);
  assert.equal(result.replacement.destination, "hand");
});
