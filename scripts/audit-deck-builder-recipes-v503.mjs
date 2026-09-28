import fs from "node:fs";

const decks = fs.readFileSync("src/pages/Decks.jsx", "utf8");
const data = fs.readFileSync("src/data/prebuiltDecks.js", "utf8");

const fail = (message) => {
  console.error(`[deck-builder-recipes] ${message}`);
  process.exitCode = 1;
};

if (!decks.includes("ownsPrebuiltDeckRecipe(template, ownedRecipes)")) {
  fail("Deck Builder must resolve ownership through explicit recipe IDs.");
}

if (decks.includes('ownedRecipes.includes(`recipe-${String(template.setCode')) {
  fail("Legacy set-only recipe filtering is still active in Deck Builder.");
}

if (!data.includes("template.recipeId") || !data.includes("legacyRecipeId")) {
  fail("Explicit recipe ownership or legacy compatibility helper is missing.");
}

if (!process.exitCode) {
  console.log("[deck-builder-recipes] OK - explicit recipe IDs + legacy compatibility enabled.");
}
