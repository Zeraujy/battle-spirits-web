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
  id: `deck-${setCode.toLowerCase()}`,
  category: "decks",
  productType: "deck",
  setCode,
  sagaId: options.sagaId || inferShopSagaId(setCode),
  title: options.title || setCode,
  subtitlePT: options.subtitlePT || "Starter Deck",
  subtitleEN: options.subtitleEN || "Starter Deck",
  spiritPrice: options.spiritPrice ?? 1800,
  artwork: `/assets/shop-items/decks/${setCode.toLowerCase()}.webp`,
  recipeId: `recipe-${setCode.toLowerCase()}`,
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

  deck("SD01", { status: "catalog-only", starterEligible: false, dataNotePT: "O produto está no catálogo, mas a database atual ainda não possui uma receita de deck validada de 40 cartas.", dataNoteEN: "The product is listed, but the current database does not yet contain a validated 40-card deck recipe." }),
  deck("SD02", { status: "catalog-only", starterEligible: false, dataNotePT: "O produto está no catálogo, mas a database atual ainda não possui uma receita de deck validada de 40 cartas.", dataNoteEN: "The product is listed, but the current database does not yet contain a validated 40-card deck recipe." }),
  deck("SD03", { status: "catalog-only", starterEligible: false, dataNotePT: "O produto está no catálogo, mas a database atual ainda não possui uma receita de deck validada de 40 cartas.", dataNoteEN: "The product is listed, but the current database does not yet contain a validated 40-card deck recipe." }),
  deck("SD10", { title: "Tsurugi Deck: Shining Charge" }),
  deck("SD11", { title: "The Midnight King Yaiba's Deck: Dark Rush" }),
  deck("SD13", { title: "Attribute Eye-Opening Deck: Amethyst", status: "catalog-only", starterEligible: false, dataNotePT: "A lista completa usa reprints que ainda não estão no catálogo unificado.", dataNoteEN: "The full list uses reprints that are not yet available in the unified catalog." }),
  deck("SD14", {
    status: "catalog-only",
    starterEligible: false,
    dataNotePT: "A arte já está na database, mas a lista de cartas ainda precisa ser importada para ativar este deck.",
    dataNoteEN: "Artwork is already in the database, but its card list still needs to be imported before this deck can be activated."
  }),
  deck("SD15", { title: "Attribute Eye-Opening Deck: Topaz", status: "catalog-only", starterEligible: false, dataNotePT: "A lista completa usa reprints que ainda não estão no catálogo unificado.", dataNoteEN: "The full list uses reprints that are not yet available in the unified catalog." }),
  deck("SD16", {
    status: "catalog-only",
    starterEligible: false,
    dataNotePT: "A arte já está na database, mas a lista de cartas ainda precisa ser importada para ativar este deck.",
    dataNoteEN: "Artwork is already in the database, but its card list still needs to be imported before this deck can be activated."
  }),
  deck("SD17", { title: "New Tsurugi Deck: Darkness Fang" }),
  deck("SD19", { title: "Ultimate Deck: Scorching Zero" }),
  deck("SD20", { title: "Ultimate Deck: Silver Zero" }),
  deck("SD22"),
  deck("SD23", { title: "Ultimate Deck: Eris the Morning Star" }),
  deck("SD28", { title: "Ultimate Deck: Land of Deep Green" }),
  deck("SD64", { status: "catalog-only", starterEligible: false, dataNotePT: "O produto está no catálogo, mas a database atual ainda não possui uma receita de deck validada de 40 cartas.", dataNoteEN: "The product is listed, but the current database does not yet contain a validated 40-card deck recipe." }),

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
export const STARTER_DECK_PRODUCTS = Object.freeze(
  SHOP_PRODUCTS.filter((product) => product.category === "decks" && product.starterEligible && product.status === "active")
);
