import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));

const required = [
  "src/components/game/arena/ActionBar.jsx",
  "src/components/game/arena/PhaseTracker.jsx",
  "src/styles/arena/actionBarV490.css",
  "src/styles/arena/phaseTrackerV490.css",
  "docs/arena/PHASE-8-9.md"
];

const errors = [];
for (const file of required) {
  if (!exists(file)) errors.push(`Missing required Phase 8/9 file: ${file}`);
}

const forbidden = [
  "applyGameAction",
  "onlineClient",
  "/game/reducer",
  "/game/legalActions",
  "/online/",
  "/services/"
];

for (const file of [
  "src/components/game/arena/ActionBar.jsx",
  "src/components/game/arena/PhaseTracker.jsx"
]) {
  if (!exists(file)) continue;
  const source = read(file);
  for (const token of forbidden) {
    if (source.includes(token)) errors.push(`${file} crosses presentation boundary: ${token}`);
  }
}

const simulator = read("src/pages/Simulator.jsx");
for (const token of ["<ActionBar", "<PhaseTracker", "actions={actionButtons()}", 'type: "ADVANCE_PHASE"']) {
  if (!simulator.includes(token)) errors.push(`Simulator missing Phase 8/9 integration token: ${token}`);
}

if (simulator.includes("<PhaseBar")) errors.push("Legacy PhaseBar is still rendered in Simulator.jsx");
if (simulator.includes('className="arena-next-phase-btn"')) errors.push("Legacy standalone next-phase button is still rendered");

const actionBar = read("src/components/game/arena/ActionBar.jsx");
if (!actionBar.includes("count === 0")) errors.push("ActionBar must hide when no contextual actions exist");

if (errors.length) {
  console.error("Arena Phase 8/9 audit: FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Arena Phase 8/9 audit: OK");
