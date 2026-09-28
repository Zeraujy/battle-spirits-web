export class AbandonPolicy {
  resolveConcede({ playerId, playerIds = ["player1", "player2"] } = {}) {
    const loserId = String(playerId || "");
    if (!playerIds.includes(loserId)) {
      return { ok: false, code: "PLAYER_INVALID" };
    }
    const winnerId = playerIds.find((candidate) => candidate !== loserId) || null;
    if (!winnerId) return { ok: false, code: "OPPONENT_MISSING" };
    return {
      ok: true,
      winnerId,
      loserId,
      reason: "concede",
      penalty: "ranked_loss"
    };
  }
}
