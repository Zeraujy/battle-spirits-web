import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const issues = [];
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

const pkg = JSON.parse(read("package.json"));
const versionParts = String(pkg.version || "0.0.0").split(".").map(Number);
if (versionParts[0] < 4 || (versionParts[0] === 4 && versionParts[1] < 9)) {
  issues.push(`Arena final QA requires release >=4.9.x, found ${pkg.version}`);
}

const versionExpectations = [
  ["src/config/appVersion.js", `APP_VERSION = "${pkg.version}"`],
  ["server/index.mjs", `version: "${pkg.version}"`],
  ["src/pages/Simulator.jsx", `Eternal v${pkg.version}`],
  ["src/components/common/ProjectInfoButtons.jsx", `version: "${pkg.version}"`]
];
for (const [rel, needle] of versionExpectations) {
  if (!read(rel).includes(needle)) issues.push(`Version sync missing in ${rel}`);
}

const required = [
  "src/components/game/arena/ArenaShell.jsx",
  "src/components/game/arena/Battlefield.jsx",
  "src/components/game/arena/ArenaHUD.jsx",
  "src/components/game/arena/CardPreview.jsx",
  "src/components/game/arena/ContextPanel.jsx",
  "src/components/game/arena/ActionBar.jsx",
  "src/components/game/arena/PhaseTracker.jsx",
  "src/components/game/arena/TargetingUX.jsx",
  "src/components/game/arena/CardMotionLayer.jsx",
  "src/components/game/arena/ArenaOverlayLayer.jsx",
  "src/components/game/arena/BurstPresentation.jsx",
  "src/components/game/arena/GameLogDrawer.jsx",
  "src/components/game/arena/GameEventToast.jsx",
  "docs/arena/PHASE-22-23-FINAL-QA.md",
  "docs/changelog/CHANGELOG-4.9.0.md"
];
for (const rel of required) if (!exists(rel)) issues.push(`Missing final release artifact: ${rel}`);

const arenaFiles = required.filter((rel) => rel.endsWith(".jsx") && exists(rel));
const forbiddenImports = [/src\/game\//, /src\/online\//, /src\/services\//, /server\//];
for (const rel of arenaFiles) {
  const src = read(rel);
  for (const pattern of forbiddenImports) {
    if (pattern.test(src)) issues.push(`Presentation component imports gameplay/online/service layer: ${rel} -> ${pattern}`);
  }
}

const overlay = exists("src/components/game/arena/ArenaOverlayLayer.jsx") ? read("src/components/game/arena/ArenaOverlayLayer.jsx") : "";
const overlayCssCandidates = ["src/styles/arena/arenaOverlay.css", "src/styles/arena/arenaOverlayLayer.css", "src/styles/arena/arenaOverlays.css"];
const overlayCss = overlayCssCandidates.filter(exists).map(read).join("\n");
if (!/ArenaOverlayLayer/.test(overlay) && !/arena-overlay-layer/.test(overlay)) issues.push("ArenaOverlayLayer implementation marker missing");
if (overlayCss && !/pointer-events\s*:\s*none/i.test(overlayCss)) issues.push("Arena overlay root must remain pointer-transparent by default");

const motion = exists("src/components/game/arena/CardMotionLayer.jsx") ? read("src/components/game/arena/CardMotionLayer.jsx") : "";
if (/dispatch\s*\(|onlineClient|applyGameAction/.test(motion)) issues.push("CardMotionLayer must not dispatch gameplay or Online actions");

const verifyScript = pkg.scripts?.verify || "";
for (const name of ["audit-arena-phase01.mjs","audit-arena-phase23.mjs","audit-arena-phase45.mjs","audit-arena-phase67.mjs","audit-arena-phase89.mjs","audit-arena-phase1314.mjs","audit-arena-phase1618.mjs","audit-arena-phase1921.mjs"]) {
  if (!verifyScript.includes(name)) issues.push(`Final verify no longer includes ${name}`);
}

if (issues.length) {
  console.error("Arena Phase 22/23 Final QA audit: FAILED");
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}
console.log(`Arena Phase 22/23 Final QA audit: OK — Arena v4.9 lineage preserved in v${pkg.version}`);
