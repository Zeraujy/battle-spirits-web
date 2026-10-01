import { supabase } from "./supabase.js";
import { SHOP_PRODUCT_BY_ID } from "../content/index.js";
import { clearAuthenticatedStorageUser, setAuthenticatedStorageUser } from "./storage.js";
import {
  safeNumber,
  normalizeWallet as normalizeWalletBase,
  formatCoins as formatCoinsBase,
  normalizeCollection as normalizeCollectionBase,
  summarizeCollection as summarizeCollectionBase,
  collectionQuantityMap as collectionQuantityMapBase
} from "./economyUtils.js";

const GUEST_ECONOMY_KEY = "bs-eternal:guest-economy:v2";
const PENDING_MIGRATION_KEY = "bs-eternal:pending-account-migration:v1";

export const MAX_OWNED_COPIES = 6;
export const ACCOUNT_CREATION_BONUS = Object.freeze({ spiritCoins: 1500, craftCoins: 1500 });
export const CURRENCIES = Object.freeze({ SPIRIT: "spirit", CRAFT: "craft" });
export const EMPTY_WALLET = Object.freeze({ spiritCoins: 0, craftCoins: 0 });
export const RARITY_CRAFT_VALUES = Object.freeze({
  C: 5,
  U: 10,
  R: 20,
  M: 40,
  X: 80,
  XX: 120,
  CP: 50,
  CX: 100,
  TX: 100,
  PX: 120
});

export const RARITY_CRAFT_COSTS = Object.freeze({
  C: 40,
  U: 80,
  R: 160,
  M: 320,
  X: 640,
  XX: 960,
  CP: 400,
  CX: 800,
  TX: 800,
  PX: 960
});
export const OWNED_CRAFT_DISCOUNT = 0.25;


export function normalizeWallet(raw = {}) {
  return normalizeWalletBase(raw);
}

export function formatCoins(value = 0) {
  return formatCoinsBase(value);
}

function normalizeCollection(raw = []) {
  return normalizeCollectionBase(raw, MAX_OWNED_COPIES);
}

function emptyGuestState() {
  return {
    wallet: { ...EMPTY_WALLET },
    collection: [],
    recipes: [],
    onboardingComplete: false,
    starterDeckIds: []
  };
}


function readGuestState() {
  if (typeof sessionStorage === "undefined") return emptyGuestState();
  try {
    const raw = sessionStorage.getItem(GUEST_ECONOMY_KEY);
    if (!raw) return emptyGuestState();
    const parsed = JSON.parse(raw);
    return {
      wallet: normalizeWallet(parsed.wallet),
      collection: normalizeCollection(parsed.collection),
      recipes: [...new Set(Array.isArray(parsed.recipes) ? parsed.recipes.map(String) : [])],
      onboardingComplete: Boolean(parsed.onboardingComplete),
      starterDeckIds: [...new Set(Array.isArray(parsed.starterDeckIds) ? parsed.starterDeckIds.map(String) : [])]
    };
  } catch {
    return emptyGuestState();
  }
}

function writeGuestState(state) {
  const next = {
    wallet: normalizeWallet(state?.wallet),
    collection: normalizeCollection(state?.collection),
    recipes: [...new Set(Array.isArray(state?.recipes) ? state.recipes.map(String) : [])],
    onboardingComplete: Boolean(state?.onboardingComplete),
    starterDeckIds: [...new Set(Array.isArray(state?.starterDeckIds) ? state.starterDeckIds.map(String) : [])]
  };
  try { sessionStorage.setItem(GUEST_ECONOMY_KEY, JSON.stringify(next)); } catch {}
  window?.dispatchEvent?.(new CustomEvent("bs:economy-changed"));
  return next;
}

export function getLocalEconomySnapshot() {
  const state = readGuestState();
  return { ...state, signedIn: false, source: "guest" };
}

export function getGuestMigrationSnapshot() {
  return readGuestState();
}

export function clearGuestEconomy() {
  try { sessionStorage.removeItem(GUEST_ECONOMY_KEY); } catch {}
}

export function savePendingAccountMigration(email, bundle) {
  try {
    localStorage.setItem(PENDING_MIGRATION_KEY, JSON.stringify({
      email: String(email || "").trim().toLowerCase(),
      bundle,
      createdAt: new Date().toISOString()
    }));
  } catch {}
}

