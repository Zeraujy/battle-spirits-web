import fs from "node:fs";

const required = [
  "src/components/game/arena/CoreSystemDisplay.jsx",
  "src/components/game/arena/HandArea.jsx",
  "src/styles/arena/coreSystemV490.css",
  "src/styles/arena/handAreaV490.css"
];

const errors = [];
for (const file of required) {
  if (!fs.existsSync(file)) errors.push(`Missing Phase 4/5 file: ${file}`);
}

const core = fs.readFileSync("src/components/game/arena/CoreSystemDisplay.jsx", "utf8");
const hand = fs.readFileSync("src/components/game/arena/HandArea.jsx", "utf8");
const simulator = fs.readFileSync("src/pages/Simulator.jsx", "utf8");
const hudCss = fs.readFileSync("src/styles/arena/arenaHudV490.css", "utf8");

for (const [name, source] of [["CoreSystemDisplay", core], ["HandArea", hand]]) {
  for (const forbidden of ["applyGameAction", "onlineClient", "../game/", "../../game/", "services/"]) {
    if (source.includes(forbidden)) errors.push(`${name} must remain presentation-only; found ${forbidden}`);
  }
}

for (const marker of ["ReserveCoreDisplay", "CoreTrashDisplay", "<HandArea"]) {
  if (!simulator.includes(marker)) errors.push(`Simulator is not wired to ${marker}`);
}

if (!hudCss.includes("life-value-changed")) errors.push("Stable Life feedback hook is missing");
if (!hudCss.includes("position: relative !important")) errors.push("Life must neutralize the legacy absolute positioning");
if (!hudCss.includes("contain: layout paint")) errors.push("Life layout containment is missing");
if (!hudCss.includes("transform: none !important")) errors.push("Life transform neutralization is missing");
if (!hudCss.includes("life-core.is-empty")) errors.push("Fixed Life slot geometry is missing");

if (errors.length) {
  console.error("Arena Phase 4/5 audit FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Arena Phase 4/5 audit: OK");
