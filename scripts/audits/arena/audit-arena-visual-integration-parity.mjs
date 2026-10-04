import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const simulator = read("src/features/arena/Simulator.jsx");
const bridge = read("src/features/arena-visual/controller/ArenaVisualControllerBridge.js");
const mode = read("src/features/arena-visual/controller/arenaVisualProductionMode.js");
const utility = read("src/features/arena-visual/components/layout/ArenaVisualUtilityPanel.jsx");
const battlefield = read("src/features/arena-visual/components/battlefield/ArenaVisualBattlefieldCard.jsx");

const failures = [];
const requireText = (label, source, token) => {
  if (!source.includes(token)) failures.push(`${label}: missing ${token}`);
};

requireText("production renderer", simulator, "isArenaVisualDefault(window.location.search)");
requireText("legacy fallback", mode, 'requested === ARENA_RENDER_MODES.LEGACY');
requireText("phase action", simulator, 'ADVANCE_PHASE');
requireText("hand play", simulator, 'BEGIN_MANUAL_PLAY');
requireText("manual cost", simulator, 'BEGIN_MANUAL_COST');
requireText("manual play confirm", simulator, 'CONFIRM_MANUAL_PLAY');
requireText("brave combine", simulator, 'COMBINE_BRAVE');
requireText("brave separate", simulator, 'SEPARATE_BRAVE');
requireText("attack", simulator, 'DECLARE_ATTACK');
requireText("block", simulator, 'DECLARE_BLOCK');
requireText("decline block", simulator, 'DECLINE_BLOCK');
requireText("flash", simulator, 'PASS_FLASH');
requireText("battle resolution", simulator, 'RESOLVE_BATTLE');
requireText("burst activate", simulator, 'ACTIVATE_BURST');
requireText("burst pass", simulator, 'PASS_BURST');
requireText("effect decisions", simulator, 'RESOLVE_EFFECT_DECISION');
requireText("effect decision bridge", bridge, 'pendingEffectDecision');
requireText("burst bridge", bridge, 'burstOpportunity');
requireText("battle bridge", bridge, 'battle:');
requireText("utility Card tab", utility, '"Card"');
requireText("utility Log tab", utility, '"Log"');
requireText("utility Chat tab", utility, '"Chat"');
requireText("utility system actions", utility, 'arena-visual-system-actions');
const actionCenter = read("src/features/arena-visual/components/layout/ArenaVisualActionCenter.jsx");
const decisionHost = read("src/features/arena-visual/components/decisions/ArenaVisualDecisionHost.jsx");
requireText("center gameplay prompts", actionCenter, 'arena-visual-action-center');
requireText("center effect decisions", decisionHost, 'RESOLVE_EFFECT_DECISION');
requireText("Brave visual", battlefield, 'attachedBrave');
requireText("exhausted visual", battlefield, 'is-exhausted');

const forbiddenBridgeImports = [
  '../../../game/reducer.js',
  '../../game/reducer.js',
  'applyGameAction'
];
for (const token of forbiddenBridgeImports) {
  if (bridge.includes(token)) failures.push(`authority boundary: bridge must not contain ${token}`);
}

if (failures.length) {
  console.error("Arena Visual Integration Parity audit FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Arena Visual Integration Parity audit: PASS");
console.log("- Arena Visual is the production default with ?arena=legacy fallback");
console.log("- Core / Hand / Summon / Brave / Combat / Flash / Burst / Effects integration hooks are present");
console.log("- Rules Engine authority remains outside the Arena Visual bridge");
