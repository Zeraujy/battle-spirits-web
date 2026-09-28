import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const required = [
  "src/game/effectEngine/effectSchema.js",
  "src/game/effectEngine/effectSchema.test.js",
  "src/game/effectEngine/effect-schema-v2.schema.json",
  "src/game/effectEngine/triggerDispatcher.js",
  "src/game/effectEngine/triggerDispatcher.test.js",
  "docs/effects/EFFECT-SCHEMA-V2.md",
  "docs/effects/TRIGGER-DISPATCHER.md"
];

const failures = [];
for (const rel of required) {
  if (!fs.existsSync(path.join(ROOT, rel))) failures.push(`Missing required file: ${rel}`);
}

const schema = fs.readFileSync(path.join(ROOT, "src/game/effectEngine/effectSchema.js"), "utf8");
for (const marker of ["EFFECT_SCHEMA_VERSION = 2", "EffectTriggerScope", "EventPlayerRelation", "validateEffectSchemaV2", "defineEffect"]) {
  if (!schema.includes(marker)) failures.push(`Effect Schema v2 missing marker: ${marker}`);
}

const dispatcher = fs.readFileSync(path.join(ROOT, "src/game/effectEngine/triggerDispatcher.js"), "utf8");
for (const marker of ["dispatchEffectEvent", "observerCandidates", "observerV2"]) {
  if (!dispatcher.includes(marker)) failures.push(`Trigger Dispatcher missing marker: ${marker}`);
}
if (!dispatcher.includes("continuationEvents") && !dispatcher.includes("enqueueEffectEvents")) failures.push("Trigger Dispatcher has no continuation/Effect Queue mechanism.");

const runtimeFiles = [
  "src/game/summon.js",
  "src/game/battle.js",
  "src/game/effects.js",
  "src/game/manualPlay.js",
  "src/game/specialRules.js"
];
for (const rel of runtimeFiles) {
  const source = fs.readFileSync(path.join(ROOT, rel), "utf8");
  if (!source.includes("dispatchEffectEvent")) failures.push(`${rel} is not wired to dispatchEffectEvent().`);
  if (source.includes("resolveCardEvent(")) failures.push(`${rel} still bypasses the central Trigger Dispatcher.`);
}

const jsonSchema = JSON.parse(fs.readFileSync(path.join(ROOT, "src/game/effectEngine/effect-schema-v2.schema.json"), "utf8"));
if (jsonSchema?.properties?.schemaVersion?.const !== 2) failures.push("Machine-readable JSON Schema is not pinned to schemaVersion 2.");

const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
for (const scriptName of ["effects:audit", "effects:phase23:audit", "effects:phase23:test"]) {
  if (!packageJson.scripts?.[scriptName]) failures.push(`package.json missing script: ${scriptName}`);
}

if (failures.length) {
  console.error("Effect foundation Phase 2–3 audit failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Effect foundation Phase 2–3 audit passed.");
console.log("- Effect Schema v2 contract present");
console.log("- Trigger Dispatcher present");
console.log("- runtime trigger entry points use the dispatcher");
console.log("- legacy source-only compatibility guard present");
