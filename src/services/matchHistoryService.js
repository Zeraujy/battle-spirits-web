import { cardIndex } from "./cardRepository.js";
import { getDecks } from "./storage.js";
import { supabase } from "./supabase.js";
import { getSocialSchemaStatus } from "./socialService.js";
import { expandDeck } from "../game/state.js";
import { applyMasteryForMatch } from "./cardMasteryService.js";

const STORAGE_KEY = "bs-match-history-v1";
const MAX_LOCAL_MATCHES = 120;

function schemaAtLeast(version, target = "3.6.2") {
  const a = String(version || "0").split(".").map(Number);
  const b = String(target).split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if ((a[i] || 0) > (b[i] || 0)) return true;
    if ((a[i] || 0) < (b[i] || 0)) return false;
  }
  return true;
}

function readLocalHistory() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeLocalHistory(rows) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.slice(0, MAX_LOCAL_MATCHES)));
  } catch {}
}

function normalizeIdList(cards = []) {
  return cards.map((entry) => String(entry?.cardId || entry?.id || entry || "")).filter(Boolean).sort();
}

function matchDeckFromInitialPlayer(player) {
  if (!player) return [];
  const physical = [...(player.deck || []), ...(player.hand || [])];
  return normalizeIdList(physical);
}

function deckSignature(deck) {
  return normalizeIdList(expandDeck(deck?.cards || []));
}

function signaturesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

export function identifySavedDeck(player) {
  const initialIds = matchDeckFromInitialPlayer(player);
  if (!initialIds.length) return null;
  const decks = getDecks();
  const found = decks.find((deck) => signaturesEqual(initialIds, deckSignature(deck)));
  if (!found) return null;
  return {
    id: found.id || null,
    name: found.name || "Deck",
    cardIds: expandDeck(found.cards || []).map(String),
    coverCardId: found.coverCardId ? String(found.coverCardId) : null
  };
}

