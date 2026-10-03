import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const arenaDir = path.join(root, "src/features/arena/components");
const simulatorPath = path.join(root, "src/features/arena/Simulator.jsx");
const docPath = path.join(root, "docs/arena/phase-2-3-battlefield-hud.md");

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
    if (!simulator.includes(`import ${component} from \"./components/${component}.jsx\";`)) {
      failures.push(`Simulator must import ${component}.`);
    }
  }

  const requiredUsage = ["<Battlefield", "<OpponentField", "<CenterField", "<PlayerField", "<PlayerHUD", "<OpponentHUD"];
  for (const token of requiredUsage) {
    if (!simulator.includes(token)) failures.push(`Simulator must render ${token.replace("<", "")}.`);
  }

  if (!simulator.includes("applyGameAction(")) failures.push("Local gameplay dispatch boundary unexpectedly changed or disappeared.");
  if (!simulator.includes("onlineClient.action(")) failures.push("Online gameplay dispatch boundary unexpectedly changed or disappeared.");
  if (!simulator.includes('data-card-drop-zone="table"')) failures.push("Battlefield must preserve the table drop contract.");
  if (!simulator.includes("dataLifeTarget={topId}")) failures.push("OpponentHUD must preserve direct Life targeting.");
  if (!simulator.includes("dataLifeTarget={bottomId}")) failures.push("PlayerHUD must preserve direct Life targeting.");
}

if (failures.length) {
  console.error("Arena Phase 2/3 audit failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Arena Phase 2/3 audit: OK");
