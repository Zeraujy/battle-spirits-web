import test from "node:test";
import assert from "node:assert/strict";
import { ARENA_VISUAL_MOCKUP_REFERENCE, createArenaVisualMockupStyle } from "./arenaVisualMockupMetrics.js";

test("mockup metrics preserve the Photoshop reference proportions", () => {
  assert.equal(ARENA_VISUAL_MOCKUP_REFERENCE.width, 1650);
  assert.equal(ARENA_VISUAL_MOCKUP_REFERENCE.height, 928);
  assert.ok(ARENA_VISUAL_MOCKUP_REFERENCE.utilityWidthRatio > 0.22);
  assert.ok(ARENA_VISUAL_MOCKUP_REFERENCE.playerLeftRailWidthRatio > ARENA_VISUAL_MOCKUP_REFERENCE.playerRightRailWidthRatio);
  assert.equal(ARENA_VISUAL_MOCKUP_REFERENCE.playerRightRailWidthRatio, ARENA_VISUAL_MOCKUP_REFERENCE.opponentLeftRailWidthRatio);
  assert.equal(ARENA_VISUAL_MOCKUP_REFERENCE.playerLeftRailWidthRatio, ARENA_VISUAL_MOCKUP_REFERENCE.opponentRightRailWidthRatio);
});

test("mockup style exposes viewport-derived English CSS variables", () => {
  const style = createArenaVisualMockupStyle();
  assert.equal(style["--arena-visual-utility-width"], "23.3vw");
  assert.equal(style["--arena-visual-zone-life-height"], "11.7vh");
  assert.equal(style["--arena-visual-zone-burst-height"], "14.9vh");
  assert.equal(style["--arena-visual-burst-width-ratio"], "0.68");
});
