import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SHOP_PRODUCTS } from "../src/data/shopCatalog.js";
import { PREBUILT_DECKS } from "../src/data/prebuiltDecks.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "src", "data");
const ids = new Set();
for (const name of fs.readdirSync(dataDir).filter((name)=>name.endsWith(".json"))) {
  let parsed; try { parsed = JSON.parse(fs.readFileSync(path.join(dataDir,name),"utf8")); } catch { continue; }
  const cards = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.cards) ? parsed.cards : [];
  for (const card of cards) if (card?.id) ids.add(String(card.id));
}
const decks = SHOP_PRODUCTS.filter((p)=>p.productType === "deck");
const failures = [];
for (const product of decks) {
  const recipe = PREBUILT_DECKS.find((r)=>r.recipeId === product.recipeId);
  if (!recipe) { failures.push(`${product.id}: missing explicit recipe`); continue; }
  const total = recipe.cards.reduce((sum,e)=>sum+Number(e.quantity||0),0);
  if (total !== recipe.expectedSize) failures.push(`${product.id}: ${total}/${recipe.expectedSize} cards`);
  if (!product.title || product.title === product.setCode) failures.push(`${product.id}: generic title`);
  const missing = recipe.cards.filter((e)=>!ids.has(e.cardId)).map((e)=>e.cardId);
  if (product.status === "active" && missing.length) failures.push(`${product.id}: active with missing card data: ${missing.join(", ")}`);
}
const sd03 = PREBUILT_DECKS.find((r)=>r.recipeId === "recipe-sd03-brave-dragon-sun");
if (sd03.cards.some((e)=>/^SD03-006[A-D]$/.test(e.cardId))) failures.push("SD03 alternate arts leaked into recipe");
const sd64 = PREBUILT_DECKS.find((r)=>r.recipeId === "recipe-sd64-infinite-bond");
if (sd64.cards.some((e)=>e.cardId === "SD64-CP01")) failures.push("SD64 campaign card leaked into 40-card deck recipe");
const active = decks.filter((p)=>p.status === "active");
if (active.length !== 17) failures.push(`expected 17 active shop starter products, got ${active.length}`);
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log(`Starter Deck audit passed: ${decks.length} products, ${active.length} safely active, explicit recipes validated.`);
