import test from "node:test";
import assert from "node:assert/strict";
import {
  ArenaActionCategory,
  ArenaCardVisualState,
  ArenaConnectionState,
  ArenaPhase,
  ArenaZone,
  createArenaAvailableActionContract,
  createArenaCardContract,
  createArenaPresentationContract,
  validateArenaPresentationContract
} from "./index.js";

test("card presentation contract strips rule-engine behavior and normalizes UI facts", () => {
  const card = createArenaCardContract({
    instanceId: "card-1",
    cardId: "BS01-001",
    cardType: "spirit",
    zone: ArenaZone.SPIRITS,
    exhausted: true,
    level: "2",
    bp: "5000",
    cores: { regular: 3, soul: true },
    visualState: ArenaCardVisualState.ATTACKABLE,
    reducerHelper: () => true
  });

  assert.deepEqual(card, {
    instanceId: "card-1",
    cardId: "BS01-001",
    cardType: "spirit",
    zone: "spirits",
    controllerId: null,
    ownerId: null,
    exhausted: true,
    level: 2,
    bp: 5000,
    cores: { regular: 3, soul: true },
    combinedWith: null,
    combinedHostId: null,
    visualState: "attackable",
    flags: {}
  });
  assert.equal("reducerHelper" in card, false);
});

test("available action contract preserves an authoritative dispatch payload", () => {
  const descriptor = createArenaAvailableActionContract({
    action: { type: "DECLARE_ATTACK", instanceId: "spirit-9" },
    label: "Attack",
    category: ArenaActionCategory.BATTLE,
    primary: true
  });

  assert.equal(descriptor.type, "DECLARE_ATTACK");
  assert.equal(descriptor.primary, true);
  assert.deepEqual(descriptor.action, { type: "DECLARE_ATTACK", instanceId: "spirit-9" });
});

test("full Arena presentation contract validates the Phase 1 normalized boundary", () => {
  const contract = createArenaPresentationContract({
    matchId: "match-1",
    viewerPlayerId: "player1",
    opponentPlayerId: "player2",
    player: {
      id: "player1",
      name: "Player 1",
      life: 5,
      reserve: 3,
      deckCount: 36,
      handCount: 4,
      connectionState: ArenaConnectionState.CONNECTED
    },
    opponent: {
      id: "player2",
      name: "Player 2",
      life: 5,
      reserve: 3,
      deckCount: 36,
      handCount: 4,
      connectionState: ArenaConnectionState.CONNECTED
    },
    timing: {
      turnNumber: 1,
      activePlayerId: "player1",
      phase: ArenaPhase.MAIN,
      priorityPlayerId: "player1"
    },
    zones: [
      { playerId: "player1", zone: ArenaZone.HAND, hidden: false, count: 4 },
      { playerId: "player2", zone: ArenaZone.HAND, hidden: true, count: 4 }
    ],
    availableActions: [
      { action: { type: "ADVANCE_PHASE" }, label: "Advance phase", category: ArenaActionCategory.PHASE, primary: true }
    ]
  });

  const validation = validateArenaPresentationContract(contract);
  assert.equal(validation.ok, true, JSON.stringify(validation.issues));
});

test("validation rejects unknown timing and zone values", () => {
  const contract = createArenaPresentationContract({
    player: { id: "player1" },
    opponent: { id: "player2" },
    timing: { phase: ArenaPhase.MAIN },
    zones: [{ playerId: "player1", zone: ArenaZone.HAND }]
  });
  contract.timing.phase = "combat-main";
  contract.zones[0].zone = "graveyard";

  const validation = validateArenaPresentationContract(contract);
  assert.equal(validation.ok, false);
  assert.equal(validation.issues.some((entry) => entry.path === "timing.phase"), true);
  assert.equal(validation.issues.some((entry) => entry.path === "zones[0].zone"), true);
});
