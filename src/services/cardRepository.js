import { makeCardIndex, normalizeCard } from "../game/cardAdapter.js";

// Carrega todos os JSONs existentes em src/data. Assim o rebuild aceita tanto um
// cards.json consolidado quanto os arquivos SD/BS separados do projeto antigo.
const modules = import.meta.glob("../data/*.json", { eager: true, import: "default" });
const byId = new Map();

// O cards.json consolidado entra primeiro. Arquivos específicos de coleção/deck
// entram depois e podem sobrescrever a mesma ID com a versão mais recente.
const orderedModules = Object.entries(modules).sort(([a], [b]) => {
  const aBase = a.endsWith("/cards.json");
  const bBase = b.endsWith("/cards.json");
  if (aBase !== bBase) return aBase ? -1 : 1;
  return a.localeCompare(b);
});

/**
 * Some set/deck JSON files intentionally contain only rules/text updates and
 * omit visual metadata such as the card artwork path.  `cards.json` is loaded
 * first and acts as the visual catalog; later files may override gameplay data.
 *
 * When an override does not declare an artwork, keep the artwork already known
 * for that card ID.  Without this inheritance the later record replaced the
 * complete catalog entry and the UI fell back to the generic card back.
 */
function mergeCatalogOverride(previous, incoming) {
  if (!previous) return incoming;

  return {
    ...incoming,
    image: incoming.image || previous.image || null
  };
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

export function searchCards(query = "", filters = {}) {
  const q = query.trim().toLocaleLowerCase("pt-BR");
  return cards.filter((card) => {
    if (q) {
      const haystack = [card.id, card.namePT, card.nameEN, ...(card.families || [])].join(" ").toLocaleLowerCase("pt-BR");
      if (!haystack.includes(q)) return false;
    }
    if (filters.cardType && card.cardType !== filters.cardType) return false;
    if (filters.color && !card.colors.includes(filters.color)) return false;
    return true;
  });
}
