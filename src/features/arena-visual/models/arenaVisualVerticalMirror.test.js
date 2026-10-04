import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("opponent side follows the Photoshop 180-degree table counterpart layout", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/features/arena-visual/components/zones/ArenaVisualSideZones.jsx"),
    "utf8"
  );

  assert.match(source, /const opponentLeft = \[\.\.\.playerRight\]\.reverse\(\)/);
  assert.match(source, /const opponentRight = \[\.\.\.playerLeft\]\.reverse\(\)/);
  assert.match(source, /side === "opponent"/);
});

test("opponent rail widths match the rail that rotates into each screen side", async () => {
  const { ARENA_VISUAL_MOCKUP_REFERENCE } = await import("./arenaVisualMockupMetrics.js");
  assert.equal(
    ARENA_VISUAL_MOCKUP_REFERENCE.opponentLeftRailWidthRatio,
    ARENA_VISUAL_MOCKUP_REFERENCE.playerRightRailWidthRatio
  );
  assert.equal(
    ARENA_VISUAL_MOCKUP_REFERENCE.opponentRightRailWidthRatio,
    ARENA_VISUAL_MOCKUP_REFERENCE.playerLeftRailWidthRatio
  );
});
