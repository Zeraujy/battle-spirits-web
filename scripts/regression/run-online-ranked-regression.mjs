import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const rel = [
  "server/matchmaking/rankedMatchmaking.test.js",
  "server/results/rankedResultAuthority.test.js",
  "server/policies/competitivePolicies.test.js",
  "server/matches/deckLock.test.js",
  "server/matches/matchSession.test.js",
  "server/matches/stateSync.test.js",
  "server/connections/ReconnectManager.test.js",
  "server/results/matchHistoryRecord.test.js",
  "server/security/onlineSecurity.test.js",
  "server/matches/sanitizeMatch.test.js",
  "src/online/domain/domain.test.js",
  "src/online/sync/stateSync.test.js",
  "src/online/connection/connectionState.test.js",
  "src/online/errors/onlineErrorMessages.test.js"
];

console.log(`Running Ranked regression across ${rel.length} test files...`);
const result = spawnSync(process.execPath, ["--test", ...rel.map((file) => path.join(root, file))], {
  cwd: root,
  stdio: "inherit"
});
process.exit(result.status ?? 1);