function topColors(cardIds = []) {
  const counts = new Map();
  for (const id of cardIds) {
    const card = cardIndex.get(String(id));
    const colors = Array.isArray(card?.colors) ? card.colors : card?.color ? [card.color] : [];
    const unique = [...new Set(colors.map((value) => String(value || "").toLowerCase()).filter(Boolean))];
    for (const color of unique) counts.set(color, (counts.get(color) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([color]) => color);
}

function resultPlayerId(match, mode, viewerPlayerId) {
  if (mode === "online" || mode === "ranked") return viewerPlayerId || null;
  if (mode === "ai") return match?.ai?.humanPlayerId || "player1";
  return "player1";
}

function otherId(match, playerId) {
  return Object.keys(match?.players || {}).find((id) => id !== playerId) || null;
}

export function buildMatchResultRecord({ match, mode, viewerPlayerId, startedAt, deckSnapshot = null }) {
  const playerId = resultPlayerId(match, mode, viewerPlayerId);
  if (!match?.winnerId || !playerId || !match.players?.[playerId]) return null;

  const opponentId = otherId(match, playerId);
  const player = match.players[playerId];
  const opponent = opponentId ? match.players[opponentId] : null;
  const deck = deckSnapshot || identifySavedDeck(player);
  const durationSeconds = Math.max(0, Math.round((Date.now() - Number(startedAt || Date.now())) / 1000));
  const winner = match.winnerId === playerId;

  return {
    match_uid: String(match.id || `${mode}-${Date.now()}`),
    mode: ["online", "ranked", "ai", "local"].includes(mode) ? mode : "local",
    result: winner ? "win" : "loss",
    winner_reason: String(match.winnerReason || "other").slice(0, 40),
    duration_seconds: durationSeconds,
    turns: Math.max(1, Number(match.turnNumber || 1)),
    deck_id: deck?.id ? String(deck.id).slice(0, 120) : null,
    deck_name: deck?.name ? String(deck.name).slice(0, 120) : null,
    deck_colors: topColors(deck?.cardIds || []),
    deck_card_ids: [...new Set((deck?.cardIds || []).map(String))],
    cover_card_id: deck?.coverCardId ? String(deck.coverCardId) : null,
    opponent_name: String(opponent?.name || "Oponente").slice(0, 80),
    opponent_username: String(opponent?.username || "").replace(/^@/, "").trim().slice(0, 40) || null,
    life_remaining: Math.max(0, Number(player.life || 0)),
    played_at: new Date().toISOString()
  };
}

export async function recordMatchResult(input) {
  const record = buildMatchResultRecord(input);
  if (!record) return { ok: false, error: "Resultado da partida indisponível." };

  const current = readLocalHistory();
  if (!current.some((row) => row.match_uid === record.match_uid)) {
    writeLocalHistory([record, ...current]);
  }

  if (!supabase) {
    await applyMasteryForMatch(record);
    return { ok: true, mode: "local", record };
  }

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) {
    await applyMasteryForMatch(record);
    return { ok: true, mode: "local", record };
  }

  const schema = await getSocialSchemaStatus({ refresh: true });
  if (!schema.ready || !schemaAtLeast(schema.version)) {
    await applyMasteryForMatch(record);
    return { ok: true, mode: "local", needsMigration: true, record };
  }

  const cloudRecord = { ...record };
  const masteryReady = schemaAtLeast(schema.version, "3.6.3");
  if (!masteryReady) {
    delete cloudRecord.deck_card_ids;
    delete cloudRecord.cover_card_id;
  }
  const { error } = await supabase.from("bs_match_history").upsert({
    user_id: user.id,
    ...cloudRecord
  }, { onConflict: "user_id,match_uid", ignoreDuplicates: true });

  if (error) return { ok: false, error: error.message, record };
  const mastery = await applyMasteryForMatch(record);
  return { ok: mastery.ok !== false, mode: "cloud", record, mastery, error: mastery.ok === false ? mastery.error : undefined };
}

export async function loadMatchHistory({ limit = 60 } = {}) {
  const localRows = readLocalHistory();
  if (!supabase) return { ok: true, rows: localRows.slice(0, limit), source: "local" };

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) return { ok: true, rows: localRows.slice(0, limit), source: "local" };

  const schema = await getSocialSchemaStatus();
  if (!schema.ready || !schemaAtLeast(schema.version)) {
    return { ok: true, rows: localRows.slice(0, limit), source: "local", needsMigration: true };
  }

  const selectFields = schemaAtLeast(schema.version, "3.6.3")
    ? "match_uid,mode,result,winner_reason,duration_seconds,turns,deck_id,deck_name,deck_colors,deck_card_ids,cover_card_id,opponent_name,opponent_username,life_remaining,played_at"
    : "match_uid,mode,result,winner_reason,duration_seconds,turns,deck_id,deck_name,deck_colors,opponent_name,opponent_username,life_remaining,played_at";
  const { data, error } = await supabase
    .from("bs_match_history")
    .select(selectFields)
    .eq("user_id", user.id)
    .order("played_at", { ascending: false })
    .limit(limit);

  if (error) return { ok: false, error: error.message, rows: localRows.slice(0, limit), source: "local" };

  const merged = new Map();
  for (const row of [...(data || []), ...localRows]) {
    if (!row?.match_uid || merged.has(row.match_uid)) continue;
    merged.set(row.match_uid, row);
  }
  const rows = [...merged.values()]
    .sort((a, b) => new Date(b.played_at || 0) - new Date(a.played_at || 0))
    .slice(0, limit);
  return { ok: true, rows, source: "cloud" };
}

export function summarizeMatchHistory(rows = []) {
  const total = rows.length;
  const wins = rows.filter((row) => row.result === "win").length;
  const losses = total - wins;
  const totalDuration = rows.reduce((sum, row) => sum + Math.max(0, Number(row.duration_seconds || 0)), 0);
  const deckCounts = new Map();
  const colorCounts = new Map();
  const modeCounts = new Map();

  for (const row of rows) {
    if (row.deck_name) deckCounts.set(row.deck_name, (deckCounts.get(row.deck_name) || 0) + 1);
    for (const color of row.deck_colors || []) colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
    modeCounts.set(row.mode || "local", (modeCounts.get(row.mode || "local") || 0) + 1);
  }

  const favoriteDeck = [...deckCounts.entries()].sort((a, b) => b[1] - a[1])[0] || null;
  const primaryColor = [...colorCounts.entries()].sort((a, b) => b[1] - a[1])[0] || null;
  const favoriteMode = [...modeCounts.entries()].sort((a, b) => b[1] - a[1])[0] || null;

  return {
    total,
    wins,
    losses,
    winRate: total ? Math.round((wins / total) * 100) : 0,
    averageDuration: total ? Math.round(totalDuration / total) : 0,
    favoriteDeck: favoriteDeck ? { name: favoriteDeck[0], matches: favoriteDeck[1] } : null,
    primaryColor: primaryColor ? primaryColor[0] : null,
    favoriteMode: favoriteMode ? favoriteMode[0] : null
  };
}