export function loadPendingAccountMigration(email) {
  try {
    const raw = localStorage.getItem(PENDING_MIGRATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (String(parsed?.email || "").toLowerCase() !== String(email || "").trim().toLowerCase()) return null;
    return parsed?.bundle || null;
  } catch {
    return null;
  }
}

export function clearPendingAccountMigration() {
  try { localStorage.removeItem(PENDING_MIGRATION_KEY); } catch {}
}

export async function loadEconomySnapshot() {
  const guest = getLocalEconomySnapshot();
  if (!supabase) return guest;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) { clearAuthenticatedStorageUser(); return guest; }
    setAuthenticatedStorageUser(user.id);

    await supabase.rpc("bs_ensure_economy_account").catch?.(() => {});

    const [walletResult, collectionResult, recipeResult, progressResult] = await Promise.all([
      supabase.from("bs_player_wallets").select("spirit_coins,craft_coins").eq("user_id", user.id).maybeSingle(),
      supabase.from("bs_player_cards").select("card_id,quantity").eq("user_id", user.id).gt("quantity", 0).order("card_id"),
      supabase.from("bs_player_deck_recipes").select("recipe_id").eq("user_id", user.id),
      supabase.from("bs_player_progress").select("onboarding_complete,starter_deck_ids,account_creation_bonus_claimed").eq("user_id", user.id).maybeSingle()
    ]);

    if (walletResult.error || collectionResult.error) return { ...guest, signedIn: true, source: "guest-fallback" };

    return {
      signedIn: true,
      source: "account",
      wallet: normalizeWallet(walletResult.data || EMPTY_WALLET),
      collection: normalizeCollection(collectionResult.data || []),
      recipes: (recipeResult.data || []).map((entry) => String(entry.recipe_id)),
      onboardingComplete: Boolean(progressResult.data?.onboarding_complete),
      starterDeckIds: Array.isArray(progressResult.data?.starter_deck_ids) ? progressResult.data.starter_deck_ids : [],
      accountCreationBonusClaimed: Boolean(progressResult.data?.account_creation_bonus_claimed)
    };
  } catch {
    return guest;
  }
}

export function summarizeCollection(collection = []) {
  return summarizeCollectionBase(collection, MAX_OWNED_COPIES);
}

export function collectionQuantityMap(collection = []) {
  return collectionQuantityMapBase(collection, MAX_OWNED_COPIES);
}

export function craftValueForRarity(rarity) {
  return RARITY_CRAFT_VALUES[String(rarity || "C").toUpperCase()] ?? 5;
}

export function craftCostForCard(card, ownedQuantity = 0) {
  const rarity = String(card?.rarity || "C").toUpperCase();
  const base = RARITY_CRAFT_COSTS[rarity] ?? RARITY_CRAFT_COSTS.C;
  const discounted = Number(ownedQuantity || 0) > 0;
  return {
    base,
    discount: discounted ? OWNED_CRAFT_DISCOUNT : 0,
    cost: Math.max(1, Math.round(base * (discounted ? (1 - OWNED_CRAFT_DISCOUNT) : 1))),
    discounted
  };
}

export async function craftCard(cardOrId) {
  const { cardIndex } = await catalogRuntime();
  const card = typeof cardOrId === "string" ? cardIndex.get(cardOrId) : cardOrId;
  if (!card?.id) return { ok: false, error: "CARD_NOT_FOUND" };
  const snapshot = await loadEconomySnapshot();
  const owned = collectionQuantityMap(snapshot.collection).get(card.id) || 0;
  if (owned >= MAX_OWNED_COPIES) return { ok: false, error: "MAX_OWNED_COPIES" };
  const pricing = craftCostForCard(card, owned);

  if (!snapshot.signedIn) {
    const state = readGuestState();
    if (state.wallet.craftCoins < pricing.cost) return { ok: false, error: "INSUFFICIENT_CRAFT_COINS", pricing };
    state.wallet.craftCoins -= pricing.cost;
    const map = collectionQuantityMap(state.collection);
    map.set(card.id, owned + 1);
    state.collection = [...map.entries()].map(([cardId, quantity]) => ({ cardId, quantity }));
    writeGuestState(state);
    return { ok: true, pricing, snapshot: { ...state, signedIn: false, source: "guest" } };
  }

  if (!supabase) return { ok: false, error: "ACCOUNT_SERVICE_UNAVAILABLE" };
  const { data, error } = await supabase.rpc("bs_craft_card", {
    p_card_id: card.id,
    p_rarity: String(card.rarity || "C").toUpperCase()
  });
  if (error) return { ok: false, error: error.message || "CRAFT_FAILED", pricing };
  return { ok: true, result: data, pricing, snapshot: await loadEconomySnapshot() };
}

async function catalogRuntime() {
  const [{ cards, cardIndex }, { PREBUILT_DECKS, buildPrebuiltDeck }] = await Promise.all([
    import("./cardRepository.js"),
    import("../content/index.js")
  ]);
  return { cards, cardIndex, PREBUILT_DECKS, buildPrebuiltDeck };
}

