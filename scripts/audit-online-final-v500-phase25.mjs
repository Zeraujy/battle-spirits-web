import fs from "node:fs";

const failures = [];
const read = (file) => fs.readFileSync(file, "utf8");
const pkg = JSON.parse(read("package.json"));

const required = [
  "docs/changelog/CHANGELOG-5.0.0.md",
  "docs/online/PHASE-22-25-FINAL-SECURITY-QA.md",
  "docs/online/V5.0.0-FINAL-QA.md",
  "scripts/audit-online-security-v500-phase22.mjs",
  "scripts/run-online-multiplayer-regression-v500.mjs",
  "scripts/run-online-ranked-regression-v500.mjs"
];
for (const file of required) if (!fs.existsSync(file)) failures.push(`Missing ${file}`);

if (pkg.version !== "5.0.0") failures.push(`Expected package version 5.0.0, found ${pkg.version}`);
for (const [file, marker] of [
  ["src/config/appVersion.js", 'APP_VERSION = "5.0.0"'],
  ["server/index.mjs", 'version: "5.0.0"'],
  ["src/pages/Simulator.jsx", "Eternal v5.0.0"],
  ["src/components/common/ProjectInfoButtons.jsx", 'version: "5.0.0"']
]) if (!read(file).includes(marker)) failures.push(`v5.0.0 marker missing in ${file}`);

const packageText = read("package.json");
for (const marker of [
  "online:v500:phase22:audit",
  "online:v500:phase23:test",
  "online:v500:phase24:test",
  "online:v500:phase25:audit",
  "online:v500:final:check"
]) if (!packageText.includes(marker)) failures.push(`Final QA script missing from package.json: ${marker}`);

const server = read("server/index.mjs");
for (const authority of [
  "finalizeMatchResult",
  "commitAuthoritativeMatch",
  "validateClientStateVersion",
  "createDeckSnapshot",
  "OnlineEventGuard"
]) if (!server.includes(authority)) failures.push(`Authority marker missing: ${authority}`);

if (failures.length) {
  console.error("Online v5.0.0 Phase 25 final audit FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Online v5.0.0 Phase 25 final audit: OK");
