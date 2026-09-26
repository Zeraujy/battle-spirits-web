import { masteryXpForMatch } from "./masteryRules.js";

function otherId(match, playerId) {
  return Object.keys(match?.players || {}).find((id) => id !== playerId) || null;
}

export function postMatchViewerId(match, mode, viewerPlayerId) {
  if (mode === "online" || mode === "ranked") return viewerPlayerId || null;
  if (mode === "ai") return match?.ai?.humanPlayerId || "player1";
  return "player1";
}

export function formatMatchDuration(seconds = 0, language = "pt") {
  const total = Math.max(0, Math.round(Number(seconds || 0)));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  if (!minutes) return language === "en" ? `${rest}s` : `${rest}s`;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function buildPostMatchSummary({
  match,
  mode = "local",
  viewerPlayerId,
  startedAt,
  endedAt = Date.now(),
  deckSnapshot = null,
  rankedResult = null
} = {}) {
  if (!match?.winnerId) return null;
  const playerId = postMatchViewerId(match, mode, viewerPlayerId);
  const opponentId = playerId ? otherId(match, playerId) : null;
  const player = playerId ? match.players?.[playerId] : null;
  const opponent = opponentId ? match.players?.[opponentId] : null;
  const winner = match.players?.[match.winnerId] || null;
  const defeatedId = otherId(match, match.winnerId);
  const defeated = defeatedId ? match.players?.[defeatedId] : null;
  const result = playerId ? (match.winnerId === playerId ? "win" : "loss") : "neutral";
  const uniqueCardIds = [...new Set((deckSnapshot?.cardIds || []).map(String).filter(Boolean))];
  let masteryXp = 0;
  for (const cardId of uniqueCardIds) {
    masteryXp += masteryXpForMatch({
      result: result === "win" ? "win" : "loss",
      isCover: Boolean(deckSnapshot?.coverCardId && String(deckSnapshot.coverCardId) === cardId)
    });
  }
  const lifeRemaining = Math.max(0, Number(player?.life || 0));
  const durationSeconds = Math.max(0, Math.round((Number(endedAt || Date.now()) - Number(startedAt || endedAt || Date.now())) / 1000));

  return {
    result,
    playerId,
    opponentId,
    player,
    opponent,
    winner,
    defeated,
    winnerReason: match.winnerReason || "other",
    durationSeconds,
    turns: Math.max(1, Number(match.turnNumber || 1)),
    lifeRemaining,
    deck: deckSnapshot || null,
    mastery: {
      totalXp: masteryXp,
      trackedCards: uniqueCardIds.length,
      featuredCardId: deckSnapshot?.coverCardId || uniqueCardIds[0] || null,
      featuredXp: uniqueCardIds.length
        ? masteryXpForMatch({ result: result === "win" ? "win" : "loss", isCover: Boolean(deckSnapshot?.coverCardId) })
        : 0
    },
    ranked: rankedResult ? {
      result: rankedResult.result || result,
      rpBefore: Number(rankedResult.rpBefore || 0),
      rpAfter: Number(rankedResult.rpAfter || 0),
      rpDelta: Number(rankedResult.rpDelta || 0),
      rank: rankedResult.rank || null,
      reason: rankedResult.reason || null
    } : null
  };
}
