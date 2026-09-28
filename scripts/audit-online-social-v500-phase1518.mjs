import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "server/challenges/ChallengeRequest.js",
  "server/challenges/ChallengeRegistry.js",
  "server/challenges/challenges.test.js",
  "server/matches/PrivateMatchRoom.js",
  "server/matches/RematchRequest.js",
  "server/matches/socialMatchFlow.test.js",
  "src/components/online/FriendChallengePrompt.jsx",
  "src/components/match/MatchResultScreen.jsx",
  "src/styles/pages/onlineSocialMatchV500.css",
  "docs/online/PHASE-15-18-SOCIAL-MATCH-FLOW.md"
];

const failures = [];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`Missing ${file}`);
}

function text(file) { return fs.readFileSync(path.join(root, file), "utf8"); }
const server = text("server/index.mjs");
const lobby = text("src/pages/OnlineLobby.jsx");
const simulator = text("src/pages/Simulator.jsx");

for (const pattern of [
  /challenge:send/,
  /challenge:accept/,
  /challenge:decline/,
  /areFriends\(/,
  /createFriendChallengeRoom/,
  /createPrivateMatchDescriptor/,
  /new RematchRequest/,
  /room:rematch-started/
]) {
  if (!pattern.test(server)) failures.push(`Server authority marker missing: ${pattern}`);
}

for (const pattern of [
  /loadFriends/,
  /getAccountAccessToken/,
  /FriendChallengePrompt/,
  /isFriendLobbyPlayer/,
  /challenge:matched/
]) {
  if (!pattern.test(lobby)) failures.push(`Friend challenge client marker missing: ${pattern}`);
}

if (!/MatchResultScreen/.test(simulator)) failures.push("Simulator is not using MatchResultScreen.");
if (/challenge:send[\s\S]{0,500}winnerId/.test(lobby)) failures.push("Client challenge flow must not send a winner.");
if (!/matchMode: roomMatchMode\(room\)/.test(server)) failures.push("Room summaries must expose normalized matchMode.");

if (failures.length) {
  console.error("Online Phase 15-18 audit FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Online Phase 15-18 audit: OK");
