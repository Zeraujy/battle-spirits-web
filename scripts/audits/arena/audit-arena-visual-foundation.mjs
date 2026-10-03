import fs from "node:fs";

const requiredFiles = [
  "src/styles/theme/interfaceTokens.css",
  "src/styles/arena/arenaShell.css",
  "src/styles/arena/battlefieldV490.css",
];

const failures = [];
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) failures.push(`Missing ${file}`);
}

const tokens = fs.readFileSync("src/styles/theme/interfaceTokens.css", "utf8");
for (const token of [
  "--surface-primary",
  "--surface-secondary",
  "--surface-elevated",
  "--surface-glass",
  "--border-subtle",
  "--border-default",
  "--border-strong",
  "--text-primary",
  "--text-muted",
  "--backdrop-blur",
  "--radius-medium",
  "--shadow-soft",
  "--transition-fast",
  "--interaction-hover",
]) {
  if (!tokens.includes(token)) failures.push(`Missing shared token ${token}`);
}

const main = fs.readFileSync("src/main.jsx", "utf8");
if (!main.includes('styles/theme/interfaceTokens.css')) {
  failures.push("Shared interface tokens are not imported by src/main.jsx");
}

const shell = fs.readFileSync("src/styles/arena/arenaShell.css", "utf8");
if (!shell.includes("var(--arena-surface-shell)")) failures.push("ArenaShell does not consume shared surface aliases");
if (!shell.includes("var(--text-primary)")) failures.push("ArenaShell does not consume shared text token");

const field = fs.readFileSync("src/styles/arena/battlefieldV490.css", "utf8");
for (const token of ["var(--arena-border-field)", "var(--arena-surface-field)", "var(--shadow-soft)", "var(--transition-fast)"]) {
  if (!field.includes(token)) failures.push(`Battlefield missing token consumption ${token}`);
}

// This block must not migrate menus yet.
for (const menuFile of [
  "src/styles/pages/mainMenuV340.css",
  "src/styles/pages/matchSetupV341.css",
]) {
  const css = fs.readFileSync(menuFile, "utf8");
  if (css.includes("var(--surface-primary)") || css.includes("var(--arena-surface-field)")) {
    failures.push(`${menuFile} was migrated prematurely in block 01-03`);
  }
}

if (failures.length) {
  console.error("Arena visual identity v4.9.1 block 01-03 audit FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Arena visual identity v4.9.1 block 01-03 audit: OK");
