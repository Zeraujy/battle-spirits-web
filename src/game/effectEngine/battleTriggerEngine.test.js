import test from "node:test";
import assert from "node:assert/strict";
import { createBattleContext, dispatchBattleParticipantEvent } from "./battleTriggerEngine.js";

function physical(cardId, instanceId, exhausted = false) { return { cardId, instanceId, exhausted, cores: { regular: 1, soul: false }, combinedWith: null, effectModifiers: [] }; }
function player() { return { life: 5, reserve: 0, hand: [], deck: [], trash: [], revealed: [], field: { spirits: [], nexuses: [], other: [] } }; }

test("Battle Trigger Engine exposes attacker/blocker context and BP", () => {
  const match = { activePlayerId: "player1", phase: "attack", players: { player1: player(), player2: player() }, battle: { id: "b1", stage: "resolve", attackerPlayerId: "player1", defenderPlayerId: "player2", attackerInstanceId: "a1", blockerInstanceId: "b1" } };
  match.players.player1.field.spirits.push(physical("A", "a1", true));
  match.players.player2.field.spirits.push(physical("B", "b1", true));
  const index = new Map([
    ["A", { id: "A", cardType: "spirit", symbols: ["red"], levels: [{ level: 1, cores: 1, bp: 3000 }] }],
    ["B", { id: "B", cardType: "spirit", symbols: ["blue"], levels: [{ level: 1, cores: 1, bp: 2000 }] }]
  ]);
  const context = createBattleContext(match, index);
  assert.equal(context.blocked, true);
  assert.equal(context.attackerBP, 3000);
  assert.equal(context.blockerBP, 2000);
});

test("Battle Trigger Engine dispatches whenBattles to both participants", () => {
  const match = { activePlayerId: "player1", phase: "attack", players: { player1: player(), player2: player() }, battle: { id: "b1", stage: "flash2", attackerPlayerId: "player1", defenderPlayerId: "player2", attackerInstanceId: "a1", blockerInstanceId: "b1" } };
  match.players.player1.field.spirits.push(physical("A", "a1", true));
  match.players.player2.field.spirits.push(physical("B", "b1", true));
  match.players.player1.deck.push(physical("D", "d1"));
  match.players.player2.deck.push(physical("D", "d2"));
  const index = new Map([
    ["A", { id: "A", cardType: "spirit", levels: [{ level: 1, cores: 1, bp: 3000 }], abilities: [{ id: "a-battle", event: "whenBattles", actions: [{ type: "draw", count: 1 }] }] }],
    ["B", { id: "B", cardType: "spirit", levels: [{ level: 1, cores: 1, bp: 2000 }], abilities: [{ id: "b-battle", event: "whenBattles", actions: [{ type: "draw", count: 1 }] }] }],
    ["D", { id: "D", cardType: "spirit", levels: [{ level: 1, cores: 1, bp: 1000 }] }]
  ]);
  const result = dispatchBattleParticipantEvent(match, "whenBattles", index);
  assert.equal(result.match.players.player1.hand.length, 1);
  assert.equal(result.match.players.player2.hand.length, 1);
});
