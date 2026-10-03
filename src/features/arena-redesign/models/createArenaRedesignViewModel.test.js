import test from "node:test";
import assert from "node:assert/strict";
import { createArenaRedesignViewModel } from "./createArenaRedesignViewModel.js";

function card(instanceId, cardId) {
  return {
    instanceId,
    cardId,
    cardType: "spirit",
    exhausted: false,
    cores: { regular: 2, soul: false }
  };
}

function player(id) {
  return {
    id,
    name: id,
    deck: [card(`${id}-deck-1`, "BS01-001")],
    hand: [
      card(`${id}-hand-1`, "BS01-002"),
      card(`${id}-hand-2`, "BS01-003")
    ],
    trash: [card(`${id}-trash-1`, "BS01-004")],
    revealed: [],
    openArea: [],
    removed: [],
    life: 5,
    reserve: 4,
    trashCores: 1,
    soulCore: { zone: "reserve", instanceId: null },
    field: {
      spirits: [card(`${id}-field-1`, "BS01-005")],
      nexuses: [],
      other: []
    },
    burst: card(`${id}-burst-1`, "BS01-006"),
    mirage: null,
    turnFlags: {}
  };
}

test("Arena redesign view model exposes the viewer's private zones", () => {
  const match = {
    id: "match-1",
    turnNumber: 3,
    phase: "main",
    activePlayerId: "player1",
    players: {
      player1: player("player1"),
      player2: player("player2")
    }
  };

  const viewModel = createArenaRedesignViewModel({
    match,
    viewerPlayerId: "player1"
  });

  assert.equal(viewModel.player.zones.hand[0].cardId, "BS01-002");
  assert.equal(viewModel.player.zones.burst.cardId, "BS01-006");
  assert.equal(viewModel.player.zones.field.spirits[0].cardId, "BS01-005");
});

test("Arena redesign view model hides the opponent's private card identities", () => {
  const match = {
    id: "match-2",
    activePlayerId: "player2",
    players: {
      player1: player("player1"),
      player2: player("player2")
    }
  };

  const viewModel = createArenaRedesignViewModel({
    match,
    viewerPlayerId: "player1"
  });

  assert.equal(viewModel.opponent.zones.hand.length, 2);
  assert.equal(viewModel.opponent.zones.hand[0].hidden, true);
  assert.equal("cardId" in viewModel.opponent.zones.hand[0], false);

  assert.equal(viewModel.opponent.zones.burst.hidden, true);
  assert.equal("cardId" in viewModel.opponent.zones.burst, false);

  assert.equal(
    viewModel.opponent.zones.field.spirits[0].cardId,
    "BS01-005"
  );
});

test("Arena redesign view model forwards only normalized action descriptors", () => {
  const match = {
    players: {
      player1: player("player1"),
      player2: player("player2")
    }
  };

  const viewModel = createArenaRedesignViewModel({
    match,
    viewerPlayerId: "player1",
    availableActions: [
      {
        type: "pass",
        label: "Pass",
        payload: { reason: "priority" },
        internalResolver: () => true
      }
    ]
  });

  assert.deepEqual(viewModel.actions, [
    {
      id: "pass",
      type: "pass",
      label: "Pass",
      category: null,
      instanceId: null,
      braveInstanceId: null,
      hostInstanceId: null,
      move: null,
      payload: { reason: "priority" },
      disabled: false
    }
  ]);
});


test("Arena redesign view model derives Phase 10 playability and targeting hints", () => {
  const match = {
    players: {
      player1: player("player1"),
      player2: player("player2")
    },
    pendingEffectDecision: {
      kind: "selectTarget",
      playerId: "player1",
      candidates: [{ instanceId: "player2-field-1" }],
      minimum: 1,
      maximum: 1
    }
  };

  const viewModel = createArenaRedesignViewModel({
    match,
    viewerPlayerId: "player1",
    availableActions: [
      {
        action: { type: "SUMMON", instanceId: "player1-hand-1" },
        label: "Summon",
        category: "summon"
      }
    ]
  });

  assert.deepEqual(viewModel.interactionHints.playableHandInstanceIds, ["player1-hand-1"]);
  assert.equal(viewModel.interactionHints.targeting.active, true);
  assert.deepEqual(viewModel.interactionHints.targetableInstanceIds, ["player2-field-1"]);
  assert.equal(viewModel.actions[0].type, "SUMMON");
  assert.equal(viewModel.actions[0].instanceId, "player1-hand-1");
});
