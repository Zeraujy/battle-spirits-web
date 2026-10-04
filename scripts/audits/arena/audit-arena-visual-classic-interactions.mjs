import fs from "node:fs";

const checks = [
  ["src/features/arena/Simulator.jsx", ["getLegalActions", "playableInstanceIds", "attackableInstanceIds", "blockableInstanceIds", "motionPlayers={match.players}", "MANUAL_ACTION"]],
  ["src/features/arena-visual/controller/ArenaVisualControllerBridge.js", ["playabilityRelevant", "canAttack", "canBlock", "Usar Flash", "Passar Flash", "Não Bloquear"]],
  ["src/features/arena-visual/components/hand/ArenaVisualHandCard.jsx", ["is-main-playable", "is-main-unavailable", "data-motion-card-instance"]],
  ["src/features/arena-visual/components/resources/ArenaVisualCorePool.jsx", ["STONE_POSITIONS", 'layout === "stones"']],
  ["src/features/arena-visual/components/ArenaVisualHoverPreview.jsx", ["arena-visual-hover-preview"]],
  ["src/features/arena-visual/components/layout/ArenaVisualUtilityPanel.jsx", ['["manual", "Manual"]', "+1000 BP", "Void → Core", "Effects & Keywords"]],
  ["src/features/arena-visual/interactions/arenaCombatPointerDrag.js", ["declareAttackIntent", "declareBlockIntent", "data-life-target", "data-field-card-instance"]],
  ["src/features/arena-visual/components/layout/ArenaVisualActionCenter.jsx", ["DECLARE_ATTACK", "DECLARE_BLOCK", "RESOLVE_BATTLE", "is-use-flash", "is-pass-flash", "is-decline-block"]],
  ["src/features/arena-visual/ArenaVisual.jsx", ["CardMotionLayer", "ArenaVisualHoverPreview"]],
  ["src/features/arena-visual/styles/arenaVisual.css", ["is-layout-stones", "is-main-unavailable", "arena-visual-hover-preview", "arena-visual-combat-drag-arrow", "arena-visual-manual-panel"]]
];

for (const [file, tokens] of checks) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
  const text = fs.readFileSync(file, "utf8");
  for (const token of tokens) {
    if (!text.includes(token)) throw new Error(`${file} is missing required classic-interaction token: ${token}`);
  }
}

const bridge = fs.readFileSync("src/features/arena-visual/controller/ArenaVisualControllerBridge.js", "utf8");
if (bridge.includes("game/reducer")) throw new Error("Arena Visual bridge must not import the reducer.");

const actionCenter = fs.readFileSync("src/features/arena-visual/components/layout/ArenaVisualActionCenter.jsx", "utf8");
if (!actionCenter.includes('["DECLARE_ATTACK", "DECLARE_BLOCK", "RESOLVE_BATTLE"]')) {
  throw new Error("Attack/Block buttons must be filtered out of the central prompt.");
}

console.log("Arena Visual classic interaction restoration audit: PASS");
