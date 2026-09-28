import fs from "node:fs";

const failures = [];
const requiredFiles = [
  "src/styles/theme/interfaceTokens.css",
  "src/styles/arena/contextPanelV490.css",
  "src/styles/arena/cardPreviewV490.css",
  "src/styles/arena/actionBarV490.css",
  "src/styles/arena/phaseTrackerV490.css",
  "docs/arena/V4.9.1-VISUAL-IDENTITY-BLOCK-05-07.md",
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) failures.push(`Missing ${file}`);
}

const requirements = new Map([
  ["src/styles/arena/contextPanelV490.css", [
    "var(--surface-glass)",
    "var(--border-subtle)",
    "var(--backdrop-blur)",
    "var(--transition-standard)",
  ]],
  ["src/styles/arena/cardPreviewV490.css", [
    "var(--text-primary)",
    "var(--surface-elevated)",
    "var(--border-default)",
    "var(--shadow-elevated)",
  ]],
  ["src/styles/arena/actionBarV490.css", [
    "var(--surface-soft)",
    "var(--interaction-hover)",
    "var(--border-default)",
    "var(--transition-fast)",
  ]],
  ["src/styles/arena/phaseTrackerV490.css", [
    "var(--surface-glass)",
    "var(--text-muted)",
    "var(--interaction-hover)",
    "var(--transition-fast)",
  ]],
]);

for (const [file, tokens] of requirements) {
  const css = fs.readFileSync(file, "utf8");
  for (const token of tokens) {
    if (!css.includes(token)) failures.push(`${file} does not consume ${token}`);
  }
}

const actionCss = fs.readFileSync("src/styles/arena/actionBarV490.css", "utf8");
if (!actionCss.includes("button.primary-btn")) failures.push("ActionBar primary action styling is missing");
if (!actionCss.includes("color: var(--text-primary)")) failures.push("ActionBar does not use shared text hierarchy");

const phaseCss = fs.readFileSync("src/styles/arena/phaseTrackerV490.css", "utf8");
if (!phaseCss.includes(".arena-phase-item.is-current")) failures.push("PhaseTracker current state styling is missing");
if (phaseCss.includes("0 0 14px rgba(255, 255, 255, 0.34)")) failures.push("Legacy high-intensity PhaseTracker glow is still present");

// Steps 05–07 must not migrate menu styles.
for (const menuFile of [
  "src/styles/pages/mainMenuV340.css",
  "src/styles/pages/matchSetupV341.css",
  "src/styles/pages/eternalInterfaceV350.css",
]) {
  const css = fs.readFileSync(menuFile, "utf8");
  if (css.includes("arena-action-bar") || css.includes("arena-phase-tracker") || css.includes("context-panel")) {
    failures.push(`${menuFile} contains Arena-specific selectors`);
  }
}

if (failures.length) {
  console.error("Arena visual identity v4.9.1 steps 05-07 audit FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Arena visual identity v4.9.1 steps 05-07 audit: OK");
