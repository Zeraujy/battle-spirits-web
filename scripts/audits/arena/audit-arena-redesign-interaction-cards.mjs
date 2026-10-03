import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function requireFile(relativePath) {
  if (!fs.existsSync(path.join(ROOT, relativePath))) {
    throw new Error(`Missing Arena redesign Phase 07-08 file: ${relativePath}`);
  }
}

const requiredFiles = [
  "src/features/arena-redesign/interactions/coreInteraction.js",
  "src/features/arena-redesign/interactions/coreInteraction.test.js",
  "src/features/arena-redesign/components/cards/ArenaFieldCard.jsx",
  "src/features/arena-redesign/components/cards/fieldCardPresentation.js",
  "src/features/arena-redesign/components/cards/fieldCardPresentation.test.js"
];
requiredFiles.forEach(requireFile);

const coreToken = read("src/features/arena-redesign/components/resources/CoreToken.jsx");
for (const fragment of [
  "createCoreInteractionPayload",
  "writeCoreDragPayload",
  "onCoreClick",
  "selectedCore"
]) {
  if (!coreToken.includes(fragment)) {
    throw new Error(`Core token interaction contract is missing ${fragment}.`);
  }
}

const reserve = read("src/features/arena-redesign/components/zones/ReserveZone.jsx");
if (!reserve.includes("canMoveCores") || !reserve.includes("interaction={interaction}")) {
  throw new Error("Reserve is not connected to the controller-owned Core interaction bridge.");
}

const life = read("src/features/arena-redesign/components/zones/LifeZone.jsx");
if (!life.includes("interactive={false}")) {
  throw new Error("Life must remain read-only for manual Core movement under current v5.1.0 rules.");
}

const field = read("src/features/arena-redesign/components/zones/BattlefieldZone.jsx");
if (!field.includes("ArenaFieldCard") || field.includes("field-card-placeholder")) {
  throw new Error("Battlefield placeholders were not fully replaced by official card presentation.");
}

const fieldCard = read("src/features/arena-redesign/components/cards/ArenaFieldCard.jsx");
for (const fragment of [
  "getCardArtworkUrl",
  "arena-redesign-field-card-status",
  "CorePool",
  'zone="card"',
  "onCoreMove"
]) {
  if (!fieldCard.includes(fragment)) {
    throw new Error(`Field-card presentation is missing ${fragment}.`);
  }
}
if (fieldCard.includes("/game/") || fieldCard.includes("../game/")) {
  throw new Error("Arena redesign card presentation must not import the game engine directly.");
}

const repository = read("src/services/cards/cardRepository.js");
if (!repository.includes("export function getCardById") || !repository.includes("export function getCardArtworkUrl")) {
  throw new Error("Card service does not expose the presentation-safe lookup required by the redesign.");
}

const shell = read("src/features/arena-redesign/components/ArenaRedesignShell.jsx");
const phaseMarker = Number(shell.match(/data-arena-redesign-foundation="(\d+)"/)?.[1] || 0);
if (phaseMarker < 8) {
  throw new Error("Arena redesign shell marker must be at least Phase 08.");
}

const styles = read("src/features/arena-redesign/styles/arena-redesign.css");
for (const selector of [
  ".arena-redesign-field-card",
  ".arena-redesign-field-card-art-frame",
  ".arena-redesign-field-card-status",
  ".arena-redesign-field-card-cores",
  ".arena-redesign-core-token.is-interactive"
]) {
  if (!styles.includes(selector)) {
    throw new Error(`Missing Arena redesign interaction/card style: ${selector}`);
  }
}

const simulator = read("src/features/arena/Simulator.jsx");
const app = read("src/app/App.jsx");
if (simulator.includes("arena-redesign") || app.includes("arena-redesign")) {
  throw new Error("Arena redesign must remain parallel and inactive through Phase 08.");
}

console.log(
  "Arena redesign Phase 07-08 audit PASS — controller-owned Core interactions and official field-card presentation are present without changing v5.1.0 rules authority."
);
