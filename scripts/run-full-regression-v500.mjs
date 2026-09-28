import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function collect(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collect(full);
    return entry.name.endsWith(".test.js") ? [full] : [];
  });
}

const files = [
  ...collect(path.join(root, "src")),
  ...collect(path.join(root, "server"))
].sort();

console.log(`Running complete v5.0.0 regression across ${files.length} test files...`);
const result = spawnSync(process.execPath, ["--test", ...files], {
  cwd: root,
  stdio: "inherit"
});
process.exit(result.status ?? 1);
