import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const readyComponent = fs.readFileSync(path.join(root, "src/components/online/ReadyCheck.jsx"), "utf8");
const readySession = fs.readFileSync(path.join(root, "server/matchmaking/ReadyCheckSession.js"), "utf8");
const errors = [];

if (!readySession.includes("remainingMs")) errors.push("ReadyCheckSession must expose server-relative remainingMs.");
if (!readySession.includes("serverNow")) errors.push("ReadyCheckSession must expose serverNow for diagnostics.");
if (/disabled=\{[^}]*seconds\s*<=\s*0/.test(readyComponent)) {
  errors.push("Ready button must not trust the local clock for expiration authority.");
}
if (!readyComponent.includes("disabled={playerReady || submitting}")) {
  errors.push("Ready button should only be locally disabled by submission/readiness state.");
}
if (!readyComponent.includes("readyCheck?.remainingMs")) {
  errors.push("ReadyCheck UI must prefer server-relative remainingMs.");
}

if (errors.length) {
  console.error("ONLINE READY CHECK CLOCK-SKEW AUDIT FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("ONLINE READY CHECK CLOCK-SKEW AUDIT OK");
