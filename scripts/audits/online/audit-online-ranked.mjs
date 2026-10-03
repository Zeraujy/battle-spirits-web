import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const server = read("server/index.mjs");
const pkg = JSON.parse(read("package.json"));
const requiredFiles = [
  "server/matchmaking/RankedMatchmaker.js",
  "server/matchmaking/RankedMatchContext.js",
  "server/results/finalizeMatchResult.js",
  "server/results/validateMatchResult.js",
  "server/results/resultPersistence.js",
  "server/policies/AbandonPolicy.js",
  "server/policies/DisconnectPolicy.js",
  "server/matchmaking/rankedMatchmaking.test.js",
  "server/results/rankedResultAuthority.test.js",
  "server/policies/competitivePolicies.test.js"
];

const errors = [];
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`Missing ${file}`);
}

const checks = [
  [server.includes('new MatchmakingQueue({ queueType: QueueType.RANKED })'), "Ranked queue must use MatchmakingQueue"],
  [server.includes("new RankedMatchmaker"), "RankedMatchmaker must own ranked pairing"],
  [!server.includes("rankedBySocket"), "Legacy rankedBySocket map must be removed"],
  [server.includes("finalizeMatchResult"), "Ranked result must use finalizeMatchResult"],
  [server.includes("abandonPolicy.resolveConcede"), "Concede must use server AbandonPolicy"],
  [server.includes("disconnectPolicy.resolveTimeout"), "Disconnect timeout must use server DisconnectPolicy"],
  [server.includes('onSafe(socket, "match:concede"'), "Server concede intent endpoint is missing"],
  [server.includes("createDeckSnapshot") && server.includes("validateDeckSnapshot"), "Ranked room must lock decks server-side"],
  [!server.includes("payload.winnerId") && !server.includes("payload.rpDelta"), "Server must not trust client winner/RP fields"],
  [Boolean(pkg.scripts?.["online:ranked:test"]), "Phase 12-14 test script missing"]
];
for (const [ok, message] of checks) if (!ok) errors.push(message);

if (errors.length) {
  console.error("ONLINE RANKED PHASE 12-14 AUDIT FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("ONLINE RANKED PHASE 12-14 AUDIT OK — queue, result and abandon authority remain server-owned.");
