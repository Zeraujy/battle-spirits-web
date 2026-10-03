import assert from "node:assert/strict";
import test from "node:test";
import { createBattleInteractionPresentation, getBattleStageLabel } from "./battleInteractionPresentation.js";

function makeViewModel(overrides = {}) {
  return {
    viewer: { playerId: "player1" },
    player: {
      id: "player1",
      zones: { field: { spirits: [{ instanceId: "defender" }], nexuses: [], other: [] } }
    },
    opponent: {
      id: "player2",
      zones: { field: { spirits: [{ instanceId: "attacker" }], nexuses: [], other: [] } }
    },
    battle: {
      stage: "block",
      attackerPlayerId: "player2",
      defenderPlayerId: "player1",
      attackerInstanceId: "attacker",
      blockerInstanceId: null,
      ...overrides
    }
  };
}

test("maps visible attacker and direct-attack state without reading engine modules", () => {
  const presentation = createBattleInteractionPresentation(makeViewModel());
  assert.equal(presentation.attacker.side, "opponent");
  assert.equal(presentation.attacker.physical.instanceId, "attacker");
  assert.equal(presentation.directAttack, true);
  assert.equal(presentation.viewerIsDefender, true);
  assert.equal(presentation.stageLabel, "Choose blocker");
});

test("maps a visible blocker when one is declared", () => {
  const presentation = createBattleInteractionPresentation(makeViewModel({ blockerInstanceId: "defender", stage: "flash2" }));
  assert.equal(presentation.blocker.side, "player");
  assert.equal(presentation.directAttack, false);
  assert.equal(presentation.stageLabel, "Flash timing");
});

test("returns no battle presentation when there is no attacker", () => {
  const presentation = createBattleInteractionPresentation({ ...makeViewModel(), battle: null });
  assert.equal(presentation, null);
  assert.equal(getBattleStageLabel("resolve"), "Battle resolution");
});
