const VALID_SERVER_REASONS = new Set([
  "game",
  "life",
  "deck",
  "turn_timeout",
  "concede",
  "disconnect_timeout",
  "abandon"
]);

export function validateMatchResult({ ranked, match, winnerId, reason = "game" } = {}) {
  if (!ranked) return { ok: false, code: "NOT_RANKED", error: "Ranked context is missing." };
  if (ranked.settled) return { ok: false, code: "ALREADY_SETTLED", error: "Ranked result is already settled." };
  if (!match) return { ok: false, code: "MATCH_MISSING", error: "Authoritative match is missing." };

  const resolvedWinnerId = String(winnerId || match.winnerId || "");
  if (resolvedWinnerId !== "player1" && resolvedWinnerId !== "player2") {
    return { ok: false, code: "WINNER_INVALID", error: "Authoritative winner is invalid." };
  }

  if (match.winnerId && match.winnerId !== resolvedWinnerId) {
    return { ok: false, code: "WINNER_MISMATCH", error: "Winner does not match authoritative match state." };
  }

  const loserId = resolvedWinnerId === "player1" ? "player2" : "player1";
  if (!ranked.players?.[resolvedWinnerId] || !ranked.players?.[loserId]) {
    return { ok: false, code: "PLAYER_METADATA_MISSING", error: "Ranked player metadata is missing." };
  }

  const normalizedReason = VALID_SERVER_REASONS.has(String(reason || ""))
    ? String(reason)
    : "game";

  return {
    ok: true,
    winnerId: resolvedWinnerId,
    loserId,
    reason: normalizedReason
  };
}
