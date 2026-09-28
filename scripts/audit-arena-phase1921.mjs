import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));

const required = [
  "src/components/game/arena/useArenaLayout.js",
  "src/styles/arena/arenaResponsiveV490.css",
  "src/styles/arena/arenaPerformanceV490.css",
  "src/styles/arena/arenaVisualCleanupV490.css",
  "docs/arena/PHASE-19-21.md"
];

const errors = [];
for (const file of required) {
  if (!exists(file)) errors.push(`Missing Phase 19/20/21 file: ${file}`);
}

const shell = read("src/components/game/arena/ArenaShell.jsx");
if (!shell.includes("useArenaLayout")) errors.push("ArenaShell must use the presentation-only responsive layout hook");
if (!shell.includes('data-arena-phase="21"')) errors.push("ArenaShell phase marker must be 21");

const layoutHook = read("src/components/game/arena/useArenaLayout.js");
for (const token of ["ResizeObserver", '"compact"', '"standard"', '"wide"']) {
  if (!layoutHook.includes(token)) errors.push(`useArenaLayout missing responsive token: ${token}`);
}
for (const forbidden of ["applyGameAction", "onlineClient", "/game/", "/online/", "/services/"]) {
  if (layoutHook.includes(forbidden)) errors.push(`useArenaLayout crosses presentation boundary: ${forbidden}`);
}

const hud = read("src/components/game/arena/ArenaHUD.jsx");
if (hud.includes("life-core-display")) errors.push("Life must not reuse legacy life-core-display class");
if (hud.includes("life-drop-target")) errors.push("Life must not reuse legacy life-drop-target class");
if (hud.includes('resourcePulse === "life"')) errors.push("Life changes must not toggle layout-affecting pulse state");
if (!hud.includes("arena-life-slots")) errors.push("Life must keep permanent geometry-stable slots");

const cleanup = read("src/styles/arena/arenaVisualCleanupV490.css");
for (const token of ["contain: strict", "grid-template-columns: repeat(5, 7px)", "font-variant-numeric: tabular-nums", ".attack-focus-life-target .arena-hud-life"]) {
  if (!cleanup.includes(token)) errors.push(`Visual cleanup missing Life stability rule: ${token}`);
}

const motion = read("src/components/game/arena/CardMotionLayer.jsx");
if (!motion.includes("motionSignature")) errors.push("CardMotionLayer must gate measurements by card-zone signature");
if (!motion.includes("instanceId}@${card.zoneKey}")) errors.push("CardMotionLayer signature must include instance and zone");

const pkg = JSON.parse(read("package.json"));
if (!String(pkg.scripts?.verify || "").includes("audit-arena-phase1921.mjs")) errors.push("verify must include Phase 19/20/21 audit");

if (errors.length) {
  console.error("Arena Phase 19/20/21 audit: FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Arena Phase 19/20/21 audit: OK");
