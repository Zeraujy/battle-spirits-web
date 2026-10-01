import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const fail = (message) => {
  console.error(`- ${message}`);
  process.exitCode = 1;
};

const shell = read("src/components/game/arena/ArenaShell.jsx");
const simulator = read("src/pages/Simulator.jsx");
const css = read("src/styles/arena/fullViewportArenaV520.css");

console.log("v5.2.0 Phase 7 Full-Viewport ArenaShell v2 audit");

if (!shell.includes('data-arena-v520-phase="07"')) fail("ArenaShell Phase 7 marker missing");
if (!shell.includes('data-arena-full-viewport="phase07"')) fail("Full-viewport shell marker missing");
if (!simulator.includes('fullViewportArenaV520.css')) fail("Phase 7 stylesheet is not imported by Simulator");
if (!simulator.includes('data-arena-region="command-strip"')) fail("Floating command strip region marker missing");

for (const token of [
  'height: 100dvh',
  'grid-template-rows: minmax(0, 1fr)',
  '.sim-topbar[data-arena-region="command-strip"]',
  'position: absolute !important',
  '--v520-command-height',
  '--v520-command-safe-width',
  '.sim-layout.inspector-open.control-open',
  '[data-arena-region="utility-rail"]',
  '@media (max-width: 1500px)',
  '@media (max-width: 1180px)',
  '@supports not (height: 100dvh)'
]) {
  if (!css.includes(token)) fail(`Full-viewport stylesheet requirement missing: ${token}`);
}

// Phase 7 must remain presentation-only.
for (const source of [css, shell]) {
  if (/from\s+["'][^"']*\/game\//.test(source) || /from\s+["'][^"']*\/server\//.test(source)) {
    fail("Phase 7 presentation layer imports gameplay/server implementation");
  }
}

if (process.exitCode) {
  console.error("v5.2.0 Phase 7 Full-Viewport ArenaShell v2 audit: FAILED");
  process.exit(process.exitCode);
}

console.log("- ArenaShell occupies the dynamic viewport");
console.log("- legacy header no longer consumes a dedicated layout row");
console.log("- command controls remain available in a floating strip");
console.log("- battlefield/utility layout owns the full shell geometry");
console.log("- 1366-class and narrow fallbacks are present");
console.log("v5.2.0 Phase 7 Full-Viewport ArenaShell v2 audit: PASS");
