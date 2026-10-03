import fs from "node:fs";

const required = [
  "src/game/effectEngine/triggerOrderingEngine.js",
  "src/game/effectEngine/triggerOrdering.test.js",
  "server/matches/effectDecisionAuthority.js",
  "server/matches/effectDecisionAuthority.test.js",
];
for (const file of required) if (!fs.existsSync(file)) throw new Error(`Phase 19-20 missing: ${file}`);
const server = fs.readFileSync("server/index.mjs", "utf8");
if (!server.includes("validateServerEffectDecisionIntent")) throw new Error("Server authority validator is not wired before reducer execution.");
const sanitize = fs.readFileSync("server/matches/sanitizeMatch.js", "utf8");
if (!sanitize.includes("candidateCount") || !sanitize.includes("candidates: []")) throw new Error("Opponent effect-decision redaction missing.");
const dispatcher = fs.readFileSync("src/game/effectEngine/triggerDispatcher.js", "utf8");
for (const token of ["buildTriggerBatch", "nextAmbiguousTriggerGroup", "triggerOrderDecision"]) if (!dispatcher.includes(token)) throw new Error(`Trigger dispatcher missing ${token}`);
const engine = fs.readFileSync("src/game/effectEngine/effectEngine.js", "utf8");
for (const token of ["chooseTriggerOrder", "orderedTriggerIds", "applyTriggerGroupOrder"]) if (!engine.includes(token)) throw new Error(`Trigger ordering resolution missing ${token}`);
console.log("Phase 19-20 audit: OK");
