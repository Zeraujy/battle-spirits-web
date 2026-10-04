import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "src/features/arena-visual/ArenaVisual.jsx",
  "src/features/arena-visual/components/ArenaVisualShell.jsx",
  "src/features/arena-visual/layout/ArenaVisualLayout.jsx",
  "src/features/arena-visual/components/layout/ArenaVisualPlayerSide.jsx",
  "src/features/arena-visual/components/layout/ArenaVisualUtilityPanel.jsx",
  "src/features/arena-visual/components/zones/ArenaVisualZone.jsx",
  "src/features/arena-visual/components/zones/ArenaVisualSideZones.jsx",
  "src/features/arena-visual/components/zones/ArenaVisualHandZone.jsx",
  "src/features/arena-visual/components/zones/ArenaVisualBattlefield.jsx",
  "src/features/arena-visual/styles/arenaVisualTokens.css",
  "src/features/arena-visual/styles/arenaVisual.css",
  "src/features/arena-visual/models/arenaVisualLayoutModel.js",
  "src/features/arena-visual/playmats/arenaVisualPlaymatRegistry.js",
  "public/assets/arena/resources/core.png",
  "public/assets/arena/resources/soul-core.png"
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    throw new Error(`Missing Arena Visual Block 01 file: ${file}`);
  }
}

const arenaVisualSource = fs.readFileSync(path.join(root, "src/features/arena-visual/ArenaVisual.jsx"), "utf8");
if (/\.\.\/\.\.\/game|\.\.\/\.\.\/online|features\/arena\/Simulator/.test(arenaVisualSource)) {
  throw new Error("Arena Visual foundation must remain isolated from gameplay and production Arena authority.");
}

const css = fs.readFileSync(path.join(root, "src/features/arena-visual/styles/arenaVisual.css"), "utf8");
for (const marker of [
  ".arena-visual-layout",
  ".arena-visual-player-side.is-opponent",
  ".arena-visual-player-side.is-player",
  ".arena-visual-zone-stack",
  ".arena-visual-utility-main"
]) {
  if (!css.includes(marker)) throw new Error(`Missing Arena Visual layout marker: ${marker}`);
}

console.log("Arena Visual Block 01 audit: PASS");
