import { cardIndex } from "./cardRepository.js";
import { supabase } from "./supabase.js";
import { getSocialSchemaStatus } from "./socialService.js";

const STORAGE_KEY = "bs-card-mastery-v2";
const EVENT_KEY = "bs-card-mastery-events-v2";
const MAX_LOCAL_EVENTS = 12000;

import { masteryLevelFromXp, masteryNextThreshold, masteryXpForMatch } from "./masteryRules.js";
export { MASTERY_THRESHOLDS, masteryLevelFromXp, masteryNextThreshold, masteryXpForMatch } from "./masteryRules.js";

function enrich(row) {
  const card = cardIndex.get(String(row.card_id)) || null;
  const xp = Math.max(0, Number(row.xp || 0));
  const level = masteryLevelFromXp(xp);
  const nextPoints = masteryNextThreshold(level);
  return {
    ...row,
    id: String(row.card_id),
    cardId: String(row.card_id),
    name: card?.namePT || card?.nameEN || card?.name || String(row.card_id),
    image: card?.image || null,
    colors: Array.isArray(card?.colors) ? card.colors : card?.color ? [card.color] : [],
    points: xp,
    xp,
    level,
    nextPoints,
    matches: Math.max(0, Number(row.matches || 0)),
    wins: Math.max(0, Number(row.wins || 0)),
    coverMatches: Math.max(0, Number(row.cover_matches || row.coverMatches || 0))
  };
}

function applyLocal(record) {
  if (!record?.match_uid) return [];
  const cardIds = uniqueIds(record.deck_card_ids || []);
  if (!cardIds.length) return [];

  const eventIds = readJson(EVENT_KEY, []);
  const seen = new Set(Array.isArray(eventIds) ? eventIds : []);
  const rows = readJson(STORAGE_KEY, {});
  const mastery = rows && typeof rows === "object" && !Array.isArray(rows) ? rows : {};
  let changed = false;

  for (const cardId of cardIds) {
    const eventId = `${record.match_uid}::${cardId}`;
    if (seen.has(eventId)) continue;
    seen.add(eventId);
    changed = true;
    const current = mastery[cardId] || { card_id: cardId, xp: 0, matches: 0, wins: 0, cover_matches: 0 };
    const isCover = String(record.cover_card_id || "") === cardId;
    current.xp = Number(current.xp || 0) + masteryXpForMatch({ result: record.result, isCover });
    current.matches = Number(current.matches || 0) + 1;
    current.wins = Number(current.wins || 0) + (record.result === "win" ? 1 : 0);
    current.cover_matches = Number(current.cover_matches || 0) + (isCover ? 1 : 0);
    current.updated_at = record.played_at || new Date().toISOString();
    mastery[cardId] = current;
  }

  if (changed) {
    writeJson(STORAGE_KEY, mastery);
    writeJson(EVENT_KEY, [...seen].slice(-MAX_LOCAL_EVENTS));
  }
  return Object.values(mastery).map(enrich);
}

function compactHistory(history = []) {
  return history
    .filter((row) => row?.match_uid && Array.isArray(row.deck_card_ids) && row.deck_card_ids.length)
    .map((row) => ({
      match_uid: String(row.match_uid),
      result: row.result === "win" ? "win" : "loss",
      deck_card_ids: uniqueIds(row.deck_card_ids),
      cover_card_id: row.cover_card_id ? String(row.cover_card_id) : null,
      played_at: row.played_at || new Date().toISOString()
    }));
}

export async function applyMasteryForMatch(record) {
  const localRows = applyLocal(record);
  if (!supabase) return { ok: true, source: "local", rows: localRows };

  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) return { ok: true, source: "local", rows: localRows };
  const schema = await getSocialSchemaStatus({ refresh: true });
  if (!schema.ready || !schemaAtLeast(schema.version)) {
    return { ok: true, source: "local", needsMigration: true, rows: localRows };
  }

  const { error } = await supabase.rpc("bs_apply_card_mastery", {
    p_match_uid: String(record.match_uid),
    p_result: record.result === "win" ? "win" : "loss",
    p_card_ids: uniqueIds(record.deck_card_ids || []),
    p_cover_card_id: record.cover_card_id ? String(record.cover_card_id) : null,
    p_played_at: record.played_at || new Date().toISOString()
  });
  if (error) return { ok: false, error: error.message, source: "local", rows: localRows };
  return { ok: true, source: "cloud", rows: localRows };
}

export async function reconcileMasteryFromHistory(history = []) {
  const compact = compactHistory(history);
  for (const record of compact) applyLocal(record);
  if (!supabase || !compact.length) return { ok: true, source: "local" };

  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) return { ok: true, source: "local" };
  const schema = await getSocialSchemaStatus();
  if (!schema.ready || !schemaAtLeast(schema.version)) return { ok: true, source: "local", needsMigration: true };

  const { error } = await supabase.rpc("bs_reconcile_card_mastery", { p_matches: compact });
  if (error) return { ok: false, error: error.message, source: "local" };
  return { ok: true, source: "cloud" };
}

export async function loadCardMastery({ limit = 100 } = {}) {
  const local = Object.values(readJson(STORAGE_KEY, {}) || {}).map(enrich);
  const sortRows = (rows) => [...rows]
    .sort((a, b) => Number(b.xp || 0) - Number(a.xp || 0) || Number(b.matches || 0) - Number(a.matches || 0))
    .slice(0, limit);
  if (!supabase) return { ok: true, rows: sortRows(local), source: "local" };

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) return { ok: true, rows: sortRows(local), source: "local" };
  const schema = await getSocialSchemaStatus();
  if (!schema.ready || !schemaAtLeast(schema.version)) return { ok: true, rows: sortRows(local), source: "local", needsMigration: true };

  const { data, error } = await supabase
    .from("bs_card_mastery")
    .select("card_id,xp,matches,wins,cover_matches,updated_at")
    .eq("user_id", user.id)
    .order("xp", { ascending: false })
    .limit(limit);
  if (error) return { ok: false, error: error.message, rows: sortRows(local), source: "local" };

  const merged = new Map(local.map((row) => [row.cardId, row]));
  for (const row of data || []) {
    const enriched = enrich(row);
    const current = merged.get(enriched.cardId);
    if (!current || enriched.xp >= current.xp) merged.set(enriched.cardId, enriched);
  }
  return { ok: true, rows: sortRows([...merged.values()]), source: "cloud" };
}

export function summarizeCardMastery(rows = []) {
  const safe = Array.isArray(rows) ? rows : [];
  return {
    trackedCards: safe.length,
    totalXp: safe.reduce((sum, row) => sum + Number(row.xp || 0), 0),
    maxLevel: safe.reduce((max, row) => Math.max(max, Number(row.level || 1)), safe.length ? 1 : 0),
    leader: safe[0] || null
  };
}
