import fs from "node:fs";

const failures = [];
const requiredFiles = [
  "src/styles/theme/interfaceTokens.css",
  "src/styles/arena/coreSystemV490.css",
  "src/styles/arena/handAreaV490.css",
  "src/styles/arena/targetingUXV490.css",
  "src/styles/arena/arenaOverlayV490.css",
  "src/styles/arena/gameLogDrawerV490.css",
  "src/styles/arena/gameEventToastV490.css",
  "src/styles/arena/burstPresentationV490.css",
  "docs/arena/v4.9.1-visual-identity-block-08-11.md",
];
for (const file of requiredFiles) if (!fs.existsSync(file)) failures.push(`Missing ${file}`);

const requirements = new Map([
  ["src/styles/arena/coreSystemV490.css", ["var(--surface-elevated)", "var(--border-subtle)", "var(--shadow-soft)", "--core-blue", "--soul-core-red"]],
  ["src/styles/arena/handAreaV490.css", ["var(--interaction-hover)", "var(--border-strong)", "var(--transition-fast)"]],
  ["src/styles/arena/targetingUXV490.css", ["var(--surface-elevated)", "var(--border-strong)", "var(--text-primary)", "var(--transition-fast)"]],
  ["src/styles/arena/gameLogDrawerV490.css", ["var(--surface-elevated)", "var(--border-default)", "var(--shadow-elevated)", "var(--backdrop-blur)"]],
  ["src/styles/arena/gameEventToastV490.css", ["var(--surface-elevated)", "var(--border-default)", "var(--shadow-soft)"]],
  ["src/styles/arena/burstPresentationV490.css", ["var(--surface-elevated)", "var(--shadow-elevated)", "#ffda7c"]],
]);
for (const [file,tokens] of requirements) {
  const css=fs.readFileSync(file,"utf8");
  for (const token of tokens) if (!css.includes(token)) failures.push(`${file} does not consume/preserve ${token}`);
}

const tokensCss=fs.readFileSync("src/styles/theme/interfaceTokens.css","utf8");
for (const forbidden of ["--core-blue", "--soul-core-red", "--burst-gold"]) {
  if (tokensCss.includes(forbidden)) failures.push(`Gameplay semantic token leaked into interfaceTokens.css: ${forbidden}`);
}

const overlayCss=fs.readFileSync("src/styles/arena/arenaOverlayV490.css","utf8");
if (!overlayCss.includes("pointer-events: none")) failures.push("ArenaOverlayLayer click-through contract missing");
if (!overlayCss.includes(".arena-overlay-interactive") || !overlayCss.includes("pointer-events: auto")) failures.push("ArenaOverlayLayer interactive opt-in missing");

const coreCss=fs.readFileSync("src/styles/arena/coreSystemV490.css","utf8");
if (!coreCss.includes("#7fb8f4")) failures.push("Core blue semantic accent missing");
if (!coreCss.includes("#ff7777")) failures.push("Soul Core red semantic accent missing");

for (const menuFile of [
  "src/styles/pages/mainMenuV340.css",
  "src/styles/pages/matchSetupV341.css",
  "src/styles/pages/eternalInterfaceV350.css",
]) {
  const css=fs.readFileSync(menuFile,"utf8");
  if (/arena-core-display|arena-hand-area|arena-targeting-ux|game-log-drawer|game-event-toast|burst-presentation/.test(css)) failures.push(`${menuFile} contains Arena-specific selectors`);
}

if (failures.length) {
  console.error("Arena visual identity v4.9.1 steps 08-11 audit FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Arena visual identity v4.9.1 steps 08-11 audit: OK");
