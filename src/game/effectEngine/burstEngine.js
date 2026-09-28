import { getDatabaseCard } from "../selectors.js";
import { getBurstActivationEvent, isBurstCard } from "../burstRules.js";

export const BurstEvent = Object.freeze({
  LIFE_DECREASED: "burstLifeDecrease",
  OPPONENT_SUMMONED: "burstOpponentSummon",
  OPPONENT_USED_MAGIC: "burstOpponentMagic",
  OWN_SPIRIT_DESTROYED: "burstOwnSpiritDestroyed"
});

export function openBurstOpportunityForEvent(match, event, affectedPlayerId, cardIndex, details = {}) {
  if (match.burstOpportunity) return match;
  for (const [playerId, player] of Object.entries(match.players || {})) {
    if (!player?.burst) continue;
    const card = getDatabaseCard(cardIndex, player.burst);
    if (!isBurstCard(card) || getBurstActivationEvent(card) !== event) continue;
    if (event === BurstEvent.OPPONENT_SUMMONED || event === BurstEvent.OPPONENT_USED_MAGIC) {
      if (!affectedPlayerId || playerId === affectedPlayerId) continue;
    }
    if (event === BurstEvent.OWN_SPIRIT_DESTROYED && playerId !== affectedPlayerId) continue;
    if (event === BurstEvent.LIFE_DECREASED && playerId !== affectedPlayerId) continue;
    return {
      ...match,
      burstOpportunity: {
        id: `burst-window-${match.turnNumber || 0}-${event}-${playerId}`,
        playerId,
        event,
        eventPlayerId: affectedPlayerId || null,
        sourcePlayerId: details.sourcePlayerId || null,
        sourceInstanceId: details.sourceInstanceId || null,
        amount: Math.max(0, Number(details.amount || 0)),
        cause: details.cause || event,
        battleId: details.battleId || null,
        turnNumber: match.turnNumber,
        phase: match.phase
      }
    };
  }
  return match;
}
