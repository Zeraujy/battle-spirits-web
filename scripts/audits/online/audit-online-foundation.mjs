import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

const requiredFiles = [
  "src/online/domain/matchModes.js",
  "src/online/domain/matchStatus.js",
  "src/online/domain/queueTypes.js",
  "src/online/domain/onlineErrors.js",
  "src/online/domain/onlineConstants.js",
  "server/matches/MatchPlayer.js",
  "server/matches/MatchSession.js",
  "server/matches/MatchRegistry.js",
  "server/matches/matchSessionFactory.js",
  "server/matches/index.js",
  "src/online/domain/domain.test.js",
  "server/matches/matchSession.test.js"
];

for (const relative of requiredFiles) {
  if (!fs.existsSync(path.join(root, relative))) failures.push(`Missing required Online foundation file: ${relative}`);
}

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}


const sessionSource = read("server/matches/MatchSession.js");
for (const marker of ["stateVersion", "replaceGameState", "MatchStatus.ACTIVE", "snapshot("]) {
  if (!sessionSource.includes(marker)) failures.push(`MatchSession missing authority primitive: ${marker}`);
}

const playerSource = read("server/matches/MatchPlayer.js");
if (!playerSource.includes("PlayerConnectionState")) failures.push("MatchPlayer must own explicit connection state.");

const registrySource = read("server/matches/MatchRegistry.js");
if (!registrySource.includes("findBySocket")) failures.push("MatchRegistry must support server-side socket lookup.");

const serverSource = read("server/index.mjs");
if (!serverSource.includes('socket.emit') && !serverSource.includes('new Server')) {
  failures.push("Online server runtime entry point is unexpectedly missing.");
}

const clientSource = read("src/online/socketClient.js");
if (!clientSource.includes('socket.emit("game:action"')) failures.push("Existing client action boundary changed unexpectedly.");

if (failures.length) {
  console.error("ONLINE FOUNDATION v5.0.0 PHASE 0-2 AUDIT FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("ONLINE FOUNDATION v5.0.0 PHASE 0-2 AUDIT OK");
