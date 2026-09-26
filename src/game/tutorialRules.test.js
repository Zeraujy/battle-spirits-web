import test from "node:test";
import assert from "node:assert/strict";
import { ETERNAL_TUTORIAL_RULES } from "./tutorialRules.js";

test("tutorial follows the Eternal seven-step turn sequence", () => {
  assert.deepEqual(ETERNAL_TUTORIAL_RULES.phases, [
    "start", "core", "draw", "refresh", "main", "attack", "end"
  ]);
  assert.deepEqual(ETERNAL_TUTORIAL_RULES.firstPlayerFirstTurnSkips, ["core", "attack"]);
});

test("tutorial uses the official opening setup", () => {
  assert.equal(ETERNAL_TUTORIAL_RULES.setup.life, 5);
  assert.equal(ETERNAL_TUTORIAL_RULES.setup.reserveCores, 3);
  assert.equal(ETERNAL_TUTORIAL_RULES.setup.soulCores, 1);
  assert.equal(ETERNAL_TUTORIAL_RULES.setup.openingHand, 4);
  assert.equal(ETERNAL_TUTORIAL_RULES.setup.mulligans, 1);
});

test("tutorial battle flow keeps both Flash timings in the official order", () => {
  assert.deepEqual(ETERNAL_TUTORIAL_RULES.battleFlow, [
    "attack", "flash1", "block", "flash2", "resolve"
  ]);
  assert.equal(ETERNAL_TUTORIAL_RULES.defenderHasFirstFlashPriority, true);
  assert.equal(ETERNAL_TUTORIAL_RULES.sameTurnAttacksAllowed, true);
});
