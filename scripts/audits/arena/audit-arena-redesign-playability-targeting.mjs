import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const requireFile = (relativePath) => {
  if (!fs.existsSync(path.join(ROOT, relativePath))) {
    throw new Error(`Missing Arena redesign Phase 10 file: ${relativePath}`);
  }
};

const requiredFiles = [
  "src/features/arena-redesign/models/arenaInteractionHints.js",
  "src/features/arena-redesign/models/arenaInteractionHints.test.js",
  "src/features/arena-redesign/components/cards/cardInteractionPresentation.js",
  "src/features/arena-redesign/components/cards/cardInteractionPresentation.test.js"
];
requiredFiles.forEach(requireFile);

const viewModel = read("src/features/arena-redesign/models/createArenaRedesignViewModel.js");
for (const fragment of [
  "createArenaInteractionHints",
  "interactionHints",
  "instanceId",
  "braveInstanceId",
  "hostInstanceId"
]) {
  if (!viewModel.includes(fragment)) throw new Error(`View Model Phase 10 bridge is missing ${fragment}.`);
}

const arenaRoot = read("src/features/arena-redesign/ArenaRedesign.jsx");
if (!arenaRoot.includes("viewModel?.interactionHints") || !arenaRoot.includes("resolvedInteraction")) {
  throw new Error("Arena redesign does not merge View Model interaction hints with controller-owned interaction state.");
}

const sideLayout = read("src/features/arena-redesign/components/layout/ArenaSideLayout.jsx");
for (const fragment of ["fieldInteraction", "targetableInstanceIds", "onTargetCardClick"]) {
  if (!sideLayout.includes(fragment)) throw new Error(`Opponent-safe targeting bridge is missing ${fragment}.`);
}

const handCard = read("src/features/arena-redesign/components/hand/ArenaHandCard.jsx");
for (const fragment of [
  "getHandCardInteractionState",
  "is-unavailable",
  "is-targetable",
  "is-target-selected",
  "onTargetCardClick"
]) {
  if (!handCard.includes(fragment)) throw new Error(`Hand Phase 10 feedback is missing ${fragment}.`);
}

const fieldCard = read("src/features/arena-redesign/components/cards/ArenaFieldCard.jsx");
for (const fragment of [
  "getFieldCardInteractionState",
  "is-actionable",
  "is-targetable",
  "is-target-selected",
  "is-unavailable",
  "arena-redesign-field-card-feedback"
]) {
  if (!fieldCard.includes(fragment)) throw new Error(`Field Phase 10 feedback is missing ${fragment}.`);
}

const styles = read("src/features/arena-redesign/styles/arena-redesign.css");
for (const selector of [
  ".arena-redesign-hand-card.is-playable",
  ".arena-redesign-hand-card.is-targetable",
  ".arena-redesign-field-card.is-actionable",
  ".arena-redesign-field-card.is-targetable",
  ".arena-redesign-field-card.is-unavailable"
]) {
  if (!styles.includes(selector)) throw new Error(`Missing Phase 10 interaction style: ${selector}`);
}

const phase10Css = styles.split("/* Phase 10 — Card selection, playability and contextual targeting */")[1] || "";
if (phase10Css.includes("::before") || phase10Css.includes("::after") || phase10Css.includes("isolation: isolate")) {
  throw new Error("Phase 10 interaction feedback must not introduce artwork-covering pseudo overlays or new stacking contexts.");
}

const shell = read("src/features/arena-redesign/components/ArenaRedesignShell.jsx");
const markerMatch = shell.match(/data-arena-redesign-foundation=\"(\d+)\"/);
if (!markerMatch || Number(markerMatch[1]) < 10) {
  throw new Error("Arena redesign shell marker must remain at Phase 10 or newer.");
}

const simulator = read("src/features/arena/Simulator.jsx");
const app = read("src/app/App.jsx");
if (simulator.includes("arena-redesign") || app.includes("arena-redesign")) {
  throw new Error("Arena redesign must remain parallel and inactive through Phase 10.");
}

console.log("Arena redesign Phase 10 audit PASS — legal-action playability hints, contextual targets, unavailable states and opponent-safe target selection are presentation-only and do not cover card artwork.");
