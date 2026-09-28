import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listSupportedCoreActionTypes } from "../../src/game/effectEngine/coreActionLibrary.js";
import { EffectDuration } from "../../src/game/effectEngine/durationSystem.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const required = [
  "src/game/effectEngine/coreActionLibrary.js",
  "src/game/effectEngine/coreActionLibrary.test.js",
  "src/game/effectEngine/modifierResolver.js",
  "src/game/effectEngine/modifierResolver.test.js",
  "src/game/effectEngine/durationSystem.js",
  "src/game/effectEngine/durationSystem.test.js",
  "docs/effects/CORE-ACTION-LIBRARY.md",
  "docs/effects/CONTINUOUS-EFFECTS-AND-MODIFIERS.md",
  "docs/effects/DURATION-SYSTEM.md"
];
const failures = [];
for (const rel of required) if (!fs.existsSync(path.join(ROOT, rel))) failures.push(`missing ${rel}`);

const actionResolver = fs.readFileSync(path.join(ROOT, "src/game/effectEngine/actionResolver.js"), "utf8");
const selectors = fs.readFileSync(path.join(ROOT, "src/game/selectors.js"), "utf8");
const dispatcher = fs.readFileSync(path.join(ROOT, "src/game/effectEngine/triggerDispatcher.js"), "utf8");
const modifierResolver = fs.readFileSync(path.join(ROOT, "src/game/effectEngine/modifierResolver.js"), "utf8");
if (!actionResolver.includes("canonicalActionType")) failures.push("actionResolver does not use Core Action Library");
if (!actionResolver.includes("registerContinuousModifier")) failures.push("actionResolver does not register continuous modifiers");
if (!selectors.includes("getContinuousNumericModifier")) failures.push("selectors do not consume numeric continuous modifiers");
if (!selectors.includes("applyContinuousCollectionModifiers")) failures.push("selectors do not consume collection continuous modifiers");
if (!dispatcher.includes('event: "continuous"')) failures.push("dispatcher does not activate continuous source effects");
if (!modifierResolver.includes("durationIsActive")) failures.push("ModifierRegistry is not duration-aware");
if (listSupportedCoreActionTypes().length < 30) failures.push("Core Action Library unexpectedly small");
for (const key of ["THIS_BATTLE","THIS_ATTACK","THIS_TURN","UNTIL_END_STEP","WHILE_SOURCE_EXISTS","WHILE_CONDITION_TRUE","PERMANENT"]) {
  if (!EffectDuration[key]) failures.push(`missing duration ${key}`);
}

// No card-specific branches are allowed in the new generic engines.
for (const rel of ["src/game/effectEngine/coreActionLibrary.js","src/game/effectEngine/modifierResolver.js","src/game/effectEngine/durationSystem.js"]) {
  const text = fs.readFileSync(path.join(ROOT, rel), "utf8");
  if (/\b(?:BS|SD|BSC|PC)\d{2}[-_][A-Z0-9-]+\b/i.test(text)) failures.push(`card id hardcoded in ${rel}`);
}

if (failures.length) {
  console.error("[effects phase 7-9 audit] FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`[effects phase 7-9 audit] OK — ${listSupportedCoreActionTypes().length} core action types, modifier registry and canonical durations validated.`);
