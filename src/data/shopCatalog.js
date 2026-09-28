import { inferShopSagaId } from "./shopSagas.js";

export const SHOP_ARTWORK = Object.freeze({
  width: 600,
  height: 900,
  aspectRatio: "2:3",
  root: "/assets/shop-items"
});

export const SHOP_CATEGORIES = Object.freeze([
  { id: "boosters", labelPT: "Boosters", labelEN: "Boosters" },
  { id: "decks", labelPT: "Decks", labelEN: "Decks" },
  { id: "accessories", labelPT: "Acessórios", labelEN: "Accessories" },
  { id: "collection", labelPT: "Coleção", labelEN: "Collection" }
]);

const booster = (setCode, options = {}) => Object.freeze({
  id: `booster-${setCode.toLowerCase()}`,
  category: "boosters",
  productType: "booster",
  setCode,
  poolSetCodes: [setCode],
  sagaId: options.sagaId || inferShopSagaId(setCode),
  title: setCode,
  subtitlePT: options.subtitlePT || "Booster Pack",
  subtitleEN: options.subtitleEN || "Booster Pack",
  spiritPrice: options.spiritPrice ?? 300,
  packSize: options.packSize ?? 8,
  artwork: `/assets/shop-items/boosters/${setCode.toLowerCase()}.webp`,
  status: "active"
});

const deck = (setCode, options = {}) => Object.freeze({
  id: options.id || `deck-${setCode.toLowerCase()}`,
  category: "decks",
  productType: "deck",
  setCode,
  sagaId: options.sagaId || inferShopSagaId(setCode),
  title: options.title || setCode,
  subtitlePT: options.subtitlePT || "Starter Deck",
  subtitleEN: options.subtitleEN || "Starter Deck",
  spiritPrice: options.spiritPrice ?? 1800,
  artwork: options.artwork || `/assets/shop-items/decks/${setCode.toLowerCase()}.webp`,
  recipeId: options.recipeId || `recipe-${setCode.toLowerCase()}`,
  starterEligible: options.starterEligible !== false,
  status: options.status || "active",
  dataNotePT: options.dataNotePT || "",
  dataNoteEN: options.dataNoteEN || ""
});

export const SHOP_PRODUCTS = Object.freeze([
  booster("BS01"),
  booster("BS02"),
  booster("BS03"),
  booster("BS04"),
  booster("BS05"),
  booster("BS06"),
  booster("BS07"),
  booster("BS13", { spiritPrice: 350 }),
  booster("BSC49", { spiritPrice: 350, packSize: 9, subtitlePT: "Dream Booster", subtitleEN: "Dream Booster" }),
  Object.freeze({
    ...booster("PC01", { spiritPrice: 450, subtitlePT: "Premium Card Set", subtitleEN: "Premium Card Set" }),
    productType: "card-set",
    fixedContents: true,
    packSize: null
  }),
  Object.freeze({
    ...booster("PC02", { spiritPrice: 450, subtitlePT: "Premium Card Set", subtitleEN: "Premium Card Set" }),
    productType: "card-set",
    fixedContents: true,
    packSize: null
  }),

  deck("SD01", { id: "deck-sd01-blazing", recipeId: "recipe-sd01-blazing-thunder", title: "Blazing Thunder" }),
  deck("SD01", { id: "deck-sd01-diamond", recipeId: "recipe-sd01-diamond-deity", title: "Diamond Deity" }),
  deck("SD02", { recipeId: "recipe-sd02-roaring-heavens-door", title: "Roaring Heaven's Door" }),
  deck("SD03", { recipeId: "recipe-sd03-brave-dragon-sun", title: "Dan Bashin Deck: Brave Dragon of the Sun" }),
  deck("SD10", { recipeId: "recipe-sd10-shining-charge", title: "Tsurugi Deck: Shining Charge" }),
  deck("SD11", { recipeId: "recipe-sd11-dark-rush", title: "The Midnight King Yaiba's Deck: Dark Rush" }),
  deck("SD13", { recipeId: "recipe-sd13-amethyst", title: "Attribute Eye-Opening Deck: Amethyst" }),
  deck("SD14", { recipeId: "recipe-sd14-emerald", title: "Attribute Eye-Opening Deck: Emerald" }),
  deck("SD15", { recipeId: "recipe-sd15-topaz", title: "Attribute Eye-Opening Deck: Topaz" }),
  deck("SD16", { recipeId: "recipe-sd16-sapphire", title: "Attribute Eye-Opening Deck: Sapphire" }),
  deck("SD17", { recipeId: "recipe-sd17-darkness-fang", title: "New Tsurugi Deck: Darkness Fang" }),
  deck("SD19", { recipeId: "recipe-sd19-scorching-zero", title: "Ultimate Deck: Scorching Zero" }),
  deck("SD20", { recipeId: "recipe-sd20-silver-zero", title: "Ultimate Deck: Silver Zero" }),
  deck("SD22", { recipeId: "recipe-sd22-hurricane-zero", title: "Ultimate Deck: Zero the Hurricane" }),
  deck("SD23", { recipeId: "recipe-sd23-eris", title: "Ultimate Deck: Eris the Morning Star" }),
  deck("SD28", { recipeId: "recipe-sd28-land-deep-green", title: "Ultimate Deck: Land of Deep Green" }),
  deck("SD64", { recipeId: "recipe-sd64-infinite-bond", title: "Battle Spirits Dash Deck: The Infinite Bond" }),

  Object.freeze({
    id: "accessory-sleeve-01",
    category: "accessories",
    productType: "accessory",
    title: "Eternal Sleeve 01",
    subtitlePT: "Sleeve",
    subtitleEN: "Sleeve",
    spiritPrice: null,
    artwork: "/assets/shop-items/accessories/eternal-sleeve-01.webp",
    status: "unavailable"
  }),
  Object.freeze({
    id: "accessory-playmat-01",
    category: "accessories",
    productType: "accessory",
    title: "Eternal Playmat 01",
    subtitlePT: "Playmat",
    subtitleEN: "Playmat",
    spiritPrice: null,
    artwork: "/assets/shop-items/accessories/eternal-playmat-01.webp",
    status: "unavailable"
  })
]);

export const SHOP_PRODUCT_BY_ID = new Map(SHOP_PRODUCTS.map((product) => [product.id, product]));
export const ACTIVE_DECK_PRODUCTS = Object.freeze(
  SHOP_PRODUCTS.filter((product) => product.category === "decks" && product.status === "active")
);

// v5.0.2 — New-player onboarding mirrors every active deck in the Shop.
// Keep STARTER_DECK_PRODUCTS as a compatibility alias for existing imports.
export const ONBOARDING_DECK_PRODUCTS = ACTIVE_DECK_PRODUCTS;
export const STARTER_DECK_PRODUCTS = ONBOARDING_DECK_PRODUCTS;
