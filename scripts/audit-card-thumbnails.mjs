import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const originals = path.join(root, "public", "cards-database");
const thumbs = path.join(root, "public", "cards-thumbnails");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

if (!fs.existsSync(thumbs)) {
  console.error("ERRO: public/cards-thumbnails não encontrado.");
  process.exit(1);
}

const sourceFiles = walk(originals).filter((file) => /\.webp$/i.test(file));
const missing = sourceFiles.filter((file) => !fs.existsSync(path.join(thumbs, path.relative(originals, file))));
const thumbFiles = walk(thumbs).filter((file) => /\.webp$/i.test(file));
const sourceBytes = sourceFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const thumbBytes = thumbFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);

console.log("Card thumbnail audit");
console.log(`- originais: ${sourceFiles.length}`);
console.log(`- thumbnails: ${thumbFiles.length}`);
console.log(`- ausentes: ${missing.length}`);
console.log(`- peso original: ${(sourceBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`- peso thumbnails: ${(thumbBytes / 1024 / 1024).toFixed(2)} MB`);

for (const file of missing.slice(0, 20)) console.error(`  THUMB AUSENTE: ${path.relative(root, file)}`);
if (missing.length) process.exit(1);
