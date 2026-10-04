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

for (const id of ["opening-setup","mulligan","turn-authority-status","online-reconnect","turn-clock","legacy-feedback-layers"]) {
  const entry = ARENA_PARITY_REGISTRY.find((item) => item.id === id);
  if (!entry) throw new Error(`Missing parity capability: ${id}`);
  if (entry.status !== ARENA_PARITY_STATUS.QA_PASSED) throw new Error(`${id} must be QA_PASSED.`);
}

requireToken("src/features/arena-visual/components/setup/ArenaVisualMulliganPrompt.jsx", "MULLIGAN");
requireToken("src/features/arena-visual/components/status/ArenaVisualAuthorityStatus.jsx", "arena-visual-authority-status");
requireToken("src/features/arena-visual/controller/arenaVisualOnlineStatus.js", "opponentReconnectRemainingSeconds");
requireToken("src/features/arena-visual/components/online/ArenaVisualReconnectOverlay.jsx", "arena-visual-reconnect-overlay");
requireToken("src/features/arena-visual/components/online/ArenaVisualTurnClock.jsx", "arena-visual-turn-clock");
requireToken("src/features/arena-visual/components/feedback/ArenaVisualFeedbackLayer.jsx", "BattleExperienceLayer");
requireToken("src/features/arena-visual/components/feedback/ArenaVisualFeedbackLayer.jsx", "BattleLinkOverlay");
requireToken("src/features/arena-visual/components/feedback/ArenaVisualFeedbackLayer.jsx", "BurstPresentation");
requireToken("src/features/arena-visual/components/feedback/ArenaVisualFeedbackLayer.jsx", "GameEventToast");
requireToken("src/features/arena-visual/components/feedback/ArenaVisualFeedbackLayer.jsx", "TargetingUX");
requireToken("src/features/arena/Simulator.jsx", 'type === "MULLIGAN"');
requireToken("src/features/arena/Simulator.jsx", "onlineSocketConnected");
requireToken("src/features/arena/Simulator.jsx", "feedbackMatch={match}");

const bridge = read("src/features/arena-visual/controller/ArenaVisualControllerBridge.js");
if (bridge.includes("applyGameAction")) throw new Error("Arena Visual bridge must not execute the Rules Engine reducer.");

console.log("Arena Turn / Online / Feedback parity audit: PASS");
console.log("- Turn, Setup & Match State parity: PASS");
console.log("- Online, Ranked & Reconnect parity: PASS");
console.log("- Legacy Feedback & Presentation restoration: PASS");
