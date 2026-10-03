import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "src/game/effectEngine/effectQueue.js",
  "src/game/effectEngine/effectQueue.test.js",
  "src/game/effectEngine/targetingEngine.js",
  "src/game/effectEngine/targetingEngine.test.js",
  "src/game/effectEngine/conditionEngine.js",
  "src/game/effectEngine/conditionEngine.test.js",
  "docs/effects/effect-queue-phase04.md",
  "docs/effects/targeting-engine-v2-phase05.md",
  "docs/effects/condition-engine-v2-phase06.md"
];

const errors = [];
for (const file of required) if (!fs.existsSync(path.join(root, file))) errors.push(`Missing ${file}`);

const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const dispatcher = read("src/game/effectEngine/triggerDispatcher.js");
const engine = read("src/game/effectEngine/effectEngine.js");
const targeting = read("src/game/effectEngine/targetingEngine.js");
const conditions = read("src/game/effectEngine/conditionEngine.js");
const targetFacade = read("src/game/effectEngine/targetResolver.js");
const conditionFacade = read("src/game/effectEngine/conditionResolver.js");

for (const marker of ["enqueueEffectEvents", "drainEffectQueue"]) if (!dispatcher.includes(marker)) errors.push(`Trigger Dispatcher missing ${marker}`);
if (!engine.includes("drainEffectQueue")) errors.push("Effect decision flow does not resume Effect Queue.");
for (const marker of ["minimumBP", "maximumBP", "minimumLevel", "symbols", "hasSoulCore", "braved"]) if (!targeting.includes(marker)) errors.push(`Targeting Engine missing ${marker}`);
for (const marker of ["handSize", "reserve", "fieldCount", "symbolCount", "soulCoreLocation", "battleState"]) if (!conditions.includes(marker)) errors.push(`Condition Engine missing ${marker}`);
if (!targetFacade.includes('from "./targetingEngine.js"')) errors.push("targetResolver is not a compatibility facade.");
if (!conditionFacade.includes('from "./conditionEngine.js"')) errors.push("conditionResolver is not a compatibility facade.");

// Foundation must remain data-driven: no production card IDs in the new engines.
for (const [name, source] of [["targetingEngine", targeting], ["conditionEngine", conditions]]) {
  if (/\b(?:BS|SD|BSC)\d{2}[-A-Z0-9]/.test(source)) errors.push(`${name} contains a card-specific ID.`);
}

if (errors.length) {
  console.error("Effect foundation Phase 4–6 audit failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("Effect foundation Phase 4–6 audit passed.");
