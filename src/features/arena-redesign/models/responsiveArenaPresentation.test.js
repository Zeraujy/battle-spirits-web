import test from "node:test";
import assert from "node:assert/strict";
import {
  ARENA_VIEWPORT_PROFILES,
  getArenaInputProfile,
  getArenaViewportProfile
} from "./responsiveArenaPresentation.js";

test("Phase 14 maps the official reference viewport tiers", () => {
  assert.equal(getArenaViewportProfile({ width: 2560, height: 1440 }), ARENA_VIEWPORT_PROFILES.DESKTOP_WIDE);
  assert.equal(getArenaViewportProfile({ width: 1920, height: 1080 }), ARENA_VIEWPORT_PROFILES.DESKTOP);
  assert.equal(getArenaViewportProfile({ width: 1366, height: 768 }), ARENA_VIEWPORT_PROFILES.LAPTOP);
  assert.equal(getArenaViewportProfile({ width: 1024, height: 768 }), ARENA_VIEWPORT_PROFILES.TABLET_LANDSCAPE);
  assert.equal(getArenaViewportProfile({ width: 844, height: 390 }), ARENA_VIEWPORT_PROFILES.MOBILE_LANDSCAPE);
});

test("Phase 14 keeps touch/coarse-pointer presentation separate from gameplay authority", () => {
  assert.equal(getArenaInputProfile({ coarsePointer: true, hoverCapable: false }), "touch");
  assert.equal(getArenaInputProfile({ coarsePointer: false, hoverCapable: true }), "pointer");
  assert.equal(getArenaInputProfile({ coarsePointer: false, hoverCapable: false }), "hybrid");
});
