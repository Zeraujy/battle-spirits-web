import test from "node:test";
import assert from "node:assert/strict";
import { resolveArenaVisualResponsiveProfile } from "./arenaVisualResponsiveProfiles.js";

test("responsive profiles keep desktop Photoshop composition as master", () => {
  assert.equal(resolveArenaVisualResponsiveProfile(2560).id, "desktop-wide");
  assert.equal(resolveArenaVisualResponsiveProfile(1920).id, "desktop");
  assert.equal(resolveArenaVisualResponsiveProfile(1366).id, "laptop");
  assert.equal(resolveArenaVisualResponsiveProfile(1024).id, "tablet-landscape");
  assert.equal(resolveArenaVisualResponsiveProfile(844).id, "compact-landscape");
});
