import test from "node:test";
import assert from "node:assert/strict";

import { dispatchEffectEvent } from "./triggerDispatcher.js";

function physical(cardId, instanceId) {
  return {
    cardId,
    instanceId,
    exhausted: false,
    cores: { regular: 1, soul: false },
    combinedWith: null,
    effectModifiers: []
  };
}

function player(name) {
  return {
    name,
    life: 5,
    reserve: 0,
    hand: [],
    deck: [],
    trash: [],
    revealed: [],
    field: { spirits: [], nexuses: [], other: [] },
    burst: null
  };
}

function baseMatch() {
  return {
    activePlayerId: "player1",
    phase: "main",
    players: {
      player1: player("P1"),
      player2: player("P2")
    },
    log: []
  };
}


test("dispatcher preserves source-scoped behavior and resolves v2 source effects", () => {
  const sourcePhysical = physical("SRC", "src-1");
  const drawn = physical("DRAWN", "drawn-1");
  const match = baseMatch();
  match.players.player1.field.spirits.push(sourcePhysical);
  match.players.player1.deck.push(drawn);

  const index = new Map([
    ["SRC", {
      id: "SRC",
      cardType: "spirit",
      nameEN: "Source",
      levels: [{ level: 1, cores: 1, bp: 1000 }],
      effects: [{
        schemaVersion: 2,
        id: "src-draw",
        trigger: { event: "whenSummoned", scope: "source", eventPlayer: "self" },
        actions: [{ type: "draw", count: 1 }]
      }]
    }],
    ["DRAWN", { id: "DRAWN", cardType: "spirit", levels: [{ level: 1, cores: 1, bp: 1000 }] }]
  ]);

  const result = dispatchEffectEvent(match, {
    event: "summon",
    sourcePlayerId: "player1",
    sourceInstanceId: "src-1"
  }, index);

  assert.equal(result.automatic, 1);
  assert.equal(result.match.players.player1.hand.length, 1);
  assert.equal(result.match.players.player1.deck.length, 0);
});


test("dispatcher allows a v2 field observer to react to opponent events", () => {
  const summoned = physical("SUMMONED", "summoned-1");
  const observer = physical("OBSERVER", "observer-1");
  const drawn = physical("DRAWN", "drawn-2");
  const match = baseMatch();
  match.players.player1.field.spirits.push(summoned);
  match.players.player2.field.nexuses.push(observer);
  match.players.player2.deck.push(drawn);

  const index = new Map([
    ["SUMMONED", { id: "SUMMONED", cardType: "spirit", levels: [{ level: 1, cores: 1, bp: 1000 }] }],
    ["OBSERVER", {
      id: "OBSERVER",
      cardType: "nexus",
      nameEN: "Observer Nexus",
      levels: [{ level: 1, cores: 0, bp: 0 }],
      effects: [{
        schemaVersion: 2,
        id: "observe-opponent-summon",
        trigger: {
          event: "whenSummoned",
          scope: "controllerField",
          eventPlayer: "opponent"
        },
        actions: [{ type: "draw", count: 1 }]
      }]
    }],
    ["DRAWN", { id: "DRAWN", cardType: "spirit", levels: [{ level: 1, cores: 1, bp: 1000 }] }]
  ]);

  const result = dispatchEffectEvent(match, {
    event: "whenSummoned",
    sourcePlayerId: "player1",
    sourceInstanceId: "summoned-1"
  }, index);

  assert.equal(result.automatic, 1);
  assert.equal(result.match.players.player2.hand.length, 1);
  assert.equal(result.match.players.player2.deck.length, 0);
});


test("legacy entries remain source-only and do not become global observers", () => {
  const summoned = physical("SUMMONED", "summoned-legacy");
  const legacyObserver = physical("LEGACY", "legacy-1");
  const drawn = physical("DRAWN", "drawn-legacy");
  const match = baseMatch();
  match.players.player1.field.spirits.push(summoned);
  match.players.player2.field.nexuses.push(legacyObserver);
  match.players.player2.deck.push(drawn);

  const index = new Map([
    ["SUMMONED", { id: "SUMMONED", cardType: "spirit", levels: [{ level: 1, cores: 1, bp: 1000 }] }],
    ["LEGACY", {
      id: "LEGACY",
      cardType: "nexus",
      levels: [{ level: 1, cores: 0, bp: 0 }],
      effects: [{ event: "whenSummoned", actions: [{ type: "draw", count: 1 }] }]
    }],
    ["DRAWN", { id: "DRAWN", cardType: "spirit", levels: [{ level: 1, cores: 1, bp: 1000 }] }]
  ]);

  const result = dispatchEffectEvent(match, {
    event: "whenSummoned",
    sourcePlayerId: "player1",
    sourceInstanceId: "summoned-legacy"
  }, index);

  assert.equal(result.automatic, 0);
  assert.equal(result.match.players.player2.hand.length, 0);
  assert.equal(result.match.players.player2.deck.length, 1);
});
