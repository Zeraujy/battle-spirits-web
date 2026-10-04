import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "src/features/arena-visual/models/arenaVisualResponsiveProfiles.js",
  "src/features/arena-visual/models/arenaVisualResponsiveProfiles.test.js",
  "src/features/arena-visual/models/arenaVisualVerticalMirror.test.js",
  "src/features/arena-visual/hooks/useArenaVisualResponsiveProfile.js"
];
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing Arena Visual Block 04 file: ${file}`);
}

const metrics = fs.readFileSync(path.join(root, "src/features/arena-visual/models/arenaVisualMockupMetrics.js"), "utf8");
for (const marker of [
  "playerLeftRailWidthRatio: 0.091",
  "opponentLeftRailWidthRatio: 0.061",
  "playerRightRailWidthRatio: 0.061",
  "opponentRightRailWidthRatio: 0.091"
]) {
  if (!metrics.includes(marker)) throw new Error(`Vertical mirror metric missing: ${marker}`);
}

const zones = fs.readFileSync(path.join(root, "src/features/arena-visual/components/zones/ArenaVisualSideZones.jsx"), "utf8");
for (const marker of [
  'const opponentLeft = [...playerRight].reverse();',
  'const opponentRight = [...playerLeft].reverse();',
  'side === "opponent"'
]) {
  if (!zones.includes(marker)) throw new Error(`Opponent Photoshop fidelity marker missing: ${marker}`);
}

const css = fs.readFileSync(path.join(root, "src/features/arena-visual/styles/arenaVisual.css"), "utf8");
for (const marker of [
  "Arena Visual Block 04",
  'data-responsive-profile="tablet-landscape"',
  'data-responsive-profile="compact-landscape"',
  "Keep all secondary zones visible"
]) {
  if (!css.includes(marker)) throw new Error(`Arena Visual Block 04 CSS marker missing: ${marker}`);
}

const shell = fs.readFileSync(path.join(root, "src/features/arena-visual/components/ArenaVisualShell.jsx"), "utf8");
if (!shell.includes("data-responsive-profile={responsiveProfile.id}")) {
  throw new Error("Arena Visual shell must expose the active responsive profile.");
}

console.log("Arena Visual Block 04 audit: PASS");
