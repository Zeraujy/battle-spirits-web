import fs from "node:fs";

const required = [
  "src/game/effectEngine/phase1618.test.js",
  "src/styles/arena/effectDecision.css",
  "src/features/arena/Simulator.jsx"
];
for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Phase 16-18 missing: ${file}`);
}

const canonical = fs.readFileSync("src/game/effectEngine/canonicalEvents.js", "utf8");
for (const token of ["ultimateTriggerGuard", "ultimateTriggerResolved", "xuTriggerHit", "criticalHit"]) {
  if (!canonical.includes(token)) throw new Error(`Phase 16 canonical event missing: ${token}`);
}

const actions = fs.readFileSync("src/game/effectEngine/coreActionLibrary.js", "utf8");
for (const token of ["chooseYesNo", "chooseCardsFromHand", "chooseCardsFromTrash", "chooseCardsFromDeck", "chooseOrder", "chooseCoreDistribution"]) {
  if (!actions.includes(token)) throw new Error(`Phase 17 decision action missing: ${token}`);
}

const engine = fs.readFileSync("src/game/effectEngine/effectEngine.js", "utf8");
for (const token of ["orderedInstanceIds", "coreDistribution", "pendingEffectDecision"]) {
  if (!engine.includes(token)) throw new Error(`Phase 17 authoritative decision path missing: ${token}`);
}

const simulator = fs.readFileSync("src/features/arena/Simulator.jsx", "utf8");
for (const token of ["effect-decision-order-list", "effect-decision-core-list", "Confirmar ordem", "Confirmar Cores"]) {
  if (!simulator.includes(token)) throw new Error(`Phase 18 Arena UI missing: ${token}`);
}

console.log("Phase 16-18 audit: OK");
