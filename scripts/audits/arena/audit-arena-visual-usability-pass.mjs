import fs from "node:fs";

const checks = [
  ["src/features/arena-visual/components/layout/ArenaVisualActionCenter.jsx", ["arena-visual-action-center", "ArenaVisualDecisionHost"]],
  ["src/features/arena-visual/components/decisions/ArenaVisualDecisionHost.jsx", ["RESOLVE_EFFECT_DECISION"]],
  ["src/features/arena-visual/components/layout/ArenaVisualUtilityPanel.jsx", ['["inspector", "Card"]', '["log", "Log"]', '["chat", "Chat"]', "Game Settings", "Surrender"]],
  ["src/features/arena-visual/components/zones/ArenaVisualBattlefield.jsx", ["is-zoned-layout", "groupArenaVisualBattlefieldCards"]],
  ["src/features/arena-visual/models/battlefieldLayout.js", ['type === "nexus"', 'type === "spirit" || type === "ultimate"']],
  ["src/features/arena-visual/layout/ArenaVisualLayout.jsx", ["ArenaVisualActionCenter"]],
  ["src/features/arena-visual/styles/arenaVisual.css", ["arena-visual-system-actions", "arena-visual-field-lane.is-left", "arena-visual-field-lane.is-center", "arena-visual-field-lane.is-right"]]
];

for (const [file, required] of checks) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
  const text = fs.readFileSync(file, "utf8");
  for (const token of required) {
    if (!text.includes(token)) throw new Error(`${file} is missing required token: ${token}`);
  }
}

const utilityText = fs.readFileSync("src/features/arena-visual/components/layout/ArenaVisualUtilityPanel.jsx", "utf8");
const renderedMatchTab = 'activeTab === "match"';
if (utilityText.includes(renderedMatchTab)) throw new Error("Match tab must not be rendered in the utility panel.");

console.log("Arena Visual usability pass audit: PASS");
