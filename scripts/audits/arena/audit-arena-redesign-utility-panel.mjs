import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const required = [
  "src/features/arena-redesign/components/utility/ArenaUtilityPanel.jsx",
  "src/features/arena-redesign/components/utility/TurnStatusPanel.jsx",
  "src/features/arena-redesign/components/utility/PhaseTracker.jsx",
  "src/features/arena-redesign/components/utility/PrimaryActionPanel.jsx",
  "src/features/arena-redesign/components/utility/RecentActionPanel.jsx",
  "src/features/arena-redesign/components/utility/GameLogPanel.jsx",
  "src/features/arena-redesign/components/utility/ArenaChatPanel.jsx",
  "src/features/arena-redesign/models/utilityPanelPresentation.js",
  "src/features/arena-redesign/models/utilityPanelPresentation.test.js"
];

for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) {
    throw new Error(`Arena redesign utility panel audit failed: missing ${relative}`);
  }
}

const shell = fs.readFileSync(path.join(root, "src/features/arena-redesign/components/ArenaRedesignShell.jsx"), "utf8");
const phaseMarker = Number(shell.match(/data-arena-redesign-foundation="(\d+)"/)?.[1] || 0);
if (phaseMarker < 12) {
  throw new Error("Arena redesign utility panel audit failed: Phase 12 or newer marker is missing.");
}

const rootSource = fs.readFileSync(path.join(root, "src/features/arena-redesign/ArenaRedesign.jsx"), "utf8");
if (!rootSource.includes("ArenaUtilityPanel") || !rootSource.includes("onUtilityActionRequest")) {
  throw new Error("Arena redesign utility panel audit failed: default panel/controller bridge is not mounted.");
}

const model = fs.readFileSync(path.join(root, "src/features/arena-redesign/models/utilityPanelPresentation.js"), "utf8");
for (const forbidden of ["src/game", "../../game", "../../../game", "src/online", "server/"]) {
  if (model.includes(forbidden)) {
    throw new Error(`Arena redesign utility panel audit failed: presentation model crosses authority boundary (${forbidden}).`);
  }
}

const primary = fs.readFileSync(path.join(root, "src/features/arena-redesign/components/utility/PrimaryActionPanel.jsx"), "utf8");
if (primary.includes("dispatch(") || primary.includes("applyGameAction")) {
  throw new Error("Arena redesign utility panel audit failed: PrimaryActionPanel must not dispatch Rules Engine actions.");
}

console.log("Arena Redesign Phase 12 right utility panel audit: PASS");
