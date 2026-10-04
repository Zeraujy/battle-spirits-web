import test from "node:test";
import assert from "node:assert/strict";
import { createHandFanLayout } from "./handFanLayout.js";

test("creates a centered player hand fan", () => {
  const layout = createHandFanLayout(5, "player");
  assert.equal(layout.length, 5);
  assert.equal(layout[2].rotation, 0);
  assert.ok(layout[0].rotation < 0);
  assert.ok(layout[4].rotation > 0);
});

test("mirrors opponent hand rotation", () => {
  const player = createHandFanLayout(4, "player");
  const opponent = createHandFanLayout(4, "opponent");
  assert.equal(player[0].rotation, -opponent[0].rotation);
  assert.equal(player[3].rotation, -opponent[3].rotation);
});
