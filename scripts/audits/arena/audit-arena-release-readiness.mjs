import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const issues = [];
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

const pkg = JSON.parse(read("package.json"));
const versionParts = String(pkg.version || "0.0.0").split(".").map(Number);
if (versionParts[0] < 4 || (versionParts[0] === 4 && versionParts[1] < 9)) {
  issues.push(`Arena final QA requires release >=4.9.x, found ${pkg.version}`);
}

const versionExpectations = [
  ["src/app/config/app-version.js", `APP_VERSION = "${pkg.version}"`],
  ["server/index.mjs", `version: "${pkg.version}"`],
  ["src/features/arena/Simulator.jsx", `Eternal v${pkg.version}`],
  ["src/components/common/ProjectInfoButtons.jsx", `version: "${pkg.version}"`]
];
for (const [rel, needle] of versionExpectations) {
  if (!read(rel).includes(needle)) issues.push(`Version sync missing in ${rel}`);
}

const required = [
  "src/features/arena/components/ArenaShell.jsx",
  "src/features/arena/components/Battlefield.jsx",
  "src/features/arena/components/ArenaHUD.jsx",
  "src/features/arena/components/CardPreview.jsx",
  "src/features/arena/components/ContextPanel.jsx",
  "src/features/arena/components/ActionBar.jsx",
  "src/features/arena/components/PhaseTracker.jsx",
  "src/features/arena/components/TargetingUX.jsx",
  "src/features/arena/components/CardMotionLayer.jsx",
  "src/features/arena/components/ArenaOverlayLayer.jsx",
  "src/features/arena/components/BurstPresentation.jsx",
  "src/features/arena/components/GameLogDrawer.jsx",
  "src/features/arena/components/GameEventToast.jsx",
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

const overlay = exists("src/features/arena/components/ArenaOverlayLayer.jsx") ? read("src/features/arena/components/ArenaOverlayLayer.jsx") : "";
const overlayCssCandidates = ["src/styles/arena/arenaOverlay.css", "src/styles/arena/arenaOverlayLayer.css", "src/styles/arena/arenaOverlays.css"];
const overlayCss = overlayCssCandidates.filter(exists).map(read).join("\n");
if (!/ArenaOverlayLayer/.test(overlay) && !/arena-overlay-layer/.test(overlay)) issues.push("ArenaOverlayLayer implementation marker missing");
if (overlayCss && !/pointer-events\s*:\s*none/i.test(overlayCss)) issues.push("Arena overlay root must remain pointer-transparent by default");

const motion = exists("src/features/arena/components/CardMotionLayer.jsx") ? read("src/features/arena/components/CardMotionLayer.jsx") : "";
if (/dispatch\s*\(|onlineClient|applyGameAction/.test(motion)) issues.push("CardMotionLayer must not dispatch gameplay or Online actions");

const verifyScript = pkg.scripts?.verify || "";
for (const name of ["audit-arena-foundation.mjs","audit-arena-battlefield-hud.mjs","audit-arena-resources-hand.mjs","audit-arena-card-context.mjs","audit-arena-actions-timing.mjs","audit-arena-targeting-motion.mjs","audit-arena-overlays-events.mjs","audit-arena-responsive-performance.mjs"]) {
  if (!verifyScript.includes(name)) issues.push(`Final verify no longer includes ${name}`);
}

if (issues.length) {
  console.error("Arena Phase 22/23 Final QA audit: FAILED");
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}
console.log(`Arena Phase 22/23 Final QA audit: OK — Arena v4.9 lineage preserved in v${pkg.version}`);
