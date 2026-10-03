import fs from "node:fs";

const required = [
  "src/game/effectEngine/magicAutomation.js",
  "src/game/effectEngine/burstEngine.js",
  "src/game/effectEngine/braveEffectEngine.js",
  "src/game/effectEngine/magicBurstBrave.test.js"
];
for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Phase 13-15 missing: ${file}`);
}
const canonical = fs.readFileSync("src/game/effectEngine/canonicalEvents.js", "utf8");
for (const token of ["whenBraved", "whenCombined", "burstOpponentSummon", "burstOpponentMagic", "burstOwnSpiritDestroyed"]) {
  if (!canonical.includes(token)) throw new Error(`Phase 13-15 canonical event missing: ${token}`);
}
const effects = fs.readFileSync("src/game/effects.js", "utf8");
if (!effects.includes("pendingMagicResolution") && !effects.includes("stageMagicResolution")) throw new Error("Phase 13 staged Magic resolution missing");
console.log("Phase 13-15 audit: OK");
