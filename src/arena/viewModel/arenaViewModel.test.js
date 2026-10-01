import test from "node:test";
import assert from "node:assert/strict";

import { ArenaCardVisualState, ArenaZone, validateArenaPresentationContract } from "../../shared/contracts/arena/index.js";
import { buildArenaViewModel, getArenaCard, getArenaZone } from "./arenaViewModel.js";

function physical(cardId, instanceId, extra = {}) {
  return { cardId, instanceId, cores: { regular: 2, soul: false }, exhausted: false, ...extra };
}

function cardIndex() {
  return new Map([
    ["S1", { id: "S1", namePT: "Spirit Um", cardType: "spirit", colors: ["red"], symbols: ["red"], cost: 3, reduction: ["red"], levels: [{ level: 1, cores: 1, bp: 3000 }, { level: 2, cores: 2, bp: 5000 }] }],
    ["M1", { id: "M1", namePT: "Magic Um", cardType: "magic", colors: ["blue"], symbols: [], cost: 2, reduction: ["blue"], effects: [{ type: "main" }] }]
  ]);
}

function baseMatch(overrides = {}) {
  return {
    id: "m1",
    turnNumber: 3,
    activePlayerId: "p1",
    phase: "attack",
    players: {
      p1: { id: "p1", name: "Bottom", life: 5, reserve: 4, trashCores: 1, soulCore: { zone: "reserve", instanceId: null }, hand: [], deck: [physical("S1", "d1")], trash: [], removed: [], revealed: [], openArea: [], field: { spirits: [physical("S1", "s1")], nexuses: [], other: [] }, burst: null },
      p2: { id: "p2", name: "Top", life: 4, reserve: 3, trashCores: 0, soulCore: { zone: "reserve", instanceId: null }, hand: [physical("M1", "h2")], deck: [physical("S1", "d2")], trash: [], removed: [], revealed: [], openArea: [], field: { spirits: [], nexuses: [], other: [] }, burst: null }
    },
    ...overrides
  };
}

test("ArenaViewModel v2 produces a valid UI-safe contract", () => {
  const vm = buildArenaViewModel({ match: baseMatch(), cardIndex: cardIndex(), viewerPlayerId: "p1" });
  assert.ok(vm);
  assert.equal(vm.viewerPlayerId, "p1");
  assert.equal(vm.opponentPlayerId, "p2");
  assert.equal(vm.player.life, 5);
  assert.equal(vm.opponent.life, 4);
  assert.equal(vm.timing.phase, "attack");
  assert.equal(validateArenaPresentationContract(vm).ok, true);
});

test("ArenaViewModel v2 hides opponent hand identities while preserving count", () => {
  const vm = buildArenaViewModel({ match: baseMatch(), cardIndex: cardIndex(), viewerPlayerId: "p1" });
  const hand = getArenaZone(vm, "p2", ArenaZone.HAND);
  assert.equal(hand.hidden, true);
  assert.equal(hand.count, 1);
  assert.deepEqual(hand.cards, []);
});

test("ArenaViewModel v2 derives attacker playability centrally", () => {
  const vm = buildArenaViewModel({ match: baseMatch(), cardIndex: cardIndex(), viewerPlayerId: "p1" });
  const card = getArenaCard(vm, "s1");
  assert.ok(card);
  assert.equal(card.name, "Spirit Um");
  assert.equal(card.level, 2);
  assert.equal(card.visualState, ArenaCardVisualState.ATTACKABLE);
  assert.equal(vm.availableActions.some((entry) => entry.type === "DECLARE_ATTACK"), true);
});

test("ArenaViewModel v2 follows flash priority instead of viewer identity", () => {
  const match = baseMatch({
    battle: {
      stage: "flash1",
      attackerPlayerId: "p1",
      defenderPlayerId: "p2",
      attackerInstanceId: "s1",
      flash: { priorityPlayerId: "p2", consecutivePasses: 1 }
    }
  });
  const vm = buildArenaViewModel({ match, cardIndex: cardIndex(), viewerPlayerId: "p1" });
  assert.equal(vm.timing.priorityPlayerId, "p2");
  assert.equal(vm.player.hasPriority, false);
  assert.equal(vm.opponent.hasPriority, true);
});
