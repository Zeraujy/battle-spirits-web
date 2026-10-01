import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const controllerFile = path.join(ROOT, "src/arena/controller/arenaController.js");
const simulatorFile = path.join(ROOT, "src/pages/Simulator.jsx");
const arenaComponentsDir = path.join(ROOT, "src/components/game/arena");
const importPattern = /^\s*import(?:[^"']*?from\s*)?["']([^"']+)["']/gm;

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function importsFrom(text) {
  const imports = [];
  importPattern.lastIndex = 0;
  let match;
  while ((match = importPattern.exec(text))) imports.push(match[1]);
  return imports;
}

const errors = [];

for (const required of [controllerFile, simulatorFile]) {
  if (!fs.existsSync(required)) errors.push(`Missing required file: ${path.relative(ROOT, required)}`);
}

if (!errors.length) {
  const controllerText = read(controllerFile);
  const simulatorText = read(simulatorFile);
  const simulatorImports = importsFrom(simulatorText);
  const controllerImports = importsFrom(controllerText);

  const directSimulatorGameImports = simulatorImports.filter((item) => item.includes("../game/") || item.includes("../../game/"));
  if (directSimulatorGameImports.length) {
    errors.push(`Simulator.jsx still imports Game Engine directly: ${directSimulatorGameImports.join(", ")}`);
  }

  if (!simulatorImports.some((item) => item === "../arena/controller/index.js")) {
    errors.push("Simulator.jsx does not consume the Arena controller boundary.");
  }

  if (controllerImports.some((item) => item === "react" || item.startsWith("react/"))) {
    errors.push("Arena controller must remain React-independent.");
  }

  if (!controllerImports.some((item) => item.includes("../../game/"))) {
    errors.push("Arena controller is not bridging the Game Engine.");
  }

  const presentationFiles = fs.existsSync(arenaComponentsDir)
    ? walk(arenaComponentsDir).filter((file) => /\.(js|jsx|mjs|ts|tsx)$/.test(file))
    : [];

  for (const file of presentationFiles) {
    const direct = importsFrom(read(file)).filter((item) => item.includes("/game/") || item.startsWith("../../../game") || item.startsWith("../../game"));
    if (direct.length) {
      errors.push(`${path.relative(ROOT, file)} imports Game Engine directly: ${direct.join(", ")}`);
    }
  }

  for (const requiredSymbol of [
    "resolveArenaPerspective",
    "dispatchArenaIntent",
    "planArenaCpuDecision"
  ]) {
    if (!controllerText.includes(`export function ${requiredSymbol}`)) {
      errors.push(`Arena controller is missing ${requiredSymbol}().`);
    }
    if (!simulatorText.includes(`${requiredSymbol}(`)) {
      errors.push(`Simulator.jsx is not using ${requiredSymbol}().`);
    }
  }
}

if (errors.length) {
  console.error("Arena Controller Boundary audit: FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Arena Controller Boundary audit: OK");
console.log("- Simulator.jsx direct Game Engine imports: 0");
console.log("- Arena presentation component direct Game Engine imports: 0");
console.log("- Local/CPU/online orchestration bridge: present");
console.log("- Controller React dependency: 0");
