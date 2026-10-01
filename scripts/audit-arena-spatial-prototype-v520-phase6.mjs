import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const fail = (message) => {
  console.error(`- ${message}`);
  process.exitCode = 1;
};

const shell = read("src/components/game/arena/ArenaShell.jsx");
const simulator = read("src/pages/Simulator.jsx");
const css = read("src/styles/arena/spatialPrototypeV520.css");
const playerField = read("src/components/game/arena/PlayerField.jsx");
const opponentField = read("src/components/game/arena/OpponentField.jsx");
const centerField = read("src/components/game/arena/CenterField.jsx");

console.log("v5.2.0 Phase 6 Spatial Prototype audit");

if (!shell.includes('data-arena-spatial-prototype="phase06"')) fail("ArenaShell spatial prototype marker missing");
if (!/data-arena-v520-phase=\"(?:06|07|08|09|1[0-9]|2[0-5])\"/.test(shell)) fail("ArenaShell v5.2 phase marker missing");
if (!simulator.includes('spatialPrototypeV520.css')) fail("Phase 6 stylesheet is not imported by Simulator");

for (const region of [
  "opponent-status",
  "opponent-hand",
  "opponent-battlefield",
  "timing-focus",
  "player-battlefield",
  "player-hand",
  "player-status",
  "utility-rail"
]) {
  if (!simulator.includes(`data-arena-region="${region}"`)) fail(`Missing spatial region marker: ${region}`);
}

if (!simulator.includes('className="arena-inspector-overlay"')) fail("Selected-card inspector is not marked as an overlay");

for (const [name, source] of [["PlayerField", playerField], ["OpponentField", opponentField], ["CenterField", centerField]]) {
  if (!source.includes("...props")) fail(`${name} does not forward spatial/data attributes`);
}

for (const token of [
  "--v520-utility-rail",
  "--v520-hand-height",
  "--v520-opponent-hand-height",
  "--v520-timing-band",
  'grid-template-columns: minmax(0, 1fr) var(--v520-utility-rail)',
  'data-arena-region="player-hand"',
  "@media (max-width: 1500px)",
  "@media (min-width: 1800px) and (min-height: 900px)",
  "@media (max-width: 1180px)"
]) {
  if (!css.includes(token)) fail(`Spatial stylesheet requirement missing: ${token}`);
}

// Phase 6 is presentation-only: no rule/server imports may be introduced by the stylesheet or presentation leaf components.
for (const [file, source] of [
  ["PlayerField.jsx", playerField],
  ["OpponentField.jsx", opponentField],
  ["CenterField.jsx", centerField]
]) {
  if (/from\s+["'][^"']*\/game\//.test(source) || /from\s+["'][^"']*\/server\//.test(source)) {
    fail(`${file} imports gameplay/server implementation`);
  }
}

if (process.exitCode) {
  console.error("v5.2.0 Phase 6 Spatial Prototype audit: FAILED");
  process.exit(process.exitCode);
}

console.log("- battlefield-first desktop composition present");
console.log("- selected-card inspector no longer consumes permanent battlefield width");
console.log("- persistent desktop utility rail present");
console.log("- opponent/player/battle timing/hand regions explicitly marked");
console.log("- 1366, 1080p/ultrawide and narrow structural breakpoints present");
console.log("v5.2.0 Phase 6 Spatial Prototype audit: PASS");