export async function getProductCardPool(productOrId) {
  const product = typeof productOrId === "string" ? SHOP_PRODUCT_BY_ID.get(productOrId) : productOrId;
  if (!product) return [];
  const { cards } = await catalogRuntime();
  const sets = new Set((product.poolSetCodes || [product.setCode]).filter(Boolean).map((value) => String(value).toUpperCase()));
  return cards.filter((card) => sets.has(String(card.set || String(card.id).split("-")[0]).toUpperCase()));
}

export async function getDeckRecipe(productOrId) {
  const product = typeof productOrId === "string" ? SHOP_PRODUCT_BY_ID.get(productOrId) : productOrId;
  if (!product || product.productType !== "deck") return { ready: false, entries: [], reason: "invalid-product" };

  const { cards, cardIndex, PREBUILT_DECKS, buildPrebuiltDeck } = await catalogRuntime();
  const template =
    PREBUILT_DECKS.find((entry) => entry.recipeId === product.recipeId) ||
    PREBUILT_DECKS.find((entry) => entry.setCode === product.setCode && !entry.recipeId);

  if (!template) {
    return { ready: false, entries: [], reason: "missing-recipe", missingCardIds: [] };
  }

  const built = buildPrebuiltDeck(template, cards, cardIndex);
  return {
    ...built,
    productId: product.id,
    productStatus: product.status,
    reason: built.ready ? null : (built.missingCardIds?.length ? "missing-card-data" : "invalid-recipe")
  };
}

function weightedRandomCard(pool) {
  if (!pool.length) return null;
  const weights = { C: 60, U: 28, R: 9, M: 2.5, X: 0.45, XX: 0.08, CP: 1.5, CX: 0.3, TX: 0.3, PX: 0.15 };
  const weighted = pool.map((card) => ({ card, weight: weights[String(card.rarity || "C").toUpperCase()] ?? 1 }));
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) return entry.card;
  }
  return weighted.at(-1)?.card || null;
}

function grantCardToGuest(state, card, quantity = 1) {
  const map = collectionQuantityMap(state.collection);
  const events = [];
  for (let i = 0; i < quantity; i += 1) {
    const before = map.get(card.id) || 0;
    const duplicate = before > 0;
    const craft = duplicate ? craftValueForRarity(card.rarity) : 0;
    if (before < MAX_OWNED_COPIES) map.set(card.id, before + 1);
    if (craft) state.wallet.craftCoins += craft;
    events.push({ cardId: card.id, rarity: card.rarity || "C", before, after: before < MAX_OWNED_COPIES ? before + 1 : before, accepted: before < MAX_OWNED_COPIES, duplicate, overflow: before >= MAX_OWNED_COPIES, craftAwarded: craft });
  }
  state.collection = [...map.entries()].map(([cardId, quantityOwned]) => ({ cardId, quantity: quantityOwned }));
  return events;
}

async function purchaseAsGuest(product, quantity) {
  const state = readGuestState();
  const totalPrice = safeNumber(product.spiritPrice) * quantity;
  if (state.wallet.spiritCoins < totalPrice) return { ok: false, error: "INSUFFICIENT_SPIRIT_COINS" };
  state.wallet.spiritCoins -= totalPrice;
  const grants = [];

  if (product.productType === "booster") {
    const pool = await getProductCardPool(product);
    if (!pool.length) return { ok: false, error: "EMPTY_PRODUCT_POOL" };
    for (let pack = 0; pack < quantity; pack += 1) {
      for (let slot = 0; slot < safeNumber(product.packSize || 8); slot += 1) {
        const card = weightedRandomCard(pool);
        if (card) grants.push(...grantCardToGuest(state, card, 1).map((event) => ({ ...event, unitIndex: pack, slotIndex: slot })));
      }
    }
  } else if (product.productType === "card-set") {
    const pool = await getProductCardPool(product);
    const contents = pool.filter((card) => safeNumber(card.includedQuantity ?? 1) > 0);
    if (!contents.length) return { ok: false, error: "EMPTY_PRODUCT_POOL" };
    for (let unit = 0; unit < quantity; unit += 1) {
      for (const card of contents) {
        const copies = Math.max(1, safeNumber(card.includedQuantity ?? 1));
        grants.push(...grantCardToGuest(state, card, copies).map((event, slotIndex) => ({ ...event, unitIndex: unit, slotIndex })));
      }
    }
  } else if (product.productType === "deck") {
    const recipe = await getDeckRecipe(product);
    if (!recipe.ready) return { ok: false, error: "DECK_DATA_INCOMPLETE" };
    const { cardIndex } = await catalogRuntime();
    for (let copy = 0; copy < quantity; copy += 1) {
      for (const entry of recipe.entries) {
        const card = cardIndex.get(entry.cardId);
        if (card) grants.push(...grantCardToGuest(state, card, entry.quantity).map((event, slotIndex) => ({ ...event, unitIndex: copy, slotIndex })));
      }
    }
    state.recipes = [...new Set([...state.recipes, product.recipeId])];
  }

  writeGuestState(state);
  return { ok: true, snapshot: { ...state, signedIn: false, source: "guest" }, grants, totalPrice };
}

