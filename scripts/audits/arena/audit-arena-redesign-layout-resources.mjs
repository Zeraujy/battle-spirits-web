import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function requireFile(relativePath) {
  if (!fs.existsSync(path.join(ROOT, relativePath))) {
    throw new Error(`Missing Arena redesign Phase 04-06 file: ${relativePath}`);
  }
}

const requiredFiles = [
  "src/features/arena-redesign/components/layout/ArenaSideLayout.jsx",
  "src/features/arena-redesign/components/zones/ArenaZone.jsx",
  "src/features/arena-redesign/components/zones/BattlefieldZone.jsx",
  "src/features/arena-redesign/components/zones/HandZone.jsx",
  "src/features/arena-redesign/components/zones/LifeZone.jsx",
  "src/features/arena-redesign/components/zones/BurstZone.jsx",
  "src/features/arena-redesign/components/zones/ReserveZone.jsx",
  "src/features/arena-redesign/components/zones/DeckZone.jsx",
  "src/features/arena-redesign/components/zones/TrashZone.jsx",
  "src/features/arena-redesign/components/zones/TrashCoreZone.jsx",
  "src/features/arena-redesign/components/zones/VoidZone.jsx",
  "src/features/arena-redesign/components/resources/CoreToken.jsx",
  "src/features/arena-redesign/components/resources/CorePool.jsx",
  "src/features/arena-redesign/components/resources/CoreResourceZone.jsx",
  "public/assets/game-resources/core.png",
  "public/assets/game-resources/soul-core.png"
];

requiredFiles.forEach(requireFile);

const sideLayout = read(
  "src/features/arena-redesign/components/layout/ArenaSideLayout.jsx"
);

for (const requiredZone of [
  "LifeZone",
  "BurstZone",
  "ReserveZone",
  "DeckZone",
  "TrashZone",
  "TrashCoreZone",
  "VoidZone",
  "BattlefieldZone",
  "HandZone"
]) {
  if (!sideLayout.includes(requiredZone)) {
    throw new Error(`Arena side layout is missing ${requiredZone}.`);
  }
}

if (
  !sideLayout.includes('side="opponent"') &&
  !sideLayout.includes('side = "player"')
) {
  throw new Error("Arena side layout does not expose the shared player/opponent side contract.");
}

const coreToken = read(
  "src/features/arena-redesign/components/resources/CoreToken.jsx"
);

if (
  !coreToken.includes('"/assets/game-resources/core.png"') ||
  !coreToken.includes('"/assets/game-resources/soul-core.png"')
) {
  throw new Error("Core presentation does not use the canonical Core and Soul Core assets.");
}

const redesignRoot = read("src/features/arena-redesign/ArenaRedesign.jsx");
if (!redesignRoot.includes("ArenaSideLayout")) {
  throw new Error("Arena redesign root is not connected to the Phase 04 field layout.");
}

const shell = read(
  "src/features/arena-redesign/components/ArenaRedesignShell.jsx"
);
const phaseMarker = Number(shell.match(/data-arena-redesign-foundation="(\d+)"/)?.[1] || 0);
if (phaseMarker < 8) {
  throw new Error("Arena redesign shell marker must be at least Phase 08.");
}

const styles = read(
  "src/features/arena-redesign/styles/arena-redesign.css"
);

for (const selector of [
  ".arena-redesign-player-side",
  ".arena-redesign-zone-battlefield",
  ".arena-redesign-zone-hand",
  ".arena-redesign-core-token",
  ".arena-redesign-resource-zone"
]) {
  if (!styles.includes(selector)) {
    throw new Error(`Missing Arena redesign layout/resource style: ${selector}`);
  }
}

const simulator = read("src/features/arena/Simulator.jsx");
const app = read("src/app/App.jsx");
if (simulator.includes("arena-redesign") || app.includes("arena-redesign")) {
  throw new Error("Arena redesign must remain parallel and inactive through Phase 06.");
}

console.log(
  "Arena redesign Phase 04-06 audit PASS — mirrored field layout, gameplay zones and Core/Soul Core presentation are present while production Arena remains untouched."
);
