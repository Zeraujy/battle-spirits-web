import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "src/features/arena-visual/models/arenaVisualMockupMetrics.js",
  "src/features/arena-visual/models/arenaVisualMockupMetrics.test.js",
  "src/features/arena-visual/components/layout/UtilityTopActions.jsx",
  "src/features/arena-visual/components/layout/UtilityMainPanel.jsx",
  "src/features/arena-visual/components/layout/UtilityBottomActions.jsx",
  "src/features/arena-visual/components/layout/ArenaVisualUtilityPanel.jsx"
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing Arena Visual Block 03 file: ${file}`);
}

const metrics = fs.readFileSync(path.join(root, "src/features/arena-visual/models/arenaVisualMockupMetrics.js"), "utf8");
for (const marker of [
  "width: 1650",
  "height: 928",
  "utilityWidthRatio: 0.233",
  "playerLeftRailWidthRatio: 0.091",
  "playerRightRailWidthRatio: 0.061",
  "opponentLeftRailWidthRatio: 0.061",
  "opponentRightRailWidthRatio: 0.091",
  "burstWidthRatioWithinWideRail: 0.68"
]) {
  if (!metrics.includes(marker)) throw new Error(`Mockup proportion marker missing: ${marker}`);
}

const css = fs.readFileSync(path.join(root, "src/features/arena-visual/styles/arenaVisual.css"), "utf8");
for (const marker of [
  "Arena Visual Block 03",
  "--arena-visual-player-left-rail-width",
  "--arena-visual-opponent-right-rail-width",
  "--arena-visual-zone-life-height",
  "--arena-visual-zone-burst-height",
  "--arena-visual-burst-width-ratio",
  ".arena-visual-utility-main-surface"
]) {
  if (!css.includes(marker)) throw new Error(`Arena Visual Block 03 CSS marker missing: ${marker}`);
}

const utility = fs.readFileSync(path.join(root, "src/features/arena-visual/components/layout/ArenaVisualUtilityPanel.jsx"), "utf8");
const legacyComposition = utility.includes("UtilityTopActions") && utility.includes("UtilityMainPanel") && utility.includes("UtilityBottomActions");
const unifiedPhase07Composition = utility.includes("arena-visual-utility-tabs") && utility.includes("arena-visual-context-actions") && utility.includes("InspectorPanel");
const usabilityPassComposition = utility.includes("arena-visual-utility-tabs")
  && utility.includes("arena-visual-system-actions")
  && utility.includes("InspectorPanel")
  && !utility.includes('activeTab === "match"');
if (!legacyComposition && !unifiedPhase07Composition && !usabilityPassComposition) {
  throw new Error("Utility panel must preserve a valid Photoshop-aligned composition, unified Phase 07 dock, or the approved usability-pass dock.");
}

for (const protectedPath of ["src/game", "src/online", "server", "supabase"]) {
  if (!fs.existsSync(path.join(root, protectedPath))) throw new Error(`Protected project path missing: ${protectedPath}`);
}

console.log("Arena Visual Block 03 audit: PASS");
