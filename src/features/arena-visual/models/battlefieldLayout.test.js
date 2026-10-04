import assert from "node:assert/strict";
import test from "node:test";
import { getArenaVisualBattlefieldLane, groupArenaVisualBattlefieldCards } from "./battlefieldLayout.js";

test("legacy battlefield spatial logic groups loose Braves/Others left, Spirits/Ultimates center and Nexus right", () => {
  assert.equal(getArenaVisualBattlefieldLane({ cardType: "brave" }), "left");
  assert.equal(getArenaVisualBattlefieldLane({ cardType: "other" }), "left");
  assert.equal(getArenaVisualBattlefieldLane({ cardType: "spirit" }), "center");
  assert.equal(getArenaVisualBattlefieldLane({ cardType: "ultimate" }), "center");
  assert.equal(getArenaVisualBattlefieldLane({ cardType: "nexus" }), "right");

  const grouped = groupArenaVisualBattlefieldCards([
    { id: "b", cardType: "brave" },
    { id: "s", cardType: "spirit" },
    { id: "u", cardType: "ultimate" },
    { id: "n", cardType: "nexus" }
  ]);

  assert.deepEqual(grouped.left.map((card) => card.id), ["b"]);
  assert.deepEqual(grouped.center.map((card) => card.id), ["s", "u"]);
  assert.deepEqual(grouped.right.map((card) => card.id), ["n"]);
});
