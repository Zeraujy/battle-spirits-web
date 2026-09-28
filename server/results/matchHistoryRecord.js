function normalizeMode(mode) {
  return mode === "ranked" ? "ranked" : "online";
}

function expandDeckCardIds(snapshot) {
  if (!snapshot?.cards) return [];
  const ids = [];
  for (const entry of snapshot.cards) {
    const cardId = String(entry?.cardId || entry?.id || "").trim();
    const quantity = Math.max(0, Number(entry?.quantity ?? entry?.qty ?? entry?.count ?? 0) || 0);
    if (!cardId || !quantity) continue;
    for (let index = 0; index < quantity; index += 1) ids.push(cardId);
  }
  return ids;
}

function topColors(cardIds, cardIndex) {
  const counts = new Map();
  for (const id of cardIds) {
    const card = cardIndex?.get?.(String(id));
    const colors = Array.isArray(card?.colors) ? card.colors : card?.color ? [card.color] : [];
    for (const color of new Set(colors.map((value) => String(value || "").toLowerCase()).filter(Boolean))) {
      counts.set(color, (counts.get(color) || 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([color]) => color);
}

export function buildServerMatchHistoryRecords({ room, session, cardIndex, finishedAt = Date.now() } = {}) {
  const match = session?.gameState || room?.match || null;
  if (!room || !match?.winnerId || !match?.players) return null;

  const startedAt = Number(session?.startedAt || room?.createdAt || finishedAt);
  const durationSeconds = Math.max(0, Math.round((Number(finishedAt) - startedAt) / 1000));
  const mode = normalizeMode(session?.mode || (room?.ranked ? "ranked" : "casual"));
  const records = {};

  for (const playerId of ["player1", "player2"]) {
    const player = room.players?.[playerId];
    const matchPlayer = match.players?.[playerId];
    if (!player || !matchPlayer) continue;
    const opponentId = playerId === "player1" ? "player2" : "player1";
    const opponent = room.players?.[opponentId];
    const deckSnapshot = player.deckSnapshot || null;
    const cardIds = expandDeckCardIds(deckSnapshot);

    records[playerId] = {
      match_uid: String(match.id || room.code || ""),
      mode,
      result: match.winnerId === playerId ? "win" : "loss",
      winner_reason: String(match.winnerReason || "other").slice(0, 40),
      duration_seconds: durationSeconds,
      turns: Math.max(1, Number(match.turnNumber || 1)),
      deck_id: deckSnapshot?.deckId ? String(deckSnapshot.deckId).slice(0, 120) : null,
      deck_name: deckSnapshot?.deckName ? String(deckSnapshot.deckName).slice(0, 120) : null,
      deck_colors: topColors(cardIds, cardIndex),
      deck_card_ids: [...new Set(cardIds)],
      cover_card_id: deckSnapshot?.coverCardId ? String(deckSnapshot.coverCardId) : null,
      opponent_name: String(opponent?.profile?.name || "Oponente").slice(0, 80),
      opponent_username: String(opponent?.profile?.username || "").replace(/^@/, "").trim().slice(0, 40) || null,
      life_remaining: Math.max(0, Number(matchPlayer.life || 0)),
      played_at: new Date(finishedAt).toISOString(),
      server_authoritative: true
    };
  }

  return records;
}

export async function persistServerMatchHistory({ supabase, room, records } = {}) {
  if (!records || !room) return { ok: false, code: "MATCH_HISTORY_UNAVAILABLE" };
  if (!supabase) return { ok: true, persisted: 0, skipped: Object.keys(records).length };

  let persisted = 0;
  let skipped = 0;
  for (const playerId of ["player1", "player2"]) {
    const record = records[playerId];
    const userId = room.players?.[playerId]?.userId || room.ranked?.players?.[playerId]?.userId || null;
    if (!record || !userId) { skipped += 1; continue; }
    const { server_authoritative: _serverAuthoritative, ...cloudRecord } = record;
    const { error } = await supabase.from("bs_match_history").upsert({ user_id: userId, ...cloudRecord }, {
      onConflict: "user_id,match_uid",
      ignoreDuplicates: true
    });
    if (error) return { ok: false, code: "MATCH_HISTORY_PERSISTENCE_FAILED", error: error.message };
    persisted += 1;
  }
  return { ok: true, persisted, skipped };
}
