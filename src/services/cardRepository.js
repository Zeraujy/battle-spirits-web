import { makeCardIndex, normalizeCard } from "../game/cardAdapter.js";
import { officialRestrictionForCard } from "../game/eternalDeckRules.js";

const modules = import.meta.glob("../data/*.json", { eager: true, import: "default" });
const byId = new Map();
const orderedModules = Object.entries(modules).sort(([a], [b]) => {
  const aBase = a.endsWith("/cards.json");
  const bBase = b.endsWith("/cards.json");
  if (aBase !== bBase) return aBase ? -1 : 1;
  return a.localeCompare(b);
});

function mergeCatalogOverride(previous, incoming) {
  if (!previous) return incoming;
  return { ...incoming, image: incoming.image || previous.image || null };
}

for (const [, rawModule] of orderedModules) {
  const list = Array.isArray(rawModule) ? rawModule : (Array.isArray(rawModule?.cards) ? rawModule.cards : []);
  for (const raw of list) {
    const card = normalizeCard(raw);
    if (!card.id || card.id === "unknown") continue;
    byId.set(card.id, mergeCatalogOverride(byId.get(card.id), card));
  }
}

export const cards = [...byId.values()];
export const cardIndex = makeCardIndex(cards);

function fold(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function localizedEffectText(card) {
  const text = card?.effectText;
  if (!text) return "";
  if (typeof text === "string") return text;
  return [text.ptBR, text.pt, text.en].filter(Boolean).join(" ");
}

const searchIndex = new Map(cards.map((card) => [
  card.id,
  fold([
    card.id,
    card.name,
    card.namePT,
    card.nameEN,
    card.set,
    card.rarity,
    ...(card.families || []),
    ...(card.subtypes || []),
    localizedEffectText(card)
  ].filter(Boolean).join(" "))
]));

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" }));
}


const SEARCH_CACHE_LIMIT = 80;
const RELATED_CACHE_LIMIT = 160;
const searchCache = new Map();
const relatedCache = new Map();

function remember(cache, key, value, limit) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);
  if (cache.size > limit) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
  return value;
}

function normalizedSearchKey(query, filters = {}) {
  return JSON.stringify([
    fold(query),
    filters.cardType || "",
    filters.color || "",
    filters.set || "",
    filters.rarity || "",
    filters.family || "",
    filters.costMin ?? "",
    filters.costMax ?? "",
    filters.reduction || "",
    filters.symbol || "",
    filters.restriction || "",
    filters.sort || "code"
  ]);
}

export const catalogMeta = Object.freeze({
  sets: uniqueSorted(cards.map((card) => card.set || String(card.id || "").split("-")[0])),
  rarities: uniqueSorted(cards.map((card) => card.rarity)),
  families: uniqueSorted(cards.flatMap((card) => card.families || [])),
  types: uniqueSorted(cards.map((card) => card.cardType)),
  colors: uniqueSorted(cards.flatMap((card) => card.colors || [])),
  reductions: uniqueSorted(cards.flatMap((card) => card.reduction || [])),
  symbols: uniqueSorted(cards.flatMap((card) => card.symbols || []))
});

function compareCards(a, b, sort = "code") {
  if (sort === "name") {
    return fold(a.namePT || a.nameEN || a.name).localeCompare(fold(b.namePT || b.nameEN || b.name), "pt-BR", { numeric: true });
  }
  if (sort === "cost") {
    return Number(a.cost || 0) - Number(b.cost || 0) || String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
  }
  if (sort === "rarity") {
    return String(a.rarity || "").localeCompare(String(b.rarity || ""), undefined, { sensitivity: "base" }) || String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
  }
  return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
}

export function searchCards(query = "", filters = {}) {
  const cacheKey = normalizedSearchKey(query, filters);
  const cached = searchCache.get(cacheKey);
  if (cached) {
    searchCache.delete(cacheKey);
    searchCache.set(cacheKey, cached);
    return cached;
  }

  const q = fold(query);
  const terms = q.split(/\s+/).filter(Boolean);
  const minCost = filters.costMin === "" || filters.costMin == null ? null : Number(filters.costMin);
  const maxCost = filters.costMax === "" || filters.costMax == null ? null : Number(filters.costMax);

  const result = cards.filter((card) => {
    if (terms.length) {
      const haystack = searchIndex.get(card.id) || "";
      if (!terms.every((term) => haystack.includes(term))) return false;
    }
    if (filters.cardType && card.cardType !== filters.cardType) return false;
    if (filters.color && !(card.colors || []).includes(filters.color)) return false;
    if (filters.set && (card.set || String(card.id || "").split("-")[0]) !== filters.set) return false;
    if (filters.rarity && String(card.rarity || "") !== filters.rarity) return false;
    if (filters.family && !(card.families || []).includes(filters.family)) return false;
    if (filters.reduction && !(card.reduction || []).includes(filters.reduction)) return false;
    if (filters.symbol && !(card.symbols || []).includes(filters.symbol)) return false;
    if (Number.isFinite(minCost) && Number(card.cost || 0) < minCost) return false;
    if (Number.isFinite(maxCost) && Number(card.cost || 0) > maxCost) return false;

    const restriction = officialRestrictionForCard(card);
    if (filters.restriction === "restricted" && !restriction) return false;
    if (filters.restriction === "clean" && restriction) return false;
    if (filters.restriction === "banned" && restriction?.kind !== "banned") return false;
    return true;
  });

  result.sort((a, b) => compareCards(a, b, filters.sort));
  return remember(searchCache, cacheKey, result, SEARCH_CACHE_LIMIT);
}

export function getRelatedCards(card, { limit = 8 } = {}) {
  if (!card) return [];
  const cacheKey = `${card.id || "unknown"}:${limit}`;
  const cached = relatedCache.get(cacheKey);
  if (cached) {
    relatedCache.delete(cacheKey);
    relatedCache.set(cacheKey, cached);
    return cached;
  }
  const families = new Set(card.families || []);
  const colors = new Set(card.colors || []);
  const set = card.set || String(card.id || "").split("-")[0];

  const related = cards
    .filter((candidate) => candidate.id !== card.id)
    .map((candidate) => {
      let score = 0;
      const sharedFamilies = (candidate.families || []).filter((family) => families.has(family)).length;
      const sharedColors = (candidate.colors || []).filter((color) => colors.has(color)).length;
      if (sharedFamilies) score += sharedFamilies * 8;
      if (sharedColors) score += sharedColors * 3;
      if (candidate.cardType === card.cardType) score += 2;
      if ((candidate.set || String(candidate.id || "").split("-")[0]) === set) score += 2;
      if (Number(candidate.cost || 0) === Number(card.cost || 0)) score += 1;
      return { candidate, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || String(a.candidate.id).localeCompare(String(b.candidate.id), undefined, { numeric: true }))
    .slice(0, limit)
    .map((entry) => entry.candidate);

  return remember(relatedCache, cacheKey, related, RELATED_CACHE_LIMIT);
}
