import test from "node:test";
import assert from "node:assert/strict";
import { getHandDensity, getHandFanStyle } from "./handFanLayout.js";

test("hand density compresses progressively", () => {
  assert.equal(getHandDensity(5), "comfortable");
  assert.equal(getHandDensity(9), "dense");
  assert.equal(getHandDensity(14), "compact");
});

test("fan mirrors rotation between player and opponent", () => {
  const player = getHandFanStyle(0, 5, "player");
  const opponent = getHandFanStyle(0, 5, "opponent");
  assert.equal(player.leftPercent, opponent.leftPercent);
  assert.equal(player.rotationDeg, -opponent.rotationDeg);
});
