import fs from "node:fs";

const failures = [];
const read = (file) => fs.readFileSync(file, "utf8");
const pkg = JSON.parse(read("package.json"));

const required = [
  "scripts/audits/online/audit-online-security.mjs",
  "scripts/regression/run-online-multiplayer-regression.mjs",
  "scripts/regression/run-online-ranked-regression.mjs"
];
for (const file of required) if (!fs.existsSync(file)) failures.push(`Missing ${file}`);

if (!/^5\.(?:0|[1-9]\d*)\.\d+$/.test(String(pkg.version || ""))) failures.push(`Expected compatible v5.x package version, found ${pkg.version}`);
for (const [file, marker] of [
  ["src/app/config/app-version.js", `APP_VERSION = "${pkg.version}"`],
  ["server/index.mjs", `version: "${pkg.version}"`],
  ["src/features/arena/Simulator.jsx", `Eternal v${pkg.version}`],
  ["src/components/common/ProjectInfoButtons.jsx", `version: "${pkg.version}"`]
]) if (!read(file).includes(marker)) failures.push(`v5.x marker missing in ${file}`);

const packageText = read("package.json");
for (const marker of [
  "online:security:audit",
  "online:multiplayer:regression",
  "online:ranked:regression",
  "online:release:audit",
  "online:release:check"
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
