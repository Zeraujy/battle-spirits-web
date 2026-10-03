import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "src/data/catalog/catalog-manifest.js",
  "src/data/catalog/shop-catalog.js",
  "src/data/catalog/shop-sagas.js",
  "src/data/decks/prebuilt-decks.js",
  "src/data/decks/prebuilt-decks.test.js",
  "src/data/cards.json",
  "data/effects/coverage.json",
  "data/effects/regression-scenarios.json"
];
const forbidden = [
  "src/data/catalogManifest.js",
  "src/data/shopCatalog.js",
  "src/data/shopSagas.js",
  "src/data/prebuiltDecks.js",
  "src/data/prebuiltDecks.test.js",
  "resources",
  "tools/import-ready",
  "data/effect-migrations"
];
let failed = false;
for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error(`MISSING ${rel}`);
    failed = true;
  }
}
for (const rel of forbidden) {
  if (fs.existsSync(path.join(root, rel))) {
    console.error(`LEGACY ${rel}`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log("Data/static content boundary audit PASS");
