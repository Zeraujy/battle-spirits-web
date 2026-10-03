import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));

const required = [
  "src/features/arena/components/TargetingUX.jsx",
  "src/features/arena/components/CardMotionLayer.jsx",
  "src/styles/arena/targetingUXV490.css",
  "src/styles/arena/cardMotionV490.css",
  "docs/arena/phase-13-14.md"
];

const errors = [];
for (const file of required) {
  if (!exists(file)) errors.push(`Missing required Phase 13/14 file: ${file}`);
}

const forbidden = [
  "applyGameAction",
  "onlineClient",
  "/game/reducer",
  "/game/legalActions",
  "/online/",
  "/services/",
  "dispatch("
];

for (const file of [
  "src/features/arena/components/TargetingUX.jsx",
  "src/features/arena/components/CardMotionLayer.jsx"
]) {
  if (!exists(file)) continue;
  const source = read(file);
  for (const token of forbidden) {
    if (source.includes(token)) errors.push(`${file} crosses presentation boundary: ${token}`);
  }
}

const simulator = read("src/features/arena/Simulator.jsx");
for (const token of [
  "<TargetingUX",
  "<CardMotionLayer",
  "data-targeting-state=",
  "data-motion-card-instance=",
  "data-motion-zone=",
  "legalBlockers(match, cardIndex)"
]) {
  if (!simulator.includes(token)) errors.push(`Simulator missing Phase 13/14 integration token: ${token}`);
}

const motion = read("src/features/arena/components/CardMotionLayer.jsx");
if (!motion.includes("useLayoutEffect")) errors.push("CardMotionLayer must measure after canonical state render");
if (!motion.includes("prefers-reduced-motion")) errors.push("CardMotionLayer must honor reduced motion");
if (motion.includes("await ") || motion.includes("Promise")) errors.push("CardMotionLayer must not gate Game State through async animation completion");

const targeting = read("src/features/arena/components/TargetingUX.jsx");
if (!targeting.includes("data-targeting-mode")) errors.push("TargetingUX must expose presentation mode");

if (errors.length) {
  console.error("Arena Phase 13/14 audit: FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Arena Phase 13/14 audit: OK");
