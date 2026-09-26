import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readCatalogCards, setCodeFromCard } from "./catalog-files.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const { cards } = readCatalogCards(path.join(root, "src", "data"));
const sets = new Map();
for (const card of cards) {
  const code = setCodeFromCard(card);
  sets.set(code, (sets.get(code) || 0) + 1);
}
const setEntries = [...sets.entries()].sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true }));
const source = `/**\n * Generated catalog metadata.\n * Run \`npm run cards:sync\` after importing or editing card sets.\n */\nexport const CATALOG_CARD_COUNT = ${cards.length};\nexport const CATALOG_SET_COUNT = ${setEntries.length};\nexport const CATALOG_SETS = Object.freeze(${JSON.stringify(Object.fromEntries(setEntries), null, 2)});\n`;
fs.writeFileSync(path.join(root, "src", "data", "catalogManifest.js"), source, "utf8");
console.log(`Catalog manifest synchronized: ${cards.length} cards / ${setEntries.length} sets.`);
