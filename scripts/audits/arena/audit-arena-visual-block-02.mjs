import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "src/features/arena-visual/components/resources/ArenaVisualCoreToken.jsx",
  "src/features/arena-visual/components/resources/ArenaVisualCorePool.jsx",
  "src/features/arena-visual/components/hand/ArenaVisualHandCard.jsx",
  "src/features/arena-visual/components/hand/ArenaVisualHandFan.jsx",
  "src/features/arena-visual/components/hand/handFanLayout.js",
  "src/features/arena-visual/components/hand/handFanLayout.test.js",
  "src/features/arena-visual/components/battlefield/ArenaVisualBattlefieldCard.jsx",
  "public/assets/arena/resources/core.png",
  "public/assets/arena/resources/soul-core.png"
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing Arena Visual Block 02 file: ${file}`);
}

const hand = fs.readFileSync(path.join(root, "src/features/arena-visual/components/hand/ArenaVisualHandCard.jsx"), "utf8");
if (!hand.includes("/images/card-back.webp")) throw new Error("Opponent Hand must retain card-back rendering.");

const core = fs.readFileSync(path.join(root, "src/features/arena-visual/components/resources/ArenaVisualCoreToken.jsx"), "utf8");
if (!core.includes("/assets/arena/resources/core.png") || !core.includes("/assets/arena/resources/soul-core.png")) {
  throw new Error("Core presentation must use the supplied Core and Soul Core artwork.");
}

const battlefield = fs.readFileSync(path.join(root, "src/features/arena-visual/components/battlefield/ArenaVisualBattlefieldCard.jsx"), "utf8");
const legacyCorePool = battlefield.includes("ArenaVisualCorePool");
const overlayCorePresentation = battlefield.includes("ArenaVisualCardCoreOverlay");
if ((!legacyCorePool && !overlayCorePresentation) || !battlefield.includes("arena-visual-field-card-meta")) {
  throw new Error("Battlefield presentation must expose clean Core and card metadata presentation.");
}

for (const protectedPath of ["src/game", "src/online", "server", "supabase"]) {
  if (!fs.existsSync(path.join(root, protectedPath))) throw new Error(`Protected project path missing: ${protectedPath}`);
}

console.log("Arena Visual Block 02 audit: PASS");
