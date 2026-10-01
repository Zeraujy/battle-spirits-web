import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const arenaDir = path.join(root, "src/components/game/arena");
const simulatorPath = path.join(root, "src/pages/Simulator.jsx");
const docPath = path.join(root, "docs/arena/PHASE-2-3-BATTLEFIELD-HUD.md");
const controllerPath = path.join(root, "src/arena/controller/arenaController.js");

const requiredFiles = [
  "Battlefield.jsx",
  "OpponentField.jsx",
  "CenterField.jsx",
  "PlayerField.jsx",
  "ArenaHUD.jsx",
  "PlayerHUD.jsx",
  "OpponentHUD.jsx"
].map((name) => path.join(arenaDir, name));

const failures = [];
for (const filePath of [...requiredFiles, simulatorPath, docPath]) {
  if (!fs.existsSync(filePath)) failures.push(`Missing Phase 2/3 file: ${path.relative(root, filePath)}`);
}

const presentationOnly = ["Battlefield.jsx", "OpponentField.jsx", "CenterField.jsx", "PlayerField.jsx", "ArenaHUD.jsx"];
const forbiddenTokens = [
  "/game/",
  "/online/",
  "/services/",
  "applyGameAction",
  "onlineClient",
  "dispatch(",
  "socket.emit",
  "fetch("
];

for (const name of presentationOnly) {
  const filePath = path.join(arenaDir, name);
  if (!fs.existsSync(filePath)) continue;
  const source = fs.readFileSync(filePath, "utf8");
  for (const token of forbiddenTokens) {
    if (source.includes(token)) failures.push(`${name} must remain presentation-only; found forbidden token: ${token}`);
  }
}

if (fs.existsSync(simulatorPath)) {
  const simulator = fs.readFileSync(simulatorPath, "utf8");
  const requiredImports = [
    "Battlefield",
    "OpponentField",
    "CenterField",
    "PlayerField",
    "PlayerHUD",
    "OpponentHUD"
  ];
  for (const component of requiredImports) {
    if (!simulator.includes(`import ${component} from \"../components/game/arena/${component}.jsx\";`)) {
      failures.push(`Simulator must import ${component}.`);
    }
  }

  const requiredUsage = ["<Battlefield", "<OpponentField", "<CenterField", "<PlayerField", "<PlayerHUD", "<OpponentHUD"];
  for (const token of requiredUsage) {
    if (!simulator.includes(token)) failures.push(`Simulator must render ${token.replace("<", "")}.`);
  }

  const usesLegacyDirectDispatch =
    simulator.includes("applyGameAction(") &&
    simulator.includes("onlineClient.action(");

  const usesPhase2Controller =
    simulator.includes("dispatchArenaIntent(") &&
    fs.existsSync(controllerPath) &&
    fs.readFileSync(controllerPath, "utf8").includes("applyGameActionEngine(") &&
    fs.readFileSync(controllerPath, "utf8").includes("onlineClient.action(");

  if (!usesLegacyDirectDispatch && !usesPhase2Controller) {
    failures.push("Local/online gameplay dispatch boundary unexpectedly changed or disappeared.");
  }
  if (!simulator.includes('data-card-drop-zone="table"')) failures.push("Battlefield must preserve the table drop contract.");
  if (!simulator.includes("dataLifeTarget={topId}")) failures.push("OpponentHUD must preserve direct Life targeting.");
  if (!simulator.includes("dataLifeTarget={bottomId}")) failures.push("PlayerHUD must preserve direct Life targeting.");
}

if (failures.length) {
  console.error("Arena Phase 2/3 audit failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Arena Phase 2/3 audit: OK");
