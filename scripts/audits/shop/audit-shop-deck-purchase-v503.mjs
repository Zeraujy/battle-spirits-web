import fs from "node:fs";
import path from "node:path";
import { SHOP_PRODUCTS } from "../../../src/data/shopCatalog.js";
import { PREBUILT_DECKS } from "../../../src/data/prebuiltDecks.js";

const root = process.cwd();
const migration = fs.readFileSync(path.join(root, "supabase/migrations/economy/economy-5.0.3-deck-purchase-fix.sql"), "utf8");
const starterMigration = fs.readFileSync(path.join(root, "supabase/migrations/economy/economy-5.0.1-starter-decks.sql"), "utf8");
const activeDecks = SHOP_PRODUCTS.filter((product) => product.category === "decks" && product.status === "active");
const recipeIds = new Set(PREBUILT_DECKS.map((deck) => deck.recipeId));
const problems = [];

if (!migration.includes("set product_type = 'deck'")) problems.push("v5.0.3 migration does not repair deck product_type.");
if (!migration.includes("if v_product.category='decks' or v_product.product_type='deck' then")) problems.push("Deck category is not authoritative in purchase RPC.");
const deckBranch = migration.indexOf("if v_product.category='decks' or v_product.product_type='deck' then");
const boosterBranch = migration.indexOf("elsif coalesce(v_product.product_type,'booster')='booster' then");
if (deckBranch < 0 || boosterBranch < 0 || deckBranch > boosterBranch) problems.push("Deck purchase branch must precede booster fallback.");
if (!migration.includes("validate product contents before charging the wallet")) problems.push("Purchase RPC must validate contents before wallet debit.");
if (!starterMigration.includes("product_type) values") || !starterMigration.includes("true,true,'deck')")) problems.push("Fresh v5.0.1 starter inserts must explicitly mark product_type=deck.");
for (const product of activeDecks) {
  if (!product.recipeId || !recipeIds.has(product.recipeId)) problems.push(`${product.id}: active Shop deck has no matching recipe.`);
  if (!starterMigration.includes(`'${product.id}'`)) problems.push(`${product.id}: missing from starter deck database migration.`);
}
if (problems.length) {
  console.error("SHOP DECK PURCHASE AUDIT FAILED");
  for (const issue of problems) console.error(`- ${issue}`);
  process.exit(1);
}
console.log(`SHOP DECK PURCHASE AUDIT OK — ${activeDecks.length}/${activeDecks.length} active decks are purchase-routable.`);
