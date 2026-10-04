import assert from "node:assert/strict";
import test from "node:test";
import { createArenaVisualManualPolicy } from "./arenaVisualManualActions.js";

test("manual fallback is disabled in Online and Ranked modes", () => {
  assert.equal(createArenaVisualManualPolicy({ mode: "online", canControlActor: true }).canUse, false);
  assert.equal(createArenaVisualManualPolicy({ mode: "ranked", canControlActor: true }).canUse, false);
});

test("manual fallback is available only to an unblocked local controller", () => {
  assert.equal(createArenaVisualManualPolicy({ mode: "local", canControlActor: true }).canUse, true);
  assert.equal(createArenaVisualManualPolicy({ mode: "ai", canControlActor: true }).canUse, true);
  assert.equal(createArenaVisualManualPolicy({ mode: "local", canControlActor: false }).canUse, false);
  assert.equal(createArenaVisualManualPolicy({ mode: "local", canControlActor: true, blockingPending: true }).canUse, false);
});
