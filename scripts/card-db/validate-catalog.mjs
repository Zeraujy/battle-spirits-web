import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateCatalogCard } from "../../src/services/cardCatalogValidation.js";
import { readCatalogCards } from "./catalog-files.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dataDir = path.join(root, "src", "data");
const { cards, sources } = readCatalogCards(dataDir);
let errors = 0;
let warnings = 0;
const warningLimit = 25;

for (const card of cards) {
  const report = validateCatalogCard(card);
  const source = path.relative(root, sources.get(report.id) || dataDir).replaceAll(path.sep, "/");
  for (const message of report.errors) {
    console.error(`ERRO ${report.id || "SEM-ID"} (${source}): ${message}`);
    errors += 1;
  }
  if (warnings < warningLimit) {
    for (const message of report.warnings) {
      console.warn(`AVISO ${report.id || "SEM-ID"} (${source}): ${message}`);
      warnings += 1;
      if (warnings >= warningLimit) break;
    }
  }
}

const imageRoots = [path.join(root, "public", "cards-database")];
let localImageMisses = 0;
for (const card of cards) {
  const image = String(card.image ?? card.imagePath ?? card.frontImage ?? "").replaceAll("\\", "/");
  if (!image || /^(?:https?:|data:|blob:)/i.test(image)) continue;
  const relative = image.replace(/^\.\//, "").replace(/^\/+/, "").replace(/^public\//i, "");
  const candidate = path.join(root, "public", relative.replace(/^cards-database\//i, "cards-database/"));
  if (!fs.existsSync(candidate)) localImageMisses += 1;
}

console.log(`\nCatálogo: ${cards.length} cartas únicas.`);
console.log(`Erros de schema: ${errors}.`);
console.log(`Avisos exibidos: ${warnings}${warnings >= warningLimit ? "+" : ""}.`);
console.log(`Referências locais de imagem ausentes: ${localImageMisses}.`);
if (errors || localImageMisses) process.exit(1);
console.log("CARD CATALOG VALIDATION OK");
