export const SHOP_SAGAS = Object.freeze([
  Object.freeze({
    id: "wanderer-lolo",
    labelPT: "Wanderer Lolo Saga",
    labelEN: "Wanderer Lolo Saga",
    kind: "main-saga",
    descriptionPT: "Primeiro bloco principal de Battle Spirits, BS01–BS09.",
    descriptionEN: "The first main Battle Spirits block, BS01–BS09.",
    sortOrder: 10
  }),
  Object.freeze({
    id: "constellation",
    labelPT: "Constellation Saga",
    labelEN: "Constellation Saga",
    kind: "main-saga",
    descriptionPT: "Bloco principal BS10–BS13.",
    descriptionEN: "Main set block BS10–BS13.",
    sortOrder: 20
  }),
  Object.freeze({
    id: "sword-blade",
    labelPT: "Sword Blade Saga",
    labelEN: "Sword Blade Saga",
    kind: "era",
    descriptionPT: "Produtos da era Sword Blade/Sword Eyes.",
    descriptionEN: "Products from the Sword Blade / Sword Eyes era.",
    sortOrder: 30
  }),
  Object.freeze({
    id: "ultimate-battle",
    labelPT: "Ultimate Battle Saga",
    labelEN: "Ultimate Battle Saga",
    kind: "era",
    descriptionPT: "Produtos da era Ultimate Battle / Ultimate Zero.",
    descriptionEN: "Products from the Ultimate Battle / Ultimate Zero era.",
    sortOrder: 40
  }),
  Object.freeze({
    id: "contract",
    labelPT: "Contract Saga",
    labelEN: "Contract Saga",
    kind: "era",
    descriptionPT: "Produtos lançados na era Contract Saga, incluindo conteúdos comemorativos de Ultimate Zero.",
    descriptionEN: "Products released in the Contract Saga era, including Ultimate Zero anniversary products.",
    sortOrder: 50
  }),
  Object.freeze({
    id: "supplementary",
    labelPT: "Supplementary Sets",
    labelEN: "Supplementary Sets",
    kind: "supplementary",
    descriptionPT: "Dream Boosters, Theme Packs e outros produtos suplementares.",
    descriptionEN: "Dream Boosters, Theme Packs and other supplementary products.",
    sortOrder: 60
  })
]);

export const SHOP_SAGA_BY_ID = new Map(SHOP_SAGAS.map((saga) => [saga.id, saga]));

const ranges = Object.freeze([
  { prefix: "BS", from: 1, to: 9, sagaId: "wanderer-lolo" },
  { prefix: "BS", from: 10, to: 13, sagaId: "constellation" },
  { prefix: "BS", from: 19, to: 23, sagaId: "sword-blade" },
  { prefix: "BS", from: 24, to: 30, sagaId: "ultimate-battle" },
  { prefix: "SD", from: 1, to: 3, sagaId: "wanderer-lolo" },
  { prefix: "SD", from: 10, to: 18, sagaId: "sword-blade" },
  { prefix: "SD", from: 19, to: 28, sagaId: "ultimate-battle" }
]);

function numericCode(setCode, prefix) {
  const match = String(setCode || "").toUpperCase().match(new RegExp(`^${prefix}(\\d{2})`));
  return match ? Number(match[1]) : null;
}

export function inferShopSagaId(setCode) {
  const code = String(setCode || "").toUpperCase();
  if (code === "SD64" || code === "PC01" || code === "PC02") return "contract";
  if (code === "BSC49") return "supplementary";
  for (const range of ranges) {
    const value = numericCode(code, range.prefix);
    if (value != null && value >= range.from && value <= range.to) return range.sagaId;
  }
  return "supplementary";
}

export function sagaForProduct(product) {
  return SHOP_SAGA_BY_ID.get(product?.sagaId || inferShopSagaId(product?.setCode)) || SHOP_SAGA_BY_ID.get("supplementary");
}

export function sagaGroupsForProducts(products = []) {
  const counts = new Map();
  for (const product of products) {
    const saga = sagaForProduct(product);
    counts.set(saga.id, (counts.get(saga.id) || 0) + 1);
  }
  return SHOP_SAGAS
    .filter((saga) => counts.has(saga.id))
    .map((saga) => ({ ...saga, count: counts.get(saga.id) }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
