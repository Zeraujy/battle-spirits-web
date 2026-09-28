import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ACTIVE_DECK_PRODUCTS, ONBOARDING_DECK_PRODUCTS } from "../src/data/shopCatalog.js";
import { PREBUILT_DECKS } from "../src/data/prebuiltDecks.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const activeIds = ACTIVE_DECK_PRODUCTS.map((p) => p.id).sort();
const onboardingIds = ONBOARDING_DECK_PRODUCTS.map((p) => p.id).sort();

if (JSON.stringify(activeIds) !== JSON.stringify(onboardingIds)) {
  failures.push(`Shop/onboarding mismatch: active=${activeIds.join(",")} onboarding=${onboardingIds.join(",")}`);
}
if (activeIds.length !== 17) failures.push(`expected 17 active decks, got ${activeIds.length}`);

for (const product of ONBOARDING_DECK_PRODUCTS) {
  if (product.category !== "decks" || product.status !== "active") failures.push(`${product.id}: onboarding product is not an active deck`);
  const recipe = PREBUILT_DECKS.find((entry) => entry.recipeId === product.recipeId);
  if (!recipe) failures.push(`${product.id}: missing explicit recipe ${product.recipeId}`);
}

const onboardingSource = fs.readFileSync(path.join(root, "src/components/economy/StarterOnboarding.jsx"), "utf8");
if (!onboardingSource.includes("ONBOARDING_DECK_PRODUCTS")) failures.push("StarterOnboarding does not use ONBOARDING_DECK_PRODUCTS");
if (onboardingSource.includes("STARTER_DECK_PRODUCTS.map")) failures.push("StarterOnboarding still maps the legacy starter-only source");

const serviceSource = fs.readFileSync(path.join(root, "src/services/economyService.js"), "utf8");
if (!serviceSource.includes('product.category !== "decks" || product.status !== "active"')) failures.push("Guest starter claim does not validate all active deck products");

const migration = fs.readFileSync(path.join(root, "supabase/ECONOMY-5.0.2-ONBOARDING-ALL-DECKS.sql"), "utf8");
if (!migration.includes("category='decks' and enabled=true")) failures.push("Authenticated starter claim is not based on active deck products");

if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log(`Onboarding deck audit passed: ${onboardingIds.length}/${activeIds.length} active Shop decks available in choose-3 onboarding.`);
