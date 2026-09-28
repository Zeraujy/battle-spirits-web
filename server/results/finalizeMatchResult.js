import { persistRankedResult } from "./resultPersistence.js";
import { validateMatchResult } from "./validateMatchResult.js";

export function calculateRankedRatingChange(winnerRp, loserRp) {
  const safeWinnerRp = Math.max(0, Number(winnerRp || 0));
  const safeLoserRp = Math.max(0, Number(loserRp || 0));
  const expectedWinner = 1 / (1 + Math.pow(10, (safeLoserRp - safeWinnerRp) / 400));
  const winnerDelta = Math.max(12, Math.round(32 * (1 - expectedWinner)));
  const loserDelta = -Math.max(12, Math.round(32 * expectedWinner));
  return {
    winnerBefore: safeWinnerRp,
    loserBefore: safeLoserRp,
    winnerDelta,
    loserDelta,
    winnerAfter: Math.max(0, safeWinnerRp + winnerDelta),
    loserAfter: Math.max(0, safeLoserRp + loserDelta)
  };
}

export async function finalizeMatchResult({
  ranked,
  match,
  roomCode,
  winnerId,
  reason = "game",
  season = "S0",
  supabase,
  players = {}
} = {}) {
  const validation = validateMatchResult({ ranked, match, winnerId, reason });
  if (!validation.ok) return validation;

  const { winnerId: resolvedWinnerId, loserId, reason: resolvedReason } = validation;
  const winnerMeta = ranked.players[resolvedWinnerId];
  const loserMeta = ranked.players[loserId];
  const rating = calculateRankedRatingChange(winnerMeta.rp, loserMeta.rp);
  const winnerProfile = players[resolvedWinnerId]?.profile || {};
  const loserProfile = players[loserId]?.profile || {};

  const persistence = await persistRankedResult({
    supabase,
    payload: {
      p_match_uid: String(match?.id || roomCode || ""),
      p_season: season,
      p_winner_id: winnerMeta.userId,
      p_loser_id: loserMeta.userId,
      p_winner_before: rating.winnerBefore,
      p_loser_before: rating.loserBefore,
      p_winner_delta: rating.winnerDelta,
      p_loser_delta: rating.loserDelta,
      p_winner_name: winnerProfile.name || "Jogador",
      p_winner_username: winnerProfile.username || null,
      p_loser_name: loserProfile.name || "Jogador",
      p_loser_username: loserProfile.username || null,
      p_winner_deck_id: winnerMeta.deckId || null,
      p_winner_deck_name: winnerMeta.deckName || "Deck",
      p_loser_deck_id: loserMeta.deckId || null,
      p_loser_deck_name: loserMeta.deckName || "Deck",
      p_reason: resolvedReason
    }
  });

  if (!persistence.ok) return persistence;

  return {
    ok: true,
    winnerId: resolvedWinnerId,
    loserId,
    reason: resolvedReason,
    winner: {
      result: "win",
      rpBefore: rating.winnerBefore,
      rpAfter: rating.winnerAfter,
      rpDelta: rating.winnerDelta
    },
    loser: {
      result: "loss",
      rpBefore: rating.loserBefore,
      rpAfter: rating.loserAfter,
      rpDelta: rating.loserDelta
    }
  };
}
