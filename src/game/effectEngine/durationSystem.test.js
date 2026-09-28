import test from "node:test";
import assert from "node:assert/strict";

import {
  EffectDuration,
  createDurationSpec,
  durationExpiresOn,
  durationIsActive,
  normalizeEffectDuration
} from "./durationSystem.js";

test("Duration System normalizes legacy aliases into canonical durations", () => {
  assert.equal(normalizeEffectDuration("battle"), EffectDuration.THIS_BATTLE);
  assert.equal(normalizeEffectDuration("this_turn"), EffectDuration.THIS_TURN);
  assert.equal(normalizeEffectDuration("until end step"), EffectDuration.UNTIL_END_STEP);
  assert.equal(normalizeEffectDuration("source"), EffectDuration.WHILE_SOURCE_EXISTS);
});

test("Duration System binds turn and battle identity", () => {
  const match = { turnNumber: 3, phase: "attack", battle: { id: "battle-1" } };
  const battle = createDurationSpec("thisBattle", match, { sourceInstanceId: "source-1" });
  const turn = createDurationSpec("thisTurn", match);
  assert.equal(durationIsActive(match, battle), true);
  assert.equal(durationIsActive({ ...match, battle: { id: "battle-2" } }, battle), false);
  assert.equal(durationIsActive({ ...match, turnNumber: 4 }, turn), false);
});

test("Duration System supports source and explicit expiry reasons", () => {
  const match = { turnNumber: 1, phase: "main", battle: null };
  const source = createDurationSpec("whileSourceExists", match, { sourceInstanceId: "source-1" });
  assert.equal(durationIsActive(match, source, { sourceExists: (id) => id === "source-1" }), true);
  assert.equal(durationIsActive(match, source, { sourceExists: () => false }), false);
  assert.equal(durationExpiresOn("thisBattle", "battleEnd"), true);
  assert.equal(durationExpiresOn("thisTurn", "turnEnd"), true);
});
