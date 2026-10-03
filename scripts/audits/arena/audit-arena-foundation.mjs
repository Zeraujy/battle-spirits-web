import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const shellPath = path.join(root, "src/features/arena/components/ArenaShell.jsx");
const simulatorPath = path.join(root, "src/features/arena/Simulator.jsx");

const failures = [];

for (const filePath of [shellPath, simulatorPath]) {
  if (!fs.existsSync(filePath)) failures.push(`Missing required Phase 0/1 file: ${path.relative(root, filePath)}`);
}

if (fs.existsSync(shellPath)) {
  const shell = fs.readFileSync(shellPath, "utf8");
  const forbidden = [
    "/game/",
    "/online/",
    "/services/",
    "applyGameAction",
    "onlineClient",
    "dispatch(",
    "useState(",
    "useEffect("
  ];
  for (const token of forbidden) {
    if (shell.includes(token)) failures.push(`ArenaShell must remain presentation-only; found forbidden token: ${token}`);
  }
  if (!shell.includes('"simulator-page"')) failures.push("ArenaShell must preserve the simulator-page compatibility class.");
  if (!shell.includes('data-arena-foundation="01"')) failures.push("ArenaShell must preserve the Phase 1 foundation QA marker.");
}

if (fs.existsSync(simulatorPath)) {
  const simulator = fs.readFileSync(simulatorPath, "utf8");
  if (!simulator.includes('import ArenaShell from "./components/ArenaShell.jsx";')) {
    failures.push("Simulator must import ArenaShell.");
  }
  if (!simulator.includes("<ArenaShell>")) failures.push("Simulator must render inside ArenaShell.");
  if (!simulator.includes("</ArenaShell>")) failures.push("Simulator must close ArenaShell.");
  if (!simulator.includes("applyGameAction(")) failures.push("Local gameplay dispatch boundary unexpectedly changed or disappeared.");
  if (!simulator.includes("onlineClient.action(")) failures.push("Online gameplay dispatch boundary unexpectedly changed or disappeared.");
}

if (failures.length) {
  console.error("Arena Phase 0/1 audit failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Arena Phase 0/1 audit: OK");
