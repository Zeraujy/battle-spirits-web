import test from "node:test";
import assert from "node:assert/strict";
import {
  getFieldCardInteractionState,
  getHandCardInteractionState,
  getInteractionFeedbackLabel
} from "./cardInteractionPresentation.js";

test("hand interaction state distinguishes playable and unavailable cards", () => {
  const interaction = {
    playableHandInstanceIds: ["hand-1"],
    actionTypesByInstanceId: { "hand-1": ["SUMMON"] },
    actionLabelsByInstanceId: { "hand-1": ["Summon"] }
  };

  const playable = getHandCardInteractionState("hand-1", interaction);
  assert.equal(playable.playable, true);
  assert.equal(playable.unavailable, false);
  assert.equal(playable.primaryActionType, "SUMMON");
  assert.equal(getInteractionFeedbackLabel(playable), "Summon");

  const unavailable = getHandCardInteractionState("hand-2", interaction);
  assert.equal(unavailable.playable, false);
  assert.equal(unavailable.unavailable, true);
});

test("field interaction state makes non-candidates unavailable during targeting", () => {
  const interaction = {
    targeting: { active: true },
    targetableInstanceIds: ["field-1"],
    selectedTargetInstanceIds: ["field-1"]
  };

  const target = getFieldCardInteractionState("field-1", interaction);
  assert.equal(target.targetable, true);
  assert.equal(target.selectedTarget, true);
  assert.equal(target.unavailable, false);
  assert.equal(getInteractionFeedbackLabel(target), "Selected");

  const unavailable = getFieldCardInteractionState("field-2", interaction);
  assert.equal(unavailable.targetable, false);
  assert.equal(unavailable.unavailable, true);
});
