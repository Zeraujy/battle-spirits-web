import fs from "node:fs";

const failures = [];
const read = (file) => fs.readFileSync(file, "utf8");
const exists = (file) => fs.existsSync(file);
const required = [
  "src/styles/theme/interfaceTokens.css",
  "src/styles/arena/arenaVisualPolishV491.css",
  "docs/arena/v4.9.1-final-qa.md",
  "docs/changelog/changelog-4.9.1.md",
];
for (const file of required) if (!exists(file)) failures.push(`Missing ${file}`);

const pkg = JSON.parse(read("package.json"));
const versionParts = String(pkg.version || "0.0.0").split(".").map(Number);
if (versionParts[0] < 4 || (versionParts[0] === 4 && versionParts[1] < 9)) {
  failures.push(`Arena v4.9.1 lineage requires release >=4.9.x, found ${pkg.version}`);
}
for (const [file, marker] of [
  ["src/components/common/ProjectInfoButtons.jsx", 'version: "4.9.1"'],
  ["src/features/arena/components/ArenaShell.jsx", 'data-arena-shell="v4.9.1"'],
]) if (!read(file).includes(marker)) failures.push(`Historical v4.9.1 marker missing in ${file}`);

const tokens = read("src/styles/theme/interfaceTokens.css");
for (const token of [
  "--font-family-interface", "--font-size-caption", "--font-size-body",
  "--font-size-label", "--font-size-heading-small", "--font-weight-semibold",
  "--motion-micro", "--motion-standard", "--motion-panel", "--ease-interface"
]) if (!tokens.includes(token)) failures.push(`Shared final token missing: ${token}`);
for (const semantic of ["--core-blue", "--soul-core-red", "--burst-gold"]) {
  if (tokens.includes(semantic)) failures.push(`Gameplay semantic token leaked into shared interface tokens: ${semantic}`);
}

const polish = read("src/styles/arena/arenaVisualPolishV491.css");
for (const marker of [
  "var(--font-family-interface)", "var(--font-size-caption)", "var(--ease-interface)",
  "@media (max-width: 1366px)", "@media (max-width: 1180px)",
  "@media (prefers-reduced-motion: reduce)"
]) if (!polish.includes(marker)) failures.push(`Final polish requirement missing: ${marker}`);

const simulator = read("src/features/arena/Simulator.jsx");
if (!simulator.includes('import "../../styles/arena/arenaVisualPolishV491.css";')) failures.push("Final polish CSS not imported last in Simulator");

const overlay = read("src/styles/arena/arenaOverlayV490.css");
if (!overlay.includes("pointer-events: none")) failures.push("ArenaOverlayLayer lost pointer-transparent root");

const core = read("src/styles/arena/coreSystemV490.css");
if (!core.includes("#7fb8f4")) failures.push("Core blue semantic color missing");
if (!core.includes("#ff7777")) failures.push("Soul Core red semantic color missing");

for (const menuFile of [
  "src/styles/pages/mainMenuV340.css",
  "src/styles/pages/matchSetupV341.css",
  "src/styles/pages/eternalInterfaceV350.css",
]) {
  const css = read(menuFile);
  if (/arena-visual-polish|arena-action-bar|arena-phase-tracker|game-log-drawer/.test(css)) failures.push(`${menuFile} contains Arena-specific final selectors`);
}

if (failures.length) {
  console.error("Arena visual identity v4.9.1 final audit FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Arena visual identity v4.9.1 final audit: OK");