export async function purchaseShopProduct(productOrId, quantity = 1) {
  const product = typeof productOrId === "string" ? SHOP_PRODUCT_BY_ID.get(productOrId) : productOrId;
  const safeQuantity = Math.max(1, Math.min(20, safeNumber(quantity) || 1));
  if (!product || product.status !== "active" || product.spiritPrice == null) return { ok: false, error: "PRODUCT_UNAVAILABLE" };

  const snapshot = await loadEconomySnapshot();
  if (!snapshot.signedIn) return purchaseAsGuest(product, safeQuantity);
  if (!supabase) return { ok: false, error: "ACCOUNT_SERVICE_UNAVAILABLE" };

  const { data, error } = await supabase.rpc("bs_purchase_shop_product", {
    p_product_id: product.id,
    p_quantity: safeQuantity
  });
  if (error) return { ok: false, error: error.message || "PURCHASE_FAILED" };
  return {
    ok: true,
    result: data,
    grants: Array.isArray(data?.grants) ? data.grants : [],
    totalPrice: safeNumber(data?.totalPrice),
    snapshot: await loadEconomySnapshot()
  };
}

async function grantStarterDecksToGuest(productIds) {
  const unique = [...new Set(productIds.map(String))];
  if (unique.length !== 3) return { ok: false, error: "SELECT_EXACTLY_THREE" };
  const state = readGuestState();
  if (state.onboardingComplete) return { ok: true, snapshot: { ...state, signedIn: false, source: "guest" } };
  const { cardIndex } = await catalogRuntime();
  for (const productId of unique) {
    const product = SHOP_PRODUCT_BY_ID.get(productId);
    if (!product || product.category !== "decks" || product.status !== "active") return { ok: false, error: "INVALID_STARTER_DECK" };
    const recipe = await getDeckRecipe(product);
    if (!recipe.ready) return { ok: false, error: "DECK_DATA_INCOMPLETE" };
    for (const entry of recipe.entries) {
      const card = cardIndex.get(entry.cardId);
      if (card) grantCardToGuest(state, card, entry.quantity);
    }
    state.recipes = [...new Set([...state.recipes, product.recipeId])];
  }
  state.onboardingComplete = true;
  state.starterDeckIds = unique;
  writeGuestState(state);
  return { ok: true, snapshot: { ...state, signedIn: false, source: "guest" } };
}

export async function completeStarterOnboarding(productIds) {
  const unique = [...new Set((productIds || []).map(String))];
  const snapshot = await loadEconomySnapshot();
  if (!snapshot.signedIn) return grantStarterDecksToGuest(unique);
  if (!supabase) return { ok: false, error: "ACCOUNT_SERVICE_UNAVAILABLE" };
  const { data, error } = await supabase.rpc("bs_claim_starter_decks", { p_product_ids: unique });
  if (error) return { ok: false, error: error.message || "STARTER_CLAIM_FAILED" };
  return { ok: true, result: data, snapshot: await loadEconomySnapshot() };
}

export async function migrateGuestEconomyToCurrentAccount(bundle = null) {
  if (!supabase) return { ok: false, error: "ACCOUNT_SERVICE_UNAVAILABLE" };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { ok: false, error: "AUTH_REQUIRED" };
  // v4.6.0 security: the authenticated account creation grant is authoritative.
  // Guest wallet/cards are intentionally not submitted as trusted economy data.
  // The legacy RPC signature is kept server-side for compatibility, but these
  // client-authored values are fixed to neutral values and ignored by the DB.
  void bundle;
  const { data, error } = await supabase.rpc("bs_claim_account_creation_bundle", {
    p_guest_spirit: 0,
    p_guest_craft: 0,
    p_collection: [],
    p_recipes: [],
    p_onboarding_complete: false,
    p_starter_deck_ids: []
  });
  if (error) return { ok: false, error: error.message || "MIGRATION_FAILED" };
  clearGuestEconomy();
  clearPendingAccountMigration();
  return { ok: true, result: data, snapshot: await loadEconomySnapshot() };
}
