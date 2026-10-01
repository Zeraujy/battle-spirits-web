import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselinePath = path.join(root, "architecture", "v5.2.0", "v5.1.0-semantic-baseline.json");
const publicManifestPath = path.join(root, "architecture", "v5.2.0", "v5.1.0-public-baseline-files.json");
const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
const publicManifest = JSON.parse(fs.readFileSync(publicManifestPath, "utf8"));
const problems = [];
const notices = [];

function hash(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function collectTree(subdir, { exclude = new Set(), ignore = () => false } = {}) {
  const base = path.join(root, subdir);
  const rows = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else {
        const rel = path.relative(root, full).replaceAll(path.sep, "/");
        if (exclude.has(rel) || ignore(rel)) continue;
        rows.push([rel, hash(fs.readFileSync(full))]);
      }
    }
  }
  walk(base);
  const digest = hash(rows.map(([rel, digest]) => `${rel}\0${digest}\n`).join(""));
  return { fileCount: rows.length, sha256: digest, rows };
}

function checkTree(label, subdir, options = {}) {
  const actual = collectTree(subdir, options);
  const expected = baseline.trees[label];
  if (!expected) problems.push(`Baseline entry missing: ${label}`);
  else {
    if (actual.fileCount !== expected.fileCount) problems.push(`${label} file count changed: ${expected.fileCount} -> ${actual.fileCount}`);
    if (actual.sha256 !== expected.sha256) problems.push(`${label} semantic tree hash changed`);
  }
  console.log(`${label}: ${actual.fileCount} files / ${actual.sha256.slice(0, 12)}…`);
}

function isLocalEnvironmentFile(rel) {
  const name = path.posix.basename(rel);
  // The updater intentionally preserves local environment files. They are deployment state,
  // not server source semantics, and must never invalidate the source parity lock.
  return name === ".env" || (name.startsWith(".env.") && name !== ".env.example") || name === ".dev.vars";
}

function checkPublicCanonicalSubset() {
  const expectedFiles = publicManifest.files;
  let checked = 0;
  for (const [rel, expectedHash] of Object.entries(expectedFiles)) {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) {
      problems.push(`public canonical file missing: ${rel}`);
      continue;
    }
    const actualHash = hash(fs.readFileSync(full));
    if (actualHash !== expectedHash) {
      problems.push(`public canonical file changed: ${rel}`);
    }
    checked += 1;
  }

  const actualPublic = collectTree("public");
  const canonical = new Set(Object.keys(expectedFiles));
  const extras = actualPublic.rows.map(([rel]) => rel).filter((rel) => !canonical.has(rel));
  if (extras.length) {
    notices.push(`public contains ${extras.length} preserved local/additional file(s); canonical baseline remains unchanged`);
  }
  console.log(`public canonical baseline: ${checked}/${Object.keys(expectedFiles).length} files verified byte-for-byte`);
  console.log(`public total on this machine: ${actualPublic.fileCount} files${extras.length ? ` (${extras.length} additional preserved)` : ""}`);
}
checkTree("src/game", "src/game");
checkTree("src/online", "src/online");
checkTree("server-excluding-index", "server", {
  exclude: new Set(["server/index.mjs"]),
  ignore: isLocalEnvironmentFile,
});
checkTree("supabase", "supabase");
checkPublicCanonicalSubset();

let serverIndex = fs.readFileSync(path.join(root, "server", "index.mjs"), "utf8");
serverIndex = serverIndex
  .replace(/version:\s*"[^"]+"/, 'version: "<APP_VERSION>"')
  .replace(/\n\/\/ v5\.2\.0 repository-boundary baseline\n/, "\n");
const normalizedHash = hash(serverIndex);
if (normalizedHash !== baseline.normalizedFiles["server/index.mjs"].sha256) {
  problems.push("server/index.mjs changed beyond the allowed version/comment-only Phase 0 delta");
}
console.log(`server/index.mjs normalized: ${normalizedHash.slice(0, 12)}…`);

for (const notice of notices) console.log(`NOTICE: ${notice}`);

if (problems.length) {
  console.error("v5.2.0 Phase 5 semantic parity audit: FAILED");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log("v5.2.0 Phase 5 semantic parity audit: PASS");
console.log("Gameplay, online authority, Supabase schema and canonical v5.1.0 public assets remain semantically locked.");
console.log("Preserved local environment files and additional public assets are allowed by updater policy and do not weaken canonical-file verification.");
