import fs from "node:fs";
import { ARENA_PARITY_REGISTRY, ARENA_PARITY_STATUS } from "../../../src/features/arena-visual/parity/arenaParityRegistry.js";

function read(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
  return fs.readFileSync(file, "utf8");
}
function requireToken(file, token) {
  const text = read(file);
  if (!text.includes(token)) throw new Error(`${file} is missing required token: ${token}`);
}

const criticalIds = [
  "match-lifecycle", "end-game-screen", "exit-routing", "surrender",
  "ultimate-trigger", "trigger-counter", "critical-hit", "xu-trigger",
  "effect-decisions", "target-selection", "multiple-target-selection",
  "option-decisions", "effect-order", "trigger-order", "core-distribution"
];

for (const id of criticalIds) {
  const entry = ARENA_PARITY_REGISTRY.find((item) => item.id === id);
  if (!entry) throw new Error(`Parity registry is missing critical capability: ${id}`);
  if (entry.status !== ARENA_PARITY_STATUS.QA_PASSED) {
    throw new Error(`Critical capability ${id} is not QA_PASSED.`);
  }
}

requireToken("src/features/arena-visual/components/result/ArenaVisualMatchResult.jsx", "arena-visual-result-overlay");
requireToken("src/features/arena-visual/controller/arenaVisualExitController.js", "ONLINE_CONCEDE");
requireToken("src/features/arena-visual/components/trigger/ArenaVisualUltimateTriggerPrompt.jsx", "RESOLVE_ULTIMATE_TRIGGER");
requireToken("src/features/arena-visual/components/trigger/ArenaVisualTriggerCounterPrompt.jsx", "USE_TRIGGER_COUNTER");
requireToken("src/features/arena-visual/components/trigger/ArenaVisualTriggerCounterPrompt.jsx", "PASS_TRIGGER_COUNTER");
requireToken("src/features/arena-visual/components/decisions/ArenaVisualDecisionHost.jsx", "ArenaVisualCoreDistributionDecision");
requireToken("src/features/arena-visual/components/decisions/ArenaVisualDecisionHost.jsx", "chooseTriggerOrder");
requireToken("src/features/arena-visual/controller/ArenaVisualControllerBridge.js", "ultimateTriggerPresentation");
requireToken("src/features/arena/Simulator.jsx", "createArenaVisualSurrenderResult");
requireToken("src/features/arena/Simulator.jsx", "RESOLVE_ULTIMATE_TRIGGER");
requireToken("src/features/arena/Simulator.jsx", "matchResult={arenaVisualMatchResult}");

const bridge = read("src/features/arena-visual/controller/ArenaVisualControllerBridge.js");
if (bridge.includes("applyGameAction")) throw new Error("Arena Visual bridge must not execute the Rules Engine reducer.");

console.log("Arena Full Functional Parity Critical Block audit: PASS");
console.log("- Phase 00 Inventory: PASS");
console.log("- Phase 01 Match Lifecycle & Exit Routing: PASS");
console.log("- Phase 02 Ultimate Trigger & Trigger Counter: PASS");
console.log("- Phase 03 Complete Effect Decision UX: PASS");
