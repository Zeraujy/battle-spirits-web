import crypto from "node:crypto";
import { validateDeck } from "../../src/game/state.js";

function cloneDeck(deck) {
  return Array.isArray(deck) ? deck.map((entry) => ({ ...entry })) : [];
}

function entryCardId(entry) {
  return String(entry?.cardId || entry?.id || "").trim();
}

function entryQuantity(entry) {
  return Number(entry?.quantity ?? entry?.qty ?? entry?.count ?? 0) || 0;
}

function canonicalDeck(deck) {
  return cloneDeck(deck)
    .map((entry) => ({
      cardId: entryCardId(entry),
      quantity: entryQuantity(entry)
    }))
    .filter((entry) => entry.cardId && entry.quantity > 0)
    .sort((a, b) => a.cardId.localeCompare(b.cardId) || a.quantity - b.quantity);
}

function deckFingerprint(deck) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(canonicalDeck(deck)))
    .digest("hex");
}

function resolveCoverCardId(deck, requestedCoverCardId = null) {
  const cards = canonicalDeck(deck);
  const requested = String(requestedCoverCardId || "").trim();
  if (requested && cards.some((entry) => entry.cardId === requested)) return requested;
  return cards[0]?.cardId || null;
}

function freezeDeckSnapshot(snapshot) {
  for (const entry of snapshot.cards) Object.freeze(entry);
  Object.freeze(snapshot.cards);
  return Object.freeze(snapshot);
}

export function createDeckSnapshot({
  deck = [],
  deckId = null,
  deckName = "Deck",
  coverCardId = null,
  lockedAt = Date.now()
} = {}, cardIndex, validationOptions = {}) {
  const cards = cloneDeck(deck);
  const validation = validateDeck(cards, cardIndex, validationOptions);
  if (!validation.ok) {
    return {
      ok: false,
      code: "DECK_INVALID",
      errors: [...validation.errors]
    };
  }

  const snapshot = {
    snapshotId: crypto.randomUUID(),
    deckId: deckId == null ? null : String(deckId).slice(0, 96),
    deckName: String(deckName || "Deck").slice(0, 120),
    coverCardId: resolveCoverCardId(cards, coverCardId),
    cardCount: canonicalDeck(cards).reduce((sum, entry) => sum + entry.quantity, 0),
    fingerprint: deckFingerprint(cards),
    lockedAt: Number(lockedAt) || Date.now(),
    cards
  };

  return {
    ok: true,
    snapshot: freezeDeckSnapshot(snapshot)
  };
}

export function validateDeckSnapshot(snapshot, cardIndex, validationOptions = {}) {
  if (!snapshot || !Array.isArray(snapshot.cards)) {
    return { ok: false, code: "DECK_SNAPSHOT_INVALID", errors: ["Deck snapshot ausente ou inválido."] };
  }

  const validation = validateDeck(snapshot.cards, cardIndex, validationOptions);
  if (!validation.ok) return { ok: false, code: "DECK_SNAPSHOT_INVALID", errors: [...validation.errors] };

  const expected = deckFingerprint(snapshot.cards);
  if (expected !== snapshot.fingerprint) {
    return { ok: false, code: "DECK_SNAPSHOT_TAMPERED", errors: ["Deck snapshot fingerprint mismatch."] };
  }

  return { ok: true, errors: [] };
}

export function cloneDeckSnapshot(snapshot) {
  if (!snapshot) return null;
  return {
    snapshotId: snapshot.snapshotId,
    deckId: snapshot.deckId,
    deckName: snapshot.deckName,
    coverCardId: snapshot.coverCardId,
    cardCount: snapshot.cardCount,
    fingerprint: snapshot.fingerprint,
    lockedAt: snapshot.lockedAt,
    cards: cloneDeck(snapshot.cards)
  };
}

export function deckSnapshotPresentation(snapshot) {
  if (!snapshot) return null;
  return {
    locked: true,
    coverCardId: snapshot.coverCardId || null
  };
}
