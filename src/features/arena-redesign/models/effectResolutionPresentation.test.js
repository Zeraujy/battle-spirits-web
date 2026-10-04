import test from "node:test";
import assert from "node:assert/strict";
import { createEffectResolutionPresentation } from "./effectResolutionPresentation.js";

test("Phase 13 presents Burst actions without resolving them", () => {
  const model = createEffectResolutionPresentation({
    viewer: { playerId: "player1" },
    burstOpportunity: { playerId: "player1", event: "burstLifeDecrease", amount: 1 },
    actions: [
      { id: "activate", type: "ACTIVATE_BURST", label: "Ativar Burst", disabled: false },
      { id: "pass", type: "PASS_BURST", label: "Passar Burst", disabled: false }
    ]
  });
  assert.equal(model.burst.active, true);
  assert.equal(model.burst.viewerOwnsWindow, true);
  assert.deepEqual(model.burst.actions.map((entry) => entry.type), ["ACTIVATE_BURST", "PASS_BURST"]);
});

test("Phase 13 presents Flash priority from authoritative battle state", () => {
  const model = createEffectResolutionPresentation({
    viewer: { playerId: "player1" },
    battle: { stage: "flash1", flash: { priorityPlayerId: "player1" } },
    actions: [
      { id: "pass", type: "PASS_FLASH", label: "Passar Flash", disabled: false },
      { id: "magic", type: "USE_MAGIC", label: "Magic", instanceId: "hand-1", disabled: false }
    ]
  });
  assert.equal(model.flash.active, true);
  assert.equal(model.flash.viewerHasPriority, true);
  assert.equal(model.flash.actions.length, 2);
});

test("Phase 13 separates target selection and option decisions", () => {
  const targeting = createEffectResolutionPresentation({
    viewer: { playerId: "player1" },
    pendingEffectDecision: {
      id: "d1", kind: "selectMultipleTargets", playerId: "player1", minimum: 1, maximum: 2,
      candidates: [{ instanceId: "a" }, { instanceId: "b" }]
    }
  }, { selectedTargetInstanceIds: ["a"] });
  assert.equal(targeting.targetSelection.active, true);
  assert.equal(targeting.targetSelection.selectedCount, 1);
  assert.equal(targeting.choice.active, false);

  const choice = createEffectResolutionPresentation({
    viewer: { playerId: "player1" },
    pendingEffectDecision: { id: "d2", kind: "chooseYesNo", playerId: "player1", options: [{ id: "yes", label: "Yes" }, { id: "no", label: "No" }] },
    actions: [
      { id: "yes", type: "RESOLVE_EFFECT_DECISION", label: "Yes", payload: { optionId: "yes" }, disabled: false },
      { id: "no", type: "RESOLVE_EFFECT_DECISION", label: "No", payload: { optionId: "no" }, disabled: false }
    ]
  });
  assert.equal(choice.choice.active, true);
  assert.equal(choice.choice.actions.length, 2);
  assert.equal(choice.targetSelection.active, false);
});
