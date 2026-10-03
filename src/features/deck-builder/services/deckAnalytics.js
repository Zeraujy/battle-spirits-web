const COLOR_ORDER = ["red", "purple", "green", "white", "yellow", "blue"];
const TYPE_ORDER = ["spirit", "brave", "ultimate", "nexus", "magic"];

export function analyzeDeck(entries = [], cardIndex = new Map()) {
  const costCurve = Array(8).fill(0);
  const colors = Object.fromEntries(COLOR_ORDER.map((color) => [color, 0]));
  const types = Object.fromEntries(TYPE_ORDER.map((type) => [type, 0]));
  const reductions = Object.fromEntries(COLOR_ORDER.map((color) => [color, 0]));
  const symbols = Object.fromEntries(COLOR_ORDER.map((color) => [color, 0]));
  let total = 0;
  let totalCost = 0;

  for (const entry of entries || []) {
    const quantity = Math.max(0, Number(entry?.quantity || 0));
    if (!quantity) continue;
    const card = cardIndex.get(entry.cardId || entry.id);
    if (!card) continue;
    total += quantity;
    const cost = Math.max(0, Number(card.cost || 0));
    totalCost += cost * quantity;
    costCurve[Math.min(7, Math.floor(cost))] += quantity;
    if (types[card.cardType] != null) types[card.cardType] += quantity;
    for (const color of new Set(card.colors || [])) if (colors[color] != null) colors[color] += quantity;
    for (const color of card.reduction || []) if (reductions[color] != null) reductions[color] += quantity;
    for (const color of card.symbols || []) if (symbols[color] != null) symbols[color] += quantity;
  }

  const dominantColors = COLOR_ORDER
    .map((color) => ({ color, count: colors[color] }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);

  return {
    total,
    averageCost: total ? totalCost / total : 0,
    costCurve,
    colors,
    types,
    reductions,
    symbols,
    dominantColors
  };
}

export { COLOR_ORDER, TYPE_ORDER };
