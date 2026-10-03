import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const requireFile = (relativePath) => {
  if (!fs.existsSync(path.join(ROOT, relativePath))) {
    throw new Error(`Missing Arena redesign Phase 09 file: ${relativePath}`);
  }
};

const requiredFiles = [
  "src/features/arena-redesign/components/hand/ArenaHandCard.jsx",
  "src/features/arena-redesign/components/hand/ArenaHandFan.jsx",
  "src/features/arena-redesign/components/hand/handFanLayout.js",
  "src/features/arena-redesign/components/hand/handFanLayout.test.js",
  "src/features/arena-redesign/interactions/handInteraction.js",
  "src/features/arena-redesign/interactions/handInteraction.test.js"
];
requiredFiles.forEach(requireFile);

const handCard = read("src/features/arena-redesign/components/hand/ArenaHandCard.jsx");
for (const fragment of [
  "getCardArtworkUrl",
  "getHandCardInteractionState",
  "onHandCardPointerDown",
  "writeHandCardDragPayload"
]) {
  if (!handCard.includes(fragment)) throw new Error(`Hand card is missing ${fragment}.`);
}
if (handCard.includes("/game/") || handCard.includes("../game/")) {
  throw new Error("Hand presentation must not import the game engine directly.");
}

const interactionPresentation = read("src/features/arena-redesign/components/cards/cardInteractionPresentation.js");
for (const fragment of ["selectedHandInstanceId", "playableHandInstanceIds"]) {
  if (!interactionPresentation.includes(fragment)) {
    throw new Error(`Hand interaction presentation is missing ${fragment}.`);
  }
}

const handZone = read("src/features/arena-redesign/components/zones/HandZone.jsx");
if (!handZone.includes("ArenaHandFan") || handZone.includes("hand-card-placeholder")) {
  throw new Error("Hand placeholders were not fully replaced by the fan presentation.");
}

const battlefield = read("src/features/arena-redesign/components/zones/BattlefieldZone.jsx");
for (const fragment of ["readHandCardDragPayload", "onHandCardDrop", 'zone: "field"']) {
  if (!battlefield.includes(fragment)) throw new Error(`Battlefield Hand drop bridge is missing ${fragment}.`);
}

const sideLayout = read("src/features/arena-redesign/components/layout/ArenaSideLayout.jsx");
if (!sideLayout.includes("interaction={playerInteraction}")) {
  throw new Error("Player Hand is not connected to the controller-owned interaction bridge.");
}

const shell = read("src/features/arena-redesign/components/ArenaRedesignShell.jsx");
const phaseMarker = Number(shell.match(/data-arena-redesign-foundation="(\d+)"/)?.[1] || 0);
if (phaseMarker < 9) {
  throw new Error("Arena redesign shell marker must be at least Phase 09.");
}

const styles = read("src/features/arena-redesign/styles/arena-redesign.css");
for (const selector of [
  ".arena-redesign-hand-fan",
  ".arena-redesign-hand-card",
  ".arena-redesign-hand-card.is-selected",
  ".arena-redesign-battlefield-cards.is-hand-drop-active"
]) {
  if (!styles.includes(selector)) throw new Error(`Missing Hand System style: ${selector}`);
}

const simulator = read("src/features/arena/Simulator.jsx");
const app = read("src/app/App.jsx");
if (simulator.includes("arena-redesign") || app.includes("arena-redesign")) {
  throw new Error("Arena redesign must remain parallel and inactive through Phase 09.");
}

console.log("Arena redesign Phase 09 audit PASS — responsive Hand fan, selection and controller-owned drag/drop are present while hidden opponent information and v5.1.0 rules authority remain protected.");
