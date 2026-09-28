import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EffectEvent, isRuntimeDispatchedEvent } from "../../src/game/effectEngine/canonicalEvents.js";
import { listSupportedCoreActionTypes } from "../../src/game/effectEngine/coreActionLibrary.js";
import { PHASE_EVENT_MAP } from "../../src/game/effectEngine/phaseTriggerEngine.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const required = [
  "src/game/effectEngine/replacementEngine.js",
  "src/game/effectEngine/replacementState.js",
  "src/game/effectEngine/replacementEngine.test.js",
  "src/game/effectEngine/battleTriggerEngine.js",
  "src/game/effectEngine/battleTriggerEngine.test.js",
  "src/game/effectEngine/phaseTriggerEngine.js",
  "src/game/effectEngine/phaseTriggerEngine.test.js",
  "docs/effects/REPLACEMENT-AND-PREVENTION-EFFECTS.md",
  "docs/effects/BATTLE-TRIGGER-EXPANSION.md",
  "docs/effects/STEP-AND-PHASE-TRIGGER-ENGINE.md"
];
const failures = [];
for (const rel of required) if (!fs.existsSync(path.join(ROOT, rel))) failures.push(`missing ${rel}`);

const battle = fs.readFileSync(path.join(ROOT, "src/game/battle.js"), "utf8");
const turn = fs.readFileSync(path.join(ROOT, "src/game/turn.js"), "utf8");
const actionResolver = fs.readFileSync(path.join(ROOT, "src/game/effectEngine/actionResolver.js"), "utf8");
const dispatcher = fs.readFileSync(path.join(ROOT, "src/game/effectEngine/triggerDispatcher.js"), "utf8");
if (!battle.includes("resolveReplacementWindow")) failures.push("battle does not open replacement windows");
if (!battle.includes('"whenBattles"')) failures.push("battle does not dispatch whenBattles");
if (!battle.includes('"whenBlocked"')) failures.push("battle does not dispatch whenBlocked");
if (!battle.includes('"beforeBattleResolution"')) failures.push("battle does not dispatch beforeBattleResolution");
if (!battle.includes('"afterBattleResolution"')) failures.push("battle does not dispatch afterBattleResolution");
if (!turn.includes("dispatchPhaseEntry")) failures.push("turn flow does not dispatch canonical phase events");
if (!actionResolver.includes('type === "preventEvent"')) failures.push("preventEvent action missing");
if (!actionResolver.includes('type === "replaceEvent"')) failures.push("replaceEvent action missing");
if (!dispatcher.includes("AMBIENT_LEGACY_EVENTS")) failures.push("legacy ambient phase compatibility missing");
for (const event of [
  EffectEvent.WHEN_BATTLES,
  EffectEvent.WHEN_BLOCKED,
  EffectEvent.BEFORE_BATTLE_RESOLUTION,
  EffectEvent.AFTER_BATTLE_RESOLUTION,
  EffectEvent.WOULD_BE_DESTROYED,
  EffectEvent.WOULD_LOSE_LIFE,
  EffectEvent.START_STEP,
  EffectEvent.ATTACK_STEP,
  EffectEvent.END_STEP
]) {
  if (!isRuntimeDispatchedEvent(event)) failures.push(`runtime event not marked dispatched: ${event}`);
}
for (const phase of ["start","core","draw","refresh","main","attack","end"]) if (!PHASE_EVENT_MAP[phase]) failures.push(`phase event missing: ${phase}`);
for (const action of ["preventEvent", "replaceEvent"]) if (!listSupportedCoreActionTypes().includes(action)) failures.push(`core action missing: ${action}`);

for (const rel of ["replacementEngine.js","replacementState.js","battleTriggerEngine.js","phaseTriggerEngine.js"]) {
  const text = fs.readFileSync(path.join(ROOT, "src/game/effectEngine", rel), "utf8");
  if (/\b(?:BS|SD|BSC|PC)\d{2}[-_][A-Z0-9-]+\b/i.test(text)) failures.push(`card id hardcoded in ${rel}`);
}

if (failures.length) {
  console.error("[effects phase 10-12 audit] FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("[effects phase 10-12 audit] OK — replacement/prevention, battle trigger expansion and step/phase dispatch validated.");
