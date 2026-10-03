import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();

function collect(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collect(full);
    return entry.name.endsWith(".test.js") ? [full] : [];
  });
}

const files = [
  ...collect(path.join(root, "server")),
  ...collect(path.join(root, "src", "online"))
].sort();

if (!files.length) {
  console.error("MULTIPLAYER REGRESSION FAILED — no test files found");
  process.exit(1);
}

console.log(`Running multiplayer regression across ${files.length} test files...`);
const result = spawnSync(process.execPath, ["--test", ...files], {
  cwd: root,
  stdio: "inherit"
});
process.exit(result.status ?? 1);
