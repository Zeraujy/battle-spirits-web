import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const required = [
  "docs/README.md",
  "docs/architecture/project-structure.md",
  "docs/architecture/script-and-data-layout.md",
  "docs/arena/arena-architecture.md",
  "docs/arena/arena-validation.md",
  "docs/effects/effect-engine.md",
  "docs/effects/effect-validation.md",
  "docs/online/online-architecture.md",
  "docs/online/online-validation.md",
  "docs/changelog/project-history.md",
  "docs/development/getting-started.md",
  "docs/deployment/cloudflare-deployment.md",
  "docs/maintenance/documentation-policy.md"
];
const forbiddenPaths = [
  "docs/project-status",
  "docs/validation",
  "docs/architecture/project-architecture-v3.md",
  "docs/deployment/cloudflare-deployment-legacy.md",
  "docs/development/test-results-v3.txt"
];

const failures = [];
for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) failures.push(`Missing required documentation: ${relative}`);
}
for (const relative of forbiddenPaths) {
  if (fs.existsSync(path.join(root, relative))) failures.push(`Obsolete documentation path returned: ${relative}`);
}

const docsRoot = path.join(root, "docs");
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});
for (const file of walk(docsRoot)) {
  const relative = path.relative(root, file).replaceAll(path.sep, "/");
  const base = path.basename(file);
  if (/[^\x00-\x7F]/.test(relative)) failures.push(`Non-ASCII documentation path: ${relative}`);
  if (base !== "README.md" && !/^[a-z0-9][a-z0-9.-]*\.(md|txt)$/.test(base)) {
    failures.push(`Documentation filename must use English-compatible lowercase kebab-case: ${relative}`);
  }
  if (/^(phase-|v\d+\.|changelog-\d)/i.test(base)) {
    failures.push(`Historical phase/version documentation must be consolidated: ${relative}`);
  }
}

if (failures.length) {
  console.error("Documentation audit failed:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log(`Documentation audit passed: ${walk(docsRoot).length} active files.`);
