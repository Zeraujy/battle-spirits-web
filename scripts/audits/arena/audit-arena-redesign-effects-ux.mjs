import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const required = [
  "src/features/arena-redesign/components/effects/ArenaEffectResolutionLayer.jsx",
  "src/features/arena-redesign/components/effects/BurstRevealOverlay.jsx",
  "src/features/arena-redesign/components/effects/FlashWindow.jsx",
  "src/features/arena-redesign/components/effects/EffectResolutionPanel.jsx",
  "src/features/arena-redesign/components/effects/TargetSelectionPrompt.jsx",
  "src/features/arena-redesign/components/effects/ChoicePrompt.jsx",
  "src/features/arena-redesign/models/effectResolutionPresentation.js",
  "src/features/arena-redesign/models/effectResolutionPresentation.test.js"
];

for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) {
    throw new Error(`Arena redesign effects UX audit failed: missing ${relative}`);
  }
}

const shell = fs.readFileSync(path.join(root, "src/features/arena-redesign/components/ArenaRedesignShell.jsx"), "utf8");
const phaseMarker = shell.match(/data-arena-redesign-foundation=\"(\d+)\"/);
if (!phaseMarker || Number(phaseMarker[1]) < 13) {
  throw new Error("Arena redesign effects UX audit failed: Phase 13-or-newer marker is missing.");
}

const arenaRoot = fs.readFileSync(path.join(root, "src/features/arena-redesign/ArenaRedesign.jsx"), "utf8");
if (!arenaRoot.includes("ArenaEffectResolutionLayer") || !arenaRoot.includes("onEffectActionRequest")) {
  throw new Error("Arena redesign effects UX audit failed: effect layer/controller bridge is not mounted.");
}

const model = fs.readFileSync(path.join(root, "src/features/arena-redesign/models/effectResolutionPresentation.js"), "utf8");
for (const forbidden of ["src/game", "../../game", "../../../game", "src/online", "server/", "applyGameAction", "dispatch("]) {
  if (model.includes(forbidden)) {
    throw new Error(`Arena redesign effects UX audit failed: presentation model crosses authority boundary (${forbidden}).`);
  }
}

for (const relative of required.filter((entry) => entry.endsWith(".jsx"))) {
  const source = fs.readFileSync(path.join(root, relative), "utf8");
  for (const forbidden of ["applyGameAction", "resolveEffect", "dispatch(", "src/game", "src/online", "server/"]) {
    if (source.includes(forbidden)) {
      throw new Error(`Arena redesign effects UX audit failed: ${relative} contains forbidden authority logic (${forbidden}).`);
    }
  }
}

const viewModel = fs.readFileSync(path.join(root, "src/features/arena-redesign/models/createArenaRedesignViewModel.js"), "utf8");
if (!viewModel.includes("normalizeEffectDecision") || !viewModel.includes("normalizeBurstOpportunity")) {
  throw new Error("Arena redesign effects UX audit failed: effect/burst state is not sanitized by the View Model.");
}

console.log("Arena Redesign Phase 13 Burst, Flash and Effect Resolution UX audit: PASS");
