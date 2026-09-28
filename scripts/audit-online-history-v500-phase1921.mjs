import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const required = [
  "server/results/matchHistoryRecord.js",
  "server/results/matchHistoryRecord.test.js",
  "src/online/errors/onlineErrorMessages.js",
  "src/online/errors/onlineErrorMessages.test.js",
  "docs/online/PHASE-19-21-HISTORY-ERRORS-UX.md"
];
for (const file of required) if (!fs.existsSync(path.join(root, file))) failures.push(`Missing ${file}`);
const text = (file) => fs.readFileSync(path.join(root, file), "utf8");
const server = text("server/index.mjs");
const history = text("src/services/matchHistoryService.js");
const lobby = text("src/pages/OnlineLobby.jsx");
const ranked = text("src/pages/RankedLobby.jsx");

for (const pattern of [
  /buildServerMatchHistoryRecords/,
  /persistServerMatchHistory/,
  /matchHistoryRecord:/,
  /settleRoomHistory\(/,
  /server_authoritative/
]) if (!pattern.test(server + text("server/results/matchHistoryRecord.js"))) failures.push(`History authority marker missing: ${pattern}`);

if (!/onlineMode[\s\S]{0,500}serverRecord/.test(history)) failures.push("Online history must consume a server record.");
if (!/if \(onlineMode\)[\s\S]{0,300}mode: "server"/.test(history)) failures.push("Online history must stop before client cloud persistence.");
if (!/onlineErrorMessage/.test(lobby) || !/onlineErrorMessage/.test(ranked)) failures.push("Lobby error handling is not centralized.");
if (/QueueStatus[\s\S]{0,180}<MatchMenuButton label="Voltar" disabled/.test(lobby)) failures.push("Searching state still contains a redundant disabled Back action.");
if (!/serverVerified=\{online \? Boolean\(roomState\?\.matchHistoryRecord\?\.server_authoritative\)/.test(text("src/pages/Simulator.jsx"))) failures.push("Result screen provenance marker is missing.");

if (failures.length) {
  console.error("Online Phase 19-21 audit FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Online Phase 19-21 audit: OK");
