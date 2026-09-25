import { validateDeck } from "../game/state.js";

const MASTERY_THRESHOLDS = [0, 120, 300, 620, 1050, 1650, 2500];

function quantity(entry) {
  return Math.max(0, Number(entry?.quantity || entry?.qty || entry?.count || 0));
}

function cardIdOf(entry) {
  return entry?.cardId || entry?.id || null;
}

function cardName(card, fallback) {
  return card?.namePT || card?.nameEN || card?.name || fallback || "Carta";
}

function masteryLevel(points) {
  let level = 1;
  for (let index = 0; index < MASTERY_THRESHOLDS.length; index += 1) {
    if (points >= MASTERY_THRESHOLDS[index]) level = index + 1;
  }
  return Math.min(7, level);
}

function nextThreshold(level) {
  if (level >= 7) return null;
  return MASTERY_THRESHOLDS[level] || null;
}

export function buildPlayerSocialInsights(decks = [], cardIndex = new Map()) {
  const safeDecks = Array.isArray(decks) ? decks : [];
  const cardUsage = new Map();
  const colorUsage = new Map();
  let totalCopies = 0;
  let validDecks = 0;

  for (const deck of safeDecks) {
    try {
      if (validateDeck(deck?.cards || [], cardIndex).ok) validDecks += 1;
    } catch {}

    const seenInDeck = new Set();
    for (const entry of deck?.cards || []) {
      const id = cardIdOf(entry);
      const copies = quantity(entry);
      if (!id || !copies) continue;
      totalCopies += copies;

      const card = cardIndex.get(id) || null;
      const current = cardUsage.get(id) || {
        id,
        name: cardName(card, id),
        image: card?.image || null,
        copies: 0,
        deckCount: 0,
        coverCount: 0,
        points: 0,
        colors: Array.isArray(card?.colors) ? card.colors : []
      };

      current.copies += copies;
      if (!seenInDeck.has(id)) {
        current.deckCount += 1;
        seenInDeck.add(id);
      }
      if (deck?.coverCardId === id) current.coverCount += 1;
      cardUsage.set(id, current);

      for (const color of current.colors) {
        colorUsage.set(color, (colorUsage.get(color) || 0) + copies);
      }
    }
  }

  const topCards = [...cardUsage.values()]
    .map((entry) => {
      const points = entry.copies * 18 + entry.deckCount * 110 + entry.coverCount * 260;
      const level = masteryLevel(points);
      return {
        ...entry,
        points,
        level,
        nextPoints: nextThreshold(level)
      };
    })
    .sort((a, b) => b.points - a.points || b.deckCount - a.deckCount || b.copies - a.copies)
    .slice(0, 12);

  const topDecks = [...safeDecks]
    .sort((a, b) => String(b?.updatedAt || "").localeCompare(String(a?.updatedAt || "")))
    .slice(0, 5)
    .map((deck) => ({
      id: deck.id,
      name: deck.name || "Deck",
      coverCardId: deck.coverCardId || null,
      cards: (deck.cards || []).reduce((sum, entry) => sum + quantity(entry), 0),
      updatedAt: deck.updatedAt || null
    }));

  const primaryColor = [...colorUsage.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    totalDecks: safeDecks.length,
    validDecks,
    totalCopies,
    uniqueCards: cardUsage.size,
    primaryColor,
    topCards,
    topDecks,
    masteryLeader: topCards[0] || null
  };
}

export function formatMasteryLabel(level, language = "ptBR") {
  const roman = ["I", "II", "III", "IV", "V", "VI", "VII"][Math.max(0, Math.min(6, Number(level || 1) - 1))];
  return language === "en" ? `Mastery ${roman}` : `Maestria ${roman}`;
}
