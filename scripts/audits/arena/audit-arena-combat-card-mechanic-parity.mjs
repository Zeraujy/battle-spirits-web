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

for (const id of ["complete-battle-timing","magic-high-speed-field-flash","brave-complete","burst-complete","mirage"]) {
  const entry = ARENA_PARITY_REGISTRY.find((item) => item.id === id);
  if (!entry) throw new Error(`Missing parity capability: ${id}`);
  if (entry.status !== ARENA_PARITY_STATUS.QA_PASSED) throw new Error(`${id} must be QA_PASSED.`);
}

requireToken("src/features/arena-visual/components/battle/ArenaVisualBattleState.jsx", "ArenaVisualFlashWindow");
requireToken("src/features/arena-visual/components/battle/ArenaVisualBattleState.jsx", "ArenaVisualBattleResultCue");
requireToken("src/features/arena-visual/components/battle/ArenaVisualBattleRestrictionHint.jsx", "arena-visual-battle-restrictions");
requireToken("src/features/arena-visual/controller/ArenaVisualControllerBridge.js", "USE_HIGH_SPEED");
requireToken("src/features/arena-visual/controller/ArenaVisualControllerBridge.js", "ACTIVATE_FIELD_FLASH");
requireToken("src/features/arena-visual/controller/ArenaVisualControllerBridge.js", "BEGIN_MIRAGE_COST");
requireToken("src/features/arena-visual/controller/ArenaVisualControllerBridge.js", "EXCHANGE_BRAVE");
requireToken("src/features/arena-visual/controller/ArenaVisualControllerBridge.js", "DIRECT_COMBINE_BRAVE");
requireToken("src/features/arena-visual/components/zones/ArenaVisualMirageZone.jsx", "arena-visual-mirage-zone");
requireToken("src/features/arena-visual/components/burst/ArenaVisualBurstPrompt.jsx", "arena-visual-burst-prompt");
requireToken("src/features/arena/Simulator.jsx", 'type === "USE_HIGH_SPEED"');
requireToken("src/features/arena/Simulator.jsx", 'type === "ACTIVATE_FIELD_FLASH"');
requireToken("src/features/arena/Simulator.jsx", 'type === "BEGIN_MIRAGE_COST"');
requireToken("src/features/arena/Simulator.jsx", 'type === "EXCHANGE_BRAVE"');
requireToken("src/features/arena/Simulator.jsx", 'confirmCondition: true');
requireToken("src/features/arena/components/CardMotionLayer.jsx", "mirage:");

const bridge = read("src/features/arena-visual/controller/ArenaVisualControllerBridge.js");
if (bridge.includes("applyGameAction")) throw new Error("Arena Visual bridge must not execute the Rules Engine reducer.");

console.log("Arena Full Functional Parity Phase 04-05 audit: PASS");
console.log("- Phase 04 Complete Battle Timing UX: PASS");
console.log("- Phase 05 Complete Card Mechanic Parity: PASS");
