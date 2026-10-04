import assert from "node:assert/strict";
import test from "node:test";
import { ARENA_RENDER_MODES, resolveArenaRenderMode } from "./arenaVisualProductionMode.js";

test("Arena Visual is the production default", () => {
  assert.equal(resolveArenaRenderMode(""), ARENA_RENDER_MODES.VISUAL);
  assert.equal(resolveArenaRenderMode("?foo=bar"), ARENA_RENDER_MODES.VISUAL);
});

test("legacy Arena remains available as an explicit fallback", () => {
  assert.equal(resolveArenaRenderMode("?arena=legacy"), ARENA_RENDER_MODES.LEGACY);
});

test("explicit visual mode remains compatible with integration links", () => {
  assert.equal(resolveArenaRenderMode("?arena=visual"), ARENA_RENDER_MODES.VISUAL);
});
