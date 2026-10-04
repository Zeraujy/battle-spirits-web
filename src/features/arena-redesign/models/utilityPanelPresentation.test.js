import assert from "node:assert/strict";
import test from "node:test";
import { createUtilityPanelPresentation } from "./utilityPanelPresentation.js";

test("utility presentation maps turn and phase without game-engine imports", () => {
  const model = createUtilityPanelPresentation({
    match: { turnNumber: 3, phase: "main", activePlayerId: "player1" },
    timing: { turnNumber: 3, phase: "main", activePlayerId: "player1" },
    viewer: { playerId: "player1" },
    player: { id: "player1", name: "Player" },
    opponent: { id: "player2", name: "Opponent" },
    actions: []
  });

  assert.equal(model.turn.number, 3);
  assert.equal(model.turn.phaseLabel, "Main Step");
  assert.equal(model.turn.viewerIsActivePlayer, true);
  assert.equal(model.phases.find((phase) => phase.id === "main")?.state, "current");
});

test("utility presentation only surfaces contextual global controls", () => {
  const model = createUtilityPanelPresentation({
    actions: [
      { id: "phase", type: "ADVANCE_PHASE" },
      { id: "summon", type: "SUMMON", instanceId: "card-1" },
      { id: "cancel", type: "CANCEL_MANUAL_COST" },
      { id: "disabled", type: "PASS_FLASH", disabled: true }
    ]
  });

  assert.deepEqual(model.primaryActions.map((action) => action.type), [
    "ADVANCE_PHASE",
    "CANCEL_MANUAL_COST"
  ]);
});

test("utility feed data is explicit presentation-only input", () => {
  const model = createUtilityPanelPresentation({}, {
    recentActions: [{ id: "a", text: "Spirit summoned", meta: "Main Step" }],
    gameLog: [{ id: "b", text: "Turn started" }],
    chatMessages: [{ id: "c", author: "Rival", text: "Good luck" }]
  });

  assert.equal(model.recentActions[0].text, "Spirit summoned");
  assert.equal(model.gameLog[0].text, "Turn started");
  assert.equal(model.chatMessages[0].author, "Rival");
});
