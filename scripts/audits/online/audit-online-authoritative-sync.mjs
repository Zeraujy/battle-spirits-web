import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const exists = (relative) => fs.existsSync(path.join(root, relative));
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const required = [
  "src/online/sync/stateSync.js",
  "src/online/connection/connectionState.js",
  "server/matches/stateSync.js",
  "server/connections/ReconnectManager.js",
  "server/matches/MatchPlayer.js",
  "server/matches/MatchSession.js"
];
for (const file of required) if (!exists(file)) failures.push(`Missing Phase 4-6 file: ${file}`);

const server = read("server/index.mjs");
for (const marker of [
  "const matchRegistry = new MatchRegistry()",
  "attachRoomMatchSession",
  "authoritativeMatch(room)",
  "commitAuthoritativeMatch",
  "validateClientStateVersion",
  "beginRoomReconnect",
  "matchSync: roomMatchSync(room)"
]) {
  if (!server.includes(marker)) failures.push(`Server authority wiring missing: ${marker}`);
}
if (!server.includes("applyGameAction(match, payload.action, playerId, cardIndex)")) {
  failures.push("game:action must execute against the authoritative match selected by the server.");
}
if (server.includes("payload.gameState") || server.includes("payload.matchState")) {
  failures.push("Server must never accept replacement match/game state from the client.");
}

const client = read("src/online/socketClient.js");
for (const marker of ["acceptServerSync", "stateVersion", 'socket.emit("room:resume"', 'socket.emit("game:action"']) {
  if (!client.includes(marker)) failures.push(`Client sync foundation missing: ${marker}`);
}
if (client.includes("gameState:")) failures.push("Online socket client must not upload gameState during reconnect/action sync.");

const player = read("server/matches/MatchPlayer.js");
for (const marker of ["sessionToken", "reconnectDeadline", "beginReconnect", "canReconnect"]) {
  if (!player.includes(marker)) failures.push(`MatchPlayer reconnect primitive missing: ${marker}`);
}

const session = read("server/matches/MatchSession.js");
for (const marker of ["stateVersion", "serverSequence", "beginReconnect", "reconnectPlayer", "commitGameState"]) {
  if (!session.includes(marker)) failures.push(`MatchSession Phase 4-6 primitive missing: ${marker}`);
}

if (failures.length) {
  console.error("ONLINE AUTHORITY v5.0.0 PHASE 4-6 AUDIT FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("ONLINE AUTHORITY v5.0.0 PHASE 4-6 AUDIT OK");
