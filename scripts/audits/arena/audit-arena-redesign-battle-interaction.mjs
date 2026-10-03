import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const required = [
  "src/features/arena-redesign/components/battle/BattleFocus.jsx",
  "src/features/arena-redesign/components/battle/AttackConnector.jsx",
  "src/features/arena-redesign/components/battle/TargetingLayer.jsx",
  "src/features/arena-redesign/components/battle/TargetMarker.jsx",
  "src/features/arena-redesign/components/battle/BattleStatus.jsx",
  "src/features/arena-redesign/models/battleInteractionPresentation.js",
  "src/features/arena-redesign/models/battleInteractionPresentation.test.js"
];

for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) {
    throw new Error(`Arena redesign battle interaction audit failed: missing ${relative}`);
  }
}

const shell = fs.readFileSync(path.join(root, "src/features/arena-redesign/components/ArenaRedesignShell.jsx"), "utf8");
if (!shell.includes('data-arena-redesign-foundation="11"')) {
  throw new Error("Arena redesign battle interaction audit failed: Phase 11 marker is missing.");
}

const rootSource = fs.readFileSync(path.join(root, "src/features/arena-redesign/ArenaRedesign.jsx"), "utf8");
for (const token of ["BattleFocus", "TargetingLayer"]) {
  if (!rootSource.includes(token)) {
    throw new Error(`Arena redesign battle interaction audit failed: ${token} is not mounted.`);
  }
}

const presentationSource = fs.readFileSync(path.join(root, "src/features/arena-redesign/models/battleInteractionPresentation.js"), "utf8");
const forbiddenImports = ["src/game", "../../game", "../../../game", "src/online", "server/"];
for (const forbidden of forbiddenImports) {
  if (presentationSource.includes(forbidden)) {
    throw new Error(`Arena redesign battle interaction audit failed: presentation model crosses authority boundary (${forbidden}).`);
  }
}

const fieldCard = fs.readFileSync(path.join(root, "src/features/arena-redesign/components/cards/ArenaFieldCard.jsx"), "utf8");
if (!fieldCard.includes("TargetMarker")) {
  throw new Error("Arena redesign battle interaction audit failed: target marker is not connected to field cards.");
}

console.log("Arena Redesign Phase 11 battle interaction audit: PASS");
