import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));

const required = [
  "src/features/arena/components/ArenaOverlayLayer.jsx",
  "src/features/arena/components/BurstPresentation.jsx",
  "src/features/arena/components/GameLogDrawer.jsx",
  "src/features/arena/components/GameEventToast.jsx",
  "src/styles/arena/arenaOverlayV490.css",
  "src/styles/arena/burstPresentationV490.css",
  "src/styles/arena/gameLogDrawerV490.css",
  "src/styles/arena/gameEventToastV490.css",
];

const errors = [];
for (const file of required) {
  if (!exists(file)) errors.push(`Missing required Phase 16/17/18 file: ${file}`);
}

const presentationFiles = [
  "src/features/arena/components/ArenaOverlayLayer.jsx",
  "src/features/arena/components/BurstPresentation.jsx",
  "src/features/arena/components/GameLogDrawer.jsx",
  "src/features/arena/components/GameEventToast.jsx"
];
const forbidden = [
  "applyGameAction",
  "onlineClient",
  "/game/reducer",
  "/game/legalActions",
  "/online/",
  "/services/",
  "dispatch("
];

for (const file of presentationFiles) {
  if (!exists(file)) continue;
  const source = read(file);
  for (const token of forbidden) {
    if (source.includes(token)) errors.push(`${file} crosses presentation boundary: ${token}`);
  }
}

const simulator = read("src/features/arena/Simulator.jsx");
for (const token of [
  "<ArenaOverlayLayer>",
  "<BurstPresentation",
  "<GameLogDrawer",
  "<GameEventToast",
  "<CardMotionLayer players={match.players} enabled />",
  "showEventCue={false}"
]) {
  if (!simulator.includes(token)) errors.push(`Simulator missing Phase 16/17/18 integration token: ${token}`);
}

if (simulator.includes("{showLog && (\n        <Modal")) {
  errors.push("Legacy modal log must not remain active after GameLogDrawer migration");
}

const overlayCss = read("src/styles/arena/arenaOverlayV490.css");
if (!overlayCss.includes("pointer-events: none")) errors.push("ArenaOverlayLayer root must be pointer transparent");
if (!overlayCss.includes(".arena-overlay-interactive")) errors.push("ArenaOverlayLayer must provide explicit interactive opt-in");

const drawerCss = read("src/styles/arena/gameLogDrawerV490.css");
if (!drawerCss.includes("pointer-events: none !important")) errors.push("Closed GameLogDrawer must not intercept battlefield input");

const burst = read("src/features/arena/components/BurstPresentation.jsx");
if (!burst.includes('lastAction.type === "ACTIVATE_BURST"')) errors.push("BurstPresentation must derive reveal from canonical structured action log");
if (burst.includes("await ") || burst.includes("Promise")) errors.push("BurstPresentation must not gate state on async animation completion");

const toast = read("src/features/arena/components/GameEventToast.jsx");
if (!toast.includes("VISIBLE_KINDS")) errors.push("GameEventToast must filter low-signal log noise");

if (errors.length) {
  console.error("Arena Phase 16/17/18 audit: FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Arena Phase 16/17/18 audit: OK");
