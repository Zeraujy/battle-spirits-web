import fs from "node:fs";

const cssPath = "src/styles/arena/combatLayoutStabilityV500.css";
const simulatorPath = "src/pages/Simulator.jsx";

const failures = [];
if (!fs.existsSync(cssPath)) failures.push(`Missing ${cssPath}`);

const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, "utf8") : "";
const simulator = fs.readFileSync(simulatorPath, "utf8");

const required = [
  ".arena-center-field > .battle-center-compact",
  "position: absolute !important",
  "min-height: 0 !important",
  "contain: layout",
  ".arena-battlefield > .arena-targeting-ux"
];
for (const token of required) {
  if (!css.includes(token)) failures.push(`Combat layout fix missing: ${token}`);
}

if (!simulator.includes('import "../styles/arena/combatLayoutStabilityV500.css";')) {
  failures.push("Simulator does not import combat layout stability stylesheet last");
}

if (failures.length) {
  console.error("COMBAT LAYOUT STABILITY AUDIT FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Combat layout stability audit: OK");
