import test from "node:test";
import assert from "node:assert/strict";
import { masteryLevelFromXp, masteryNextThreshold, masteryXpForMatch } from "../services/masteryRules.js";

test("Card Mastery 2.0 exposes seven XP levels", () => {
  assert.equal(masteryLevelFromXp(0), 1);
  assert.equal(masteryLevelFromXp(250), 2);
  assert.equal(masteryLevelFromXp(650), 3);
  assert.equal(masteryLevelFromXp(1300), 4);
  assert.equal(masteryLevelFromXp(2300), 5);
  assert.equal(masteryLevelFromXp(3800), 6);
  assert.equal(masteryLevelFromXp(6000), 7);
  assert.equal(masteryNextThreshold(7), null);
});

test("Card Mastery XP rewards match, win and cover independently", () => {
  assert.equal(masteryXpForMatch({ result: "loss", isCover: false }), 40);
  assert.equal(masteryXpForMatch({ result: "win", isCover: false }), 60);
  assert.equal(masteryXpForMatch({ result: "loss", isCover: true }), 55);
  assert.equal(masteryXpForMatch({ result: "win", isCover: true }), 75);
});
