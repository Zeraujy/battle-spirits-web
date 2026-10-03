import fs from "node:fs";

const failures = [];
const read = (file) => fs.readFileSync(file, "utf8");
const required = [
  "server/security/OnlineEventGuard.js",
  "server/security/onlineSecurity.test.js",
  "server/matches/sanitizeMatch.js",
  "server/matches/sanitizeMatch.test.js",
];
for (const file of required) if (!fs.existsSync(file)) failures.push(`Missing ${file}`);

const server = read("server/index.mjs");
for (const marker of [
  "new OnlineEventGuard()",
  "onlineEventGuard.inspect(socket.id, eventName, payload)",
  "onlineEventGuard.clearSocket(socket.id)",
  "constantTimeTokenEqual(player.resumeToken, payload.resumeToken)",
  "rejectActivityConflict(socket.id",
  "sanitizeMatchForViewer(match, viewerId)"
]) if (!server.includes(marker)) failures.push(`Security marker missing: ${marker}`);

if (/payload\?\.winnerId|payload\.winnerId|payload\?\.rp|payload\.rp/.test(server)) {
  failures.push("Client-supplied winner/RP detected in server Online handlers");
}

const sanitizer = read("server/matches/sanitizeMatch.js");
for (const marker of ["hidden: true", "faceDown: true", "instanceId: card.instanceId"]) {
  if (!sanitizer.includes(marker)) failures.push(`Hidden-information sanitizer marker missing: ${marker}`);
}

const guard = read("server/security/OnlineEventGuard.js");
for (const marker of ["RATE_LIMITED", "PAYLOAD_TOO_LARGE", "game:action", "room:chat", "timingSafeEqual"]) {
  if (!guard.includes(marker)) failures.push(`Online event guard marker missing: ${marker}`);
}

if (failures.length) {
  console.error("Online v5.0.0 Phase 22 security audit FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Online v5.0.0 Phase 22 security audit: OK");
