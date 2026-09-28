export function safeNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

export function normalizeWallet(raw = {}) {
  return {
    spiritCoins: safeNumber(raw.spiritCoins ?? raw.spirit_coins),
    craftCoins: safeNumber(raw.craftCoins ?? raw.craft_coins)
  };
}

export function formatCoins(value = 0) {
  return safeNumber(value).toLocaleString("pt-BR");
}

export function normalizeCollection(raw = [], maxOwnedCopies = 6) {
  const merged = new Map();
  for (const entry of Array.isArray(raw) ? raw : []) {
    const cardId = String(entry?.cardId || entry?.card_id || "").trim();
    if (!cardId) continue;
    const quantity = Math.min(maxOwnedCopies, safeNumber(entry?.quantity));
    if (quantity > 0) merged.set(cardId, Math.max(merged.get(cardId) || 0, quantity));
  }
  return [...merged.entries()].map(([cardId, quantity]) => ({ cardId, quantity }));
}

export function summarizeCollection(collection = [], maxOwnedCopies = 6) {
  return normalizeCollection(collection, maxOwnedCopies).reduce((summary, entry) => {
    summary.uniqueCards += 1;
    summary.totalCopies += entry.quantity;
    if (entry.quantity > 1) summary.duplicateCopies += entry.quantity - 1;
    return summary;
  }, { uniqueCards: 0, totalCopies: 0, duplicateCopies: 0 });
}

export function collectionQuantityMap(collection = [], maxOwnedCopies = 6) {
  return new Map(normalizeCollection(collection, maxOwnedCopies).map((entry) => [entry.cardId, entry.quantity]));
}
