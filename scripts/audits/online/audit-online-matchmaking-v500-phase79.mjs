import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "server/matchmaking/QueueEntry.js",
  "server/matchmaking/MatchmakingQueue.js",
  "server/matchmaking/Matchmaker.js",
  "server/matchmaking/ReadyCheckSession.js",
  "server/matchmaking/ReadyCheckRegistry.js",
  "server/matchmaking/index.js",
  "server/matchmaking/matchmaking.test.js",
  "src/features/online/components/QueueStatus.jsx",
  "src/features/online/components/ReadyCheck.jsx",
  "src/styles/pages/onlineMatchmakingV500.css",
  "docs/online/phase-07-09-casual-matchmaking.md"
];

const errors = [];
for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) errors.push(`Missing ${relative}`);
}

const server = fs.readFileSync(path.join(root, "server/index.mjs"), "utf8");
const lobby = fs.readFileSync(path.join(root, "src/features/online/OnlineLobby.jsx"), "utf8");
const queue = fs.readFileSync(path.join(root, "server/matchmaking/MatchmakingQueue.js"), "utf8");
const ready = fs.readFileSync(path.join(root, "server/matchmaking/ReadyCheckSession.js"), "utf8");

for (const marker of [
  "new MatchmakingQueue({ queueType: QueueType.CASUAL })",
  '"matchmaking:readyCheck"',
  '"matchmaking:ready"',
  '"matchmaking:matched"',
  "createCasualMatchmakingRoom",
  "attemptCasualPairing"
]) {
  if (!server.includes(marker)) errors.push(`Server missing authoritative Casual marker: ${marker}`);
}

for (const forbidden of [
  '"matchmaking:host"',
  '"matchmaking:guest"',
  '"matchmaking:roomReady"',
  '"matchmaking:joined"',
  '"matchmaking:start"'
]) {
  if (server.includes(forbidden) || lobby.includes(forbidden)) {
    errors.push(`Legacy Casual handshake still active: ${forbidden}`);
  }
}

for (const marker of ["ReadyCheck", "QueueStatus", '"matchmaking:ready"', '"matchmaking:readyCheck"']) {
  if (!lobby.includes(marker)) errors.push(`OnlineLobby missing ${marker}`);
}

if (!queue.includes("bySocket")) errors.push("MatchmakingQueue must index entries by socket.");
if (!ready.includes("deadline")) errors.push("ReadyCheckSession must own the Ready Check deadline.");
if (!ready.includes("markReady")) errors.push("ReadyCheckSession must own readiness transitions.");

if (/\b(matchmakingPairRef|pairIdRef|hostSocketId|guestSocketId)\b/.test(lobby)) {
  errors.push("OnlineLobby still contains legacy host/guest pairing state.");
}

if (errors.length) {
  console.error("ONLINE MATCHMAKING PHASE 7-9 AUDIT FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("ONLINE MATCHMAKING PHASE 7-9 AUDIT OK");
