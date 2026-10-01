import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "src/arena/viewModel/arenaViewModel.js",
  "src/arena/viewModel/arenaViewModel.test.js",
  "src/arena/viewModel/index.js",
  "docs/v5.2.0/PHASE-3-ARENA-VIEWMODEL-V2.md"
];
const failures = [];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`Missing ${file}`);
}
const vm = fs.readFileSync(path.join(root, "src/arena/viewModel/arenaViewModel.js"), "utf8");
const simulator = fs.readFileSync(path.join(root, "src/pages/Simulator.jsx"), "utf8");
for (const token of ["buildArenaViewModel", "getLegalActions", "createArenaPresentationContract", "visualState", "priorityPlayerId"]) {
  if (!vm.includes(token)) failures.push(`ArenaViewModel missing ${token}`);
}
if (!simulator.includes('buildArenaViewModel')) failures.push("Simulator does not consume ArenaViewModel v2");
if (!simulator.includes('viewModel={arenaViewModel}')) failures.push("ArenaShell does not receive ArenaViewModel v2");

if (failures.length) {
  console.error("ArenaViewModel v2 Phase 3 audit: FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("ArenaViewModel v2 Phase 3 audit: OK");
