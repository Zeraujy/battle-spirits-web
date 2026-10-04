import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const required = [
  "src/features/arena-redesign/hooks/useArenaResponsiveProfile.js",
  "src/features/arena-redesign/models/responsiveArenaPresentation.js",
  "src/features/arena-redesign/models/responsiveArenaPresentation.test.js",
  "src/features/arena-redesign/interactions/handInteraction.js",
  "src/features/arena-redesign/components/hand/ArenaHandCard.jsx",
  "src/features/arena-redesign/styles/arena-redesign.css"
];

for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) {
    throw new Error(`Arena redesign responsive/touch audit failed: missing ${relative}`);
  }
}

const shell = fs.readFileSync(path.join(root, "src/features/arena-redesign/components/ArenaRedesignShell.jsx"), "utf8");
const phaseMarker = shell.match(/data-arena-redesign-foundation=\"(\d+)\"/);
if (!phaseMarker || Number(phaseMarker[1]) < 14) {
  throw new Error("Arena redesign responsive/touch audit failed: Phase 14+ marker is missing.");
}
for (const requiredMarker of ["data-arena-viewport", "data-arena-input", "useArenaResponsiveProfile"]) {
  if (!shell.includes(requiredMarker)) {
    throw new Error(`Arena redesign responsive/touch audit failed: shell is missing ${requiredMarker}.`);
  }
}

const model = fs.readFileSync(path.join(root, "src/features/arena-redesign/models/responsiveArenaPresentation.js"), "utf8");
for (const tier of ["desktop-wide", "desktop", "laptop", "tablet-landscape", "mobile-landscape"]) {
  if (!model.includes(tier)) {
    throw new Error(`Arena redesign responsive/touch audit failed: missing viewport tier ${tier}.`);
  }
}

const css = fs.readFileSync(path.join(root, "src/features/arena-redesign/styles/arena-redesign.css"), "utf8");
for (const selector of [
  '[data-arena-viewport="desktop-wide"]',
  '[data-arena-viewport="laptop"]',
  '[data-arena-viewport="tablet-landscape"]',
  '[data-arena-viewport="mobile-landscape"]',
  '[data-arena-input="touch"]',
  "prefers-reduced-motion"
]) {
  if (!css.includes(selector)) {
    throw new Error(`Arena redesign responsive/touch audit failed: CSS is missing ${selector}.`);
  }
}

const phase14Css = css.slice(css.indexOf("/* Phase 14 — Responsive and Touch Adaptation */"));
if (!phase14Css.includes(".arena-redesign-zone-void") || !phase14Css.includes("display: block")) {
  throw new Error("Arena redesign responsive/touch audit failed: secondary Void zone is not restored at compact tiers.");
}

const handCard = fs.readFileSync(path.join(root, "src/features/arena-redesign/components/hand/ArenaHandCard.jsx"), "utf8");
for (const bridge of ["onPointerMove", "onPointerUp", "onPointerCancel", "onHandCardDrop", "getTouchHandDropTarget"]) {
  if (!handCard.includes(bridge)) {
    throw new Error(`Arena redesign responsive/touch audit failed: Hand touch bridge is missing ${bridge}.`);
  }
}

for (const forbidden of ["applyGameAction", "resolveEffect", "src/game", "src/online", "server/"]) {
  if (handCard.includes(forbidden) || model.includes(forbidden)) {
    throw new Error(`Arena redesign responsive/touch audit failed: presentation layer crosses authority boundary (${forbidden}).`);
  }
}

console.log("Arena Redesign Phase 14 Responsive and Touch Adaptation audit: PASS");
