import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "src/features/arena-visual/controller/ArenaVisualControllerBridge.js",
  "src/features/arena-visual/controller/arenaVisualIntentRouter.js",
  "src/features/arena-visual/interactions/arenaInteractionBus.js",
  "src/features/arena-visual/interactions/arenaIntentFactory.js",
  "src/features/arena-visual/interactions/arenaInputBindings.js",
  "src/features/arena-visual/interactions/coreInteraction.js"
];

for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) {
    throw new Error(`Missing integration file: ${relative}`);
  }
}

const simulator = fs.readFileSync(path.join(root, "src/features/arena/Simulator.jsx"), "utf8");
if (!simulator.includes('get("arena") === "visual"')) throw new Error("Live visual Arena toggle is missing.");
if (!simulator.includes("createArenaVisualControllerBridge")) throw new Error("Simulator is not connected through the visual controller bridge.");
if (!simulator.includes("routeArenaVisualIntent")) throw new Error("Simulator is not using the intent router.");

const bridge = fs.readFileSync(path.join(root, required[0]), "utf8");
if (bridge.includes("applyGameAction")) throw new Error("Visual controller bridge must not execute Rules Engine actions.");
if (!bridge.includes("hidePrivate")) throw new Error("Opponent hidden-zone privacy guard is missing.");

const bus = fs.readFileSync(path.join(root, required[2]), "utf8");
if (!bus.includes("requestIntent")) throw new Error("Unified interaction bus request boundary is missing.");

const cores = fs.readFileSync(path.join(root, "src/features/arena-visual/components/resources/ArenaVisualCorePool.jsx"), "utf8");
if (!cores.includes("coreClickIntent")) throw new Error("Core click intent bridge is missing.");

const field = fs.readFileSync(path.join(root, "src/features/arena-visual/components/battlefield/ArenaVisualBattlefieldCard.jsx"), "utf8");
if (!field.includes("moveCoreIntent")) throw new Error("Battlefield Core drop intent bridge is missing.");

console.log("Arena Visual Integration Block 01 audit: PASS — live controller bridge, unified intent bus and Core interaction parity are wired without moving rules authority into the visual layer.");
