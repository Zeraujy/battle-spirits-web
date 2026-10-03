import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const failures = [];
const mustExist = [
  "src/app/App.jsx",
  "src/features/arena/Simulator.jsx",
  "src/services/cards/cardRepository.js",
  "src/data/catalog/catalog-manifest.js",
  "scripts/audits/project/audit-source-architecture.mjs",
  "scripts/audits/project/audit-data-boundaries.mjs",
  "scripts/audits/project/audit-documentation.mjs",
  "docs/arena/arena-architecture.md",
  "docs/arena/arena-validation.md",
  "docs/effects/effect-engine.md",
  "docs/effects/effect-validation.md",
  "docs/online/online-architecture.md",
  "docs/online/online-validation.md",
  "docs/changelog/project-history.md"
];
const mustNotExist = [
  "src/pages",
  "resources",
  "tools/import-ready",
  "docs/project-status",
  "docs/validation",
  "scripts/maintenance/normalize-documentation-filenames.mjs"
];
for (const relative of mustExist) {
  if (!fs.existsSync(path.join(root, relative))) failures.push(`Missing final architecture path: ${relative}`);
}
for (const relative of mustNotExist) {
  if (fs.existsSync(path.join(root, relative))) failures.push(`Obsolete architecture path returned: ${relative}`);
}

const walk = (dir) => fs.existsSync(dir)
  ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : [full];
    })
  : [];

for (const file of [...walk(path.join(root, "scripts/audits/arena")), ...walk(path.join(root, "scripts/audits/online"))]) {
  if (!file.endsWith(".mjs")) continue;
  const source = fs.readFileSync(file, "utf8");
  if (source.includes("docs/")) {
    failures.push(`Executable gameplay audit depends on documentation: ${path.relative(root, file).replaceAll(path.sep, "/")}`);
  }
}

for (const file of walk(path.join(root, "docs"))) {
  const base = path.basename(file);
  if (/^(phase-|v\d+\.|changelog-\d)/i.test(base)) {
    failures.push(`Historical phase/version document remains: ${path.relative(root, file).replaceAll(path.sep, "/")}`);
  }
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const serializedScripts = JSON.stringify(packageJson.scripts || {});
if (serializedScripts.includes("docs:normalize")) failures.push("One-time documentation normalizer is still wired into npm scripts.");
if (!packageJson.scripts?.["architecture:audit"]) failures.push("architecture:audit command is missing.");

if (failures.length) {
  console.error("Final architecture audit failed:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("FINAL ARCHITECTURE AUDIT OK — documentation is decoupled from gameplay audits and the cleaned repository boundaries are stable.");
