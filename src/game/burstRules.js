import { getDatabaseCard } from "./selectors.js";
import { normalizeEventName } from "./effectEngine/normalizer.js";

function compact(value) {
  return String(value || "").replace(/[\s_-]+/g, "").toLowerCase();
}

export function isBurstCard(card) {
  if (!card) return false;
  if ((card.subtypes || []).some((entry) => compact(entry) === "burst")) return true;
  return (card.effects || []).some((entry) => {
    const type = compact(entry?.type);
    const timing = compact(entry?.timing);
    return type === "burst" || timing.includes("burst") || timing === "afterlifedecreases";
  });
}

export function getBurstActivationEvent(card) {
  if (!card) return "burst";

  const candidates = [];
  for (const entry of card.effects || []) {
    if (compact(entry?.type) !== "burst" && !compact(entry?.timing).includes("burst") && compact(entry?.timing) !== "afterlifedecreases") continue;
    candidates.push(normalizeEventName(entry?.event));
    candidates.push(normalizeEventName(entry?.timing));
    candidates.push(normalizeEventName(entry?.type));
  }
  for (const entry of card.abilities || []) {
    const event = normalizeEventName(entry?.event ?? entry?.timing ?? entry?.type);
    if (event && event.toLowerCase().includes("burst")) candidates.push(event);
  }

  if (candidates.includes("burstLifeDecrease")) return "burstLifeDecrease";
  return "burst";
}

export function openLifeDecreaseBurstOpportunity(match, playerId, cardIndex, details = {}) {
  const player = match.players?.[playerId];
  if (!player?.burst) return match;
  const card = getDatabaseCard(cardIndex, player.burst);
  if (!isBurstCard(card) || getBurstActivationEvent(card) !== "burstLifeDecrease") return match;

  return {
    ...match,
    burstOpportunity: {
      playerId,
      event: "burstLifeDecrease",
      amount: Math.max(0, Number(details.amount || 0)),
      cause: details.cause || "lifeDecrease",
      sourcePlayerId: details.sourcePlayerId || null,
      battleId: details.battleId || null,
      turnNumber: match.turnNumber,
      phase: match.phase
    }
  };
}

export function burstConditionIsAutomaticallySatisfied(match, playerId, cardIndex) {
  const player = match.players?.[playerId];
  if (!player?.burst) return false;
  const card = getDatabaseCard(cardIndex, player.burst);
  const event = getBurstActivationEvent(card);
  if (event !== "burstLifeDecrease") return false;
  return Boolean(match.burstOpportunity?.playerId === playerId && match.burstOpportunity?.event === event);
}

export function passBurstOpportunity(match, playerId) {
  if (!match.burstOpportunity) return { ok: false, error: "Não existe janela de Burst ativa." };
  if (match.burstOpportunity.playerId !== playerId) return { ok: false, error: "Esta janela de Burst pertence ao outro jogador." };
  return { ok: true, match: { ...match, burstOpportunity: null } };
}
