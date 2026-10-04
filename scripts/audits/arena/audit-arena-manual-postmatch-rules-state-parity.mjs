import fs from "node:fs";
import { ARENA_PARITY_REGISTRY, ARENA_PARITY_STATUS } from "../../../src/features/arena-visual/parity/arenaParityRegistry.js";
import { ARENA_RULES_STATE_PRESENTATION_REGISTRY } from "../../../src/features/arena-visual/parity/arenaRulesStatePresentationRegistry.js";

function read(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
  return fs.readFileSync(file, "utf8");
}
function requireToken(file, token) {
  const text = read(file);
  if (!text.includes(token)) throw new Error(`${file} is missing required token: ${token}`);
}

for (const id of ["manual-tools", "post-match-social", "rules-state-coverage"]) {
  const entry = ARENA_PARITY_REGISTRY.find((item) => item.id === id);
  if (!entry) throw new Error(`Missing parity capability: ${id}`);
  if (entry.status !== ARENA_PARITY_STATUS.QA_PASSED) throw new Error(`${id} must be QA_PASSED.`);
}

requireToken("src/features/arena-visual/controller/arenaVisualManualActions.js", "Manual fallback tools are disabled in Online matches");
requireToken("src/features/arena-visual/components/layout/ArenaVisualUtilityPanel.jsx", "Reveal Top");
requireToken("src/features/arena-visual/components/layout/ArenaVisualUtilityPanel.jsx", "Move → Deck Bottom");
requireToken("src/features/arena-visual/components/postmatch/ArenaVisualPostMatchStats.jsx", "Post match statistics");
requireToken("src/features/arena-visual/components/postmatch/ArenaVisualPostMatchProgression.jsx", "Match Rewards");
requireToken("src/features/arena-visual/components/postmatch/ArenaVisualPostMatchSocialActions.jsx", "Request Rematch");
requireToken("src/features/arena-visual/components/postmatch/ArenaVisualPostMatchSocialActions.jsx", "Open Profile");
requireToken("src/features/arena-visual/components/result/ArenaVisualMatchResult.jsx", "ArenaVisualPostMatchSocialActions");
requireToken("src/features/arena/Simulator.jsx", "arenaVisualManualPolicy.canUse");

const registryKeys = new Set(ARENA_RULES_STATE_PRESENTATION_REGISTRY.map((entry) => entry.stateKey));
const requiredStateKeys = [
  "phase", "battle", "burstOpportunity", "pendingEffectDecision", "pendingManualPlay", "pendingManualCost",
  "winnerId", "actionLog", "log", "temporary", "persistentEffects", "triggerBatch", "effectQueue",
  "modifierRegistry", "pending", "deferredCanonicalEvents", "pendingMagicResolution",
  "players.*.burst", "players.*.mirage", "players.*.revealed", "players.*.soulCore", "players.*.mulliganUsed",
  "physical.exhausted", "physical.pendingDestruction"
];
for (const key of requiredStateKeys) {
  if (!registryKeys.has(key)) throw new Error(`Rules state registry is missing: ${key}`);
}

const stateSource = read("src/game/state.js");
for (const token of ["battle:", "burstOpportunity:", "pendingEffectDecision:", "triggerBatch:", "effectQueue:", "modifierRegistry:", "pending:", "temporary:", "winnerId:", "actionLog:", "log:"]) {
  if (!stateSource.includes(token)) throw new Error(`Expected canonical match state token missing from state.js: ${token}`);
}

const playerFacing = ARENA_RULES_STATE_PRESENTATION_REGISTRY.filter((entry) => entry.status === "PRESENTED");
for (const entry of playerFacing) {
  if (!fs.existsSync(entry.evidence)) throw new Error(`Missing player-facing state presentation evidence for ${entry.stateKey}: ${entry.evidence}`);
}

const bridge = read("src/features/arena-visual/controller/ArenaVisualControllerBridge.js");
if (bridge.includes("applyGameAction")) throw new Error("Arena Visual bridge must not execute the Rules Engine reducer.");

console.log("Arena Manual / Post-Match / Rules State parity audit: PASS");
console.log("- Phase 09 Manual Tools & Developer-Safe Fallback: PASS");
console.log("- Phase 10 Post-Match & Social Parity: PASS");
console.log("- Phase 11 Full Rules Engine State Coverage Audit: PASS");
console.log(`- Registered Rules Engine state presentations: ${ARENA_RULES_STATE_PRESENTATION_REGISTRY.length}`);
