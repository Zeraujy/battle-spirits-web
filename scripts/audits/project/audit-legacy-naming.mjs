import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const legacyName = /(phase\d+|v(?:3|4|5\d{2})(?:\D|$))/i;

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

for (const file of walk(path.join(root, "scripts"))) {
  const rel = path.relative(root, file).replaceAll("\\", "/");
  if (legacyName.test(path.basename(file))) failures.push(`Legacy permanent script filename: ${rel}`);
}

for (const file of walk(path.join(root, "src/game/effectEngine"))) {
  const rel = path.relative(root, file).replaceAll("\\", "/");
  if (file.endsWith(".test.js") && /^phase\d+/i.test(path.basename(file))) {
    failures.push(`Legacy phase-based test filename: ${rel}`);
  }
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
for (const key of Object.keys(pkg.scripts || {})) {
  if (/(phase\d+|v491|v500|v501|v502|v503)/i.test(key)) failures.push(`Legacy npm script key: ${key}`);
}

if (failures.length) {
  console.error("LEGACY NAMING AUDIT FAILED");
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}

console.log("LEGACY NAMING AUDIT OK — permanent scripts, test filenames and npm commands use functional English names.");
