import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const contractRoot = path.join(root, "src", "shared", "contracts");
const required = [
  "src/shared/contracts/index.js",
  "src/shared/contracts/arena/index.js",
  "src/shared/contracts/arena/constants.js",
  "src/shared/contracts/arena/contracts.js",
  "src/shared/contracts/arena/validation.js",
  "src/shared/contracts/arena/arenaPresentationContracts.test.js"
];

const failures = [];
for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) failures.push(`Missing ${relative}`);
}

const forbiddenImportFragments = [
  "/game/",
  "/components/",
  "/pages/",
  "/styles/",
  "/services/",
  "/server/",
  "/online/socketClient"
];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() && /\.(js|mjs|jsx)$/.test(entry.name) ? [full] : [];
  });
}

for (const file of fs.existsSync(contractRoot) ? walk(contractRoot) : []) {
  const text = fs.readFileSync(file, "utf8");
  const normalized = text.replaceAll("\\", "/");
  for (const fragment of forbiddenImportFragments) {
    if (normalized.includes(fragment)) {
      failures.push(`${path.relative(root, file)} contains forbidden shared-contract dependency ${fragment}`);
    }
  }
}

const constantsText = fs.existsSync(path.join(contractRoot, "arena", "constants.js"))
  ? fs.readFileSync(path.join(contractRoot, "arena", "constants.js"), "utf8")
  : "";
const contractsText = fs.existsSync(path.join(contractRoot, "arena", "contracts.js"))
  ? fs.readFileSync(path.join(contractRoot, "arena", "contracts.js"), "utf8")
  : "";

for (const token of ["ArenaZone", "ArenaPhase", "ArenaBattleStage", "ArenaActionCategory", "ArenaConnectionState", "ArenaCardVisualState"]) {
  if (!constantsText.includes(`export const ${token}`)) failures.push(`Missing exported contract constant ${token}`);
}
for (const token of ["createArenaCardContract", "createArenaPlayerContract", "createArenaZoneContract", "createArenaTimingContract", "createArenaAvailableActionContract", "createArenaPresentationContract"]) {
  if (!contractsText.includes(`export function ${token}`)) failures.push(`Missing exported contract factory ${token}`);
}

if (failures.length) {
  console.error("v5.2.0 Phase 1 Shared Contract audit: FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("v5.2.0 Phase 1 Shared Contract audit: OK");
console.log("- UI-safe Arena contract namespace exists.");
console.log("- Shared contracts do not import Game Engine, React UI, services, server runtime or socket implementation.");
console.log("- Player, zone, card, timing and authoritative available-action shapes are defined.");
