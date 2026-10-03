import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));

const required = [
  "src/features/arena/components/CardPreview.jsx",
  "src/features/arena/components/ContextPanel.jsx",
  "src/styles/arena/cardPreviewV490.css",
  "src/styles/arena/contextPanelV490.css",
  "docs/arena/phase-6-7.md",
  "docs/arena/visual-cleanup-pending.md"
];

const errors = [];
for (const file of required) {
  if (!exists(file)) errors.push(`Missing required Phase 6/7 file: ${file}`);
}

const forbiddenImports = [
  "/game/reducer",
  "/game/legalActions",
  "/online/",
  "/services/",
  "applyGameAction",
  "onlineClient"
];

for (const file of [
  "src/features/arena/components/CardPreview.jsx",
  "src/features/arena/components/ContextPanel.jsx"
]) {
  if (!exists(file)) continue;
  const source = read(file);
  for (const token of forbiddenImports) {
    if (source.includes(token)) errors.push(`${file} crosses presentation boundary: ${token}`);
  }
}

const simulator = read("src/features/arena/Simulator.jsx");
for (const token of ["<CardPreview", "<ContextPanel", "mode=\"selected\"", "mode=\"hover\""]) {
  if (!simulator.includes(token)) errors.push(`Simulator missing Phase 6/7 integration token: ${token}`);
}

if (simulator.includes('<div\n          className="card-zoom-preview"')) {
  errors.push("Legacy inline card zoom preview remains in Simulator.jsx");
}

const pending = read("docs/arena/visual-cleanup-pending.md");
if (!/Life HUD layout shift/i.test(pending)) {
  errors.push("Life HUD layout-shift bug is not recorded for final Visual cleanup");
}

if (errors.length) {
  console.error("Arena Phase 6/7 audit: FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Arena Phase 6/7 audit: OK");
