import { makeCardIndex, normalizeCard } from "../game/cardAdapter.js";

// Carrega todos os JSONs existentes em src/data. Assim o rebuild aceita tanto um
// cards.json consolidado quanto os arquivos SD/BS separados do projeto antigo.
const modules = import.meta.glob("../data/*.json", { eager: true, import: "default" });
const byId = new Map();
for (const rawModule of Object.values(modules)) {
  const list = Array.isArray(rawModule) ? rawModule : (Array.isArray(rawModule?.cards) ? rawModule.cards : []);
  for (const raw of list) {
    const card = normalizeCard(raw);
    if (card.id && card.id !== "unknown") byId.set(card.id, card);
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
