import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cardsRoot = path.join(root, "public", "cards-database");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const files = walk(cardsRoot).filter((file) => /\.webp$/i.test(file));
const bytes = files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const oversized = files.filter((file) => fs.statSync(file).size > 180 * 1024);

console.log("Card image performance audit");
console.log(`- cartas WebP: ${files.length}`);
console.log(`- peso total: ${(bytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`- acima de 180 KB: ${oversized.length}`);
console.log("- estratégia preservada em v3.6.0: Database/Deck Builder reutilizam a arte WebP canônica; sem árvore duplicada de thumbnails.");

for (const file of oversized.slice(0, 20)) {
  console.warn(`  AVISO PESO: ${path.relative(root, file)} (${(fs.statSync(file).size / 1024).toFixed(0)} KB)`);
}
