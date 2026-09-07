import { fieldCards, getDatabaseCard } from "./selectors.js";
import { appendLog, otherPlayerId } from "./utils.js";

const COLOR_WORDS = {
  red: ["red", "vermelho", "vermelha", "赤"],
  purple: ["purple", "roxo", "roxa", "紫"],
  green: ["green", "verde", "緑"],
  white: ["white", "branco", "branca", "白"],
  yellow: ["yellow", "amarelo", "amarela", "黄"],
  blue: ["blue", "azul", "青"]
};

function controlsMatching(match, playerId, cardIndex, condition = {}) {
  const player = match.players[playerId];
  const cards = fieldCards(player).filter((p) => !p.combinedWith).map((p) => ({ physical: p, card: getDatabaseCard(cardIndex, p) }));
  const minimum = Number(condition.minCount ?? condition.count ?? 1);
  const matches = cards.filter(({ card }) => {
    if (!card) return false;
    if (condition.cardType && card.cardType !== condition.cardType) return false;
    if (condition.cardTypes && !condition.cardTypes.includes(card.cardType)) return false;
    if (condition.color && !card.colors?.includes(condition.color)) return false;
    if (condition.colors && !condition.colors.some((c) => card.colors?.includes(c))) return false;
    if (condition.family && !card.families?.includes(condition.family)) return false;
    if (condition.families && !condition.families.some((f) => card.families?.includes(f))) return false;
    return true;
  });
  return matches.length >= minimum;
}

export function checkSummoningCondition(match, playerId, card, cardIndex, options = {}) {
  if (card?.cardType !== "ultimate") return { ok: true };
  const effect = (card.effects || []).find((e) => e.type === "summonCondition" || e.timing === "summonCondition" || e.timing === "summon");
  const condition = card.summonCondition || effect?.condition || effect?.requirements;
  if (!effect && !condition) return { ok: true };
  if (condition && typeof condition === "object") {
    const normalized = condition.controls || condition;
    return controlsMatching(match, playerId, cardIndex, normalized)
      ? { ok: true }
      : { ok: false, error: "A Summoning Condition deste Ultimate não foi cumprida." };
  }

  const text = [effect?.text?.en, effect?.text?.ptBR, effect?.text, card.effectText?.en, card.effectText?.ptBR]
    .filter((v) => typeof v === "string").join(" ").toLowerCase();
  const color = Object.entries(COLOR_WORDS).find(([, words]) => words.some((word) => text.includes(word)))?.[0];
  const saysSpirit = text.includes("spirit") || text.includes("スピリット");
  const saysAtLeastOne = text.includes("at least one") || text.includes("at least 1") || text.includes("pelo menos 1") || text.includes("1体以上");
  if (color && saysSpirit && saysAtLeastOne) {
    const ok = controlsMatching(match, playerId, cardIndex, { cardType: "spirit", color, minCount: 1 });
    return ok ? { ok: true } : { ok: false, error: `A Summoning Condition exige pelo menos 1 Spirit ${color}.` };
  }
  return options.confirmSummonCondition
    ? { ok: true, manual: true }
    : { ok: false, error: "Este Ultimate possui Summoning Condition não estruturada. Confirme a condição para invocá-lo." };
}

export function resolveUltimateTriggerOnAttack(match, attackerPlayerId, attackerPhysical, cardIndex) {
  const attackerCard = getDatabaseCard(cardIndex, attackerPhysical);
  const effect = (attackerCard?.effects || []).find((e) => e.type === "ultimateTrigger" || String(e.timing || "").toLowerCase() === "ultimatetrigger");
  if (!effect) return { match, triggered: false, manualResolutionNeeded: false };
  const opponentId = otherPlayerId(match, attackerPlayerId);
  const opponent = match.players[opponentId];
  if (!opponent?.deck?.length) {
    return { match: appendLog(match, "U-Trigger: o deck do oponente estava vazio; nenhuma carta foi revelada.", "effect"), triggered: true, hit: false, manualResolutionNeeded: false };
  }
  const deck = [...opponent.deck];
  const revealed = deck.shift();
  const revealedCard = getDatabaseCard(cardIndex, revealed);
  const revealedCost = Number(revealedCard?.cost || 0);
  const sourceCost = Number(attackerCard?.cost || 0);
  const hit = sourceCost > revealedCost;
  let next = {
    ...match,
    players: {
      ...match.players,
      [opponentId]: { ...opponent, deck, trash: [...opponent.trash, { ...revealed, revealedByUltimateTrigger: true }] }
    },
    battle: {
      ...match.battle,
      ultimateTrigger: {
        sourceInstanceId: attackerPhysical.instanceId,
        revealedCardId: revealed.cardId,
        revealedCost,
        sourceCost,
        hit,
        effectId: effect.id || null
      }
    }
  };
  next = appendLog(next, `U-Trigger: ${revealedCard?.namePT || revealedCard?.nameEN || revealed.cardId} (Cost ${revealedCost}) — ${hit ? "HIT" : "GUARD"}.`, "effect");
  const hitOps = effect.onHitOperations || effect.hitOperations || effect.operationsOnHit || [];
  return { match: next, triggered: true, hit, manualResolutionNeeded: hit && !hitOps.length };
}
