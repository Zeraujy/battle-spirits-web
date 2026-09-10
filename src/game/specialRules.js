import { fieldCards, findPhysicalCard, getCurrentLevel, getDatabaseCard } from "./selectors.js";
import { appendLog, otherPlayerId } from "./utils.js";
import { resolveCardEvent, resolveOperations } from "./effectEngine/effectEngine.js";
import { getCombinedStats } from "./brave.js";

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
  const cards = fieldCards(player)
    .filter((physical) => !physical.combinedWith)
    .map((physical) => ({ physical, card: getDatabaseCard(cardIndex, physical) }));
  const minimum = Number(condition.minCount ?? condition.count ?? 1);
  const matches = cards.filter(({ card }) => {
    if (!card) return false;
    if (condition.cardType && card.cardType !== condition.cardType) return false;
    if (condition.cardTypes && !condition.cardTypes.includes(card.cardType)) return false;
    if (condition.color && !card.colors?.includes(condition.color)) return false;
    if (condition.colors && !condition.colors.some((color) => card.colors?.includes(color))) return false;
    if (condition.family && !card.families?.includes(condition.family)) return false;
    if (condition.families && !condition.families.some((family) => card.families?.includes(family))) return false;
    if (condition.minCost != null && Number(card.cost || 0) < Number(condition.minCost)) return false;
    if (condition.maxCost != null && Number(card.cost || 0) > Number(condition.maxCost)) return false;
    return true;
  });
  return matches.length >= minimum;
}

export function checkSummoningCondition(match, playerId, card, cardIndex, options = {}) {
  if (card?.cardType !== "ultimate") return { ok: true };
  const effect = (card.effects || []).find((entry) =>
    entry.type === "summonCondition" || entry.timing === "summonCondition" || entry.timing === "summon"
  );
  const condition = card.summonCondition || effect?.condition || effect?.requirements;
  if (!effect && !condition) return { ok: true };
  if (condition && typeof condition === "object") {
    const normalized = condition.controls || condition;
    return controlsMatching(match, playerId, cardIndex, normalized)
      ? { ok: true }
      : { ok: false, error: "A Summoning Condition deste Ultimate não foi cumprida." };
  }

  const text = [effect?.text?.en, effect?.text?.ptBR, effect?.text, card.effectText?.en, card.effectText?.ptBR]
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase();
  const color = Object.entries(COLOR_WORDS)
    .find(([, words]) => words.some((word) => text.includes(word)))?.[0];
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

function effectTextValue(effect, language) {
  if (!effect) return "";
  const text = effect.text;
  if (typeof text === "string") return text;
  return language === "en"
    ? (text?.en || text?.ptBR || "")
    : (text?.ptBR || text?.en || "");
}

function ultimateTriggerEffects(card, physical) {
  const level = getCurrentLevel(card, physical)?.level ?? 0;
  return (card?.effects || []).filter((effect) => {
    const type = String(effect?.type || "").replace(/[\s_-]+/g, "").toLowerCase();
    const timing = String(effect?.timing || "").replace(/[\s_-]+/g, "").toLowerCase();
    const isTrigger = type === "ultimatetrigger" || timing === "ultimatetrigger";
    if (!isTrigger) return false;
    if (Array.isArray(effect.levels) && effect.levels.length && !effect.levels.map(Number).includes(Number(level))) return false;
    if (effect.level != null && Number(effect.level) !== Number(level)) return false;
    return true;
  });
}

export function findUltimateTriggerEffect(card, physical) {
  return ultimateTriggerEffects(card, physical)[0] || null;
}

function hitOperations(effect) {
  const value = effect?.onHitOperations ?? effect?.hitOperations ?? effect?.operationsOnHit ?? effect?.onHit ?? [];
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function beginFirstFlash(match) {
  const battle = match.battle;
  if (!battle) return match;
  return {
    ...match,
    battle: {
      ...battle,
      stage: "flash1",
      flash: {
        number: 1,
        priorityPlayerId: battle.defenderPlayerId,
        consecutivePasses: 0
      }
    }
  };
}

export function resolveUltimateTriggerOnAttack(match, attackerPlayerId, attackerPhysical, cardIndex) {
  const attackerCard = getDatabaseCard(cardIndex, attackerPhysical);
  if (attackerCard?.cardType !== "ultimate") {
    return { match, triggered: false, manualResolutionNeeded: false };
  }

  const effect = findUltimateTriggerEffect(attackerCard, attackerPhysical);
  if (!effect) return { match, triggered: false, manualResolutionNeeded: false };

  const opponentId = otherPlayerId(match, attackerPlayerId);
  const opponent = match.players[opponentId];
  const sourceCost = Number(getCombinedStats(match, cardIndex, attackerPhysical).cost || attackerCard?.cost || 0);
  const baseTrigger = {
    sourceInstanceId: attackerPhysical.instanceId,
    sourceCardId: attackerPhysical.cardId,
    controllerPlayerId: attackerPlayerId,
    opponentPlayerId: opponentId,
    effectId: effect.id || null,
    sourceCost,
    sourceLevel: getCurrentLevel(attackerCard, attackerPhysical)?.level ?? null,
    hit: false,
    revealedCardId: null,
    revealedInstanceId: null,
    revealedCost: null,
    status: "revealed",
    effectResolution: "pending",
    manualResolutionNeeded: false,
    effectTextPT: effectTextValue(effect, "ptBR"),
    effectTextEN: effectTextValue(effect, "en")
  };

  if (!opponent?.deck?.length) {
    const next = appendLog({
      ...match,
      battle: {
        ...match.battle,
        stage: "ultimateTrigger",
        flash: null,
        ultimateTrigger: { ...baseTrigger, status: "emptyDeck", effectResolution: "none" }
      }
    }, "U-Trigger: o deck do oponente estava vazio; nenhuma carta foi revelada.", "effect");
    return { match: next, triggered: true, hit: false, manualResolutionNeeded: false };
  }

  const deck = [...opponent.deck];
  const revealed = deck.shift();
  const revealedCard = getDatabaseCard(cardIndex, revealed);
  const revealedCost = Number(revealedCard?.cost || 0);
  const hit = sourceCost > revealedCost;

  let next = {
    ...match,
    players: {
      ...match.players,
      [opponentId]: {
        ...opponent,
        deck,
        trash: [
          ...opponent.trash,
          { ...revealed, revealedByUltimateTrigger: true }
        ]
      }
    },
    battle: {
      ...match.battle,
      stage: "ultimateTrigger",
      flash: null,
      ultimateTrigger: {
        ...baseTrigger,
        revealedCardId: revealed.cardId,
        revealedInstanceId: revealed.instanceId,
        revealedCost,
        hit,
        status: "revealed"
      }
    }
  };

  next = appendLog(
    next,
    `U-Trigger: ${revealedCard?.namePT || revealedCard?.nameEN || revealed.cardId} (Cost ${revealedCost}) — ${hit ? "HIT" : "GUARD"}.`,
    "effect"
  );

  return { match: next, triggered: true, hit, manualResolutionNeeded: false };
}

function markTriggerWaitingDecision(match, manualResolutionNeeded) {
  if (!match.battle?.ultimateTrigger) return match;
  return {
    ...match,
    battle: {
      ...match.battle,
      ultimateTrigger: {
        ...match.battle.ultimateTrigger,
        status: "waitingDecision",
        effectResolution: "waitingDecision",
        manualResolutionNeeded: Boolean(manualResolutionNeeded)
      }
    }
  };
}

function finishTrigger(match, manualResolutionNeeded = false) {
  if (!match.battle?.ultimateTrigger) return match;
  const withResult = {
    ...match,
    battle: {
      ...match.battle,
      ultimateTrigger: {
        ...match.battle.ultimateTrigger,
        status: "resolved",
        effectResolution: "resolved",
        manualResolutionNeeded: Boolean(manualResolutionNeeded)
      }
    }
  };
  return beginFirstFlash(withResult);
}

export function resolveUltimateTriggerStage(match, actorId, cardIndex) {
  const battle = match.battle;
  const trigger = battle?.ultimateTrigger;
  if (!battle || battle.stage !== "ultimateTrigger" || !trigger) {
    return { ok: false, error: "Não existe Ultimate Trigger aguardando resolução." };
  }
  if (actorId !== trigger.controllerPlayerId) {
    return { ok: false, error: "A resolução deste Ultimate Trigger pertence ao jogador atacante." };
  }
  if (match.pendingEffectDecision) {
    return { ok: false, error: "Resolva a decisão de efeito pendente antes de continuar o Ultimate Trigger." };
  }

  if (!trigger.hit || trigger.status === "emptyDeck") {
    const next = finishTrigger(match, false);
    return { ok: true, match: next, manualResolutionNeeded: false, notes: [] };
  }

  const sourceCtx = findPhysicalCard(match, trigger.sourceInstanceId);
  const sourcePhysical = sourceCtx?.card || null;
  const sourceCard = sourcePhysical ? getDatabaseCard(cardIndex, sourcePhysical) : cardIndex.get(trigger.sourceCardId);
  const effect = sourceCard
    ? (sourceCard.effects || []).find((entry) => entry.id === trigger.effectId) || findUltimateTriggerEffect(sourceCard, sourcePhysical)
    : null;

  const context = {
    event: "ultimateTriggerHit",
    sourcePlayerId: trigger.controllerPlayerId,
    sourceInstanceId: trigger.sourceInstanceId,
    sourcePhysical,
    sourceCard,
    ultimateTrigger: trigger,
    ultimateTriggerHit: true
  };

  let next = match;
  let manualResolutionNeeded = false;
  const notes = [];
  let structuredResolved = false;

  const operations = hitOperations(effect);
  if (operations.length) {
    const opsResult = resolveOperations(next, trigger.controllerPlayerId, operations, cardIndex, context);
    next = opsResult.match;
    manualResolutionNeeded = manualResolutionNeeded || Boolean(opsResult.manualResolutionNeeded);
    structuredResolved = structuredResolved || Boolean(opsResult.executed || opsResult.decision);
    notes.push(...(opsResult.notes || []));

    if (next.pendingEffectDecision) {
      next = {
        ...next,
        pendingEffectDecision: {
          ...next.pendingEffectDecision,
          continuationEvents: [
            ...(next.pendingEffectDecision.continuationEvents || []),
            {
              event: "ultimateTriggerHit",
              sourcePlayerId: trigger.controllerPlayerId,
              sourceInstanceId: trigger.sourceInstanceId,
              sourceCardId: trigger.sourceCardId,
              context: { ultimateTrigger: trigger, ultimateTriggerHit: true }
            }
          ]
        }
      };
      next = markTriggerWaitingDecision(next, true);
      return { ok: true, match: next, manualResolutionNeeded: true, notes };
    }
  }

  const eventResult = resolveCardEvent(next, {
    event: "ultimateTriggerHit",
    sourcePlayerId: trigger.controllerPlayerId,
    sourceInstanceId: trigger.sourceInstanceId,
    sourcePhysical,
    sourceCardId: trigger.sourceCardId,
    context: { ultimateTrigger: trigger, ultimateTriggerHit: true }
  }, cardIndex);
  next = eventResult.match;
  manualResolutionNeeded = manualResolutionNeeded || Boolean(eventResult.manualResolutionNeeded);
  structuredResolved = structuredResolved || Number(eventResult.automatic || 0) > 0 || Number(eventResult.triggered || 0) > 0;
  notes.push(...(eventResult.notes || []));

  if (next.pendingEffectDecision) {
    next = markTriggerWaitingDecision(next, true);
    return { ok: true, match: next, manualResolutionNeeded: true, notes };
  }

  if (!structuredResolved) {
    manualResolutionNeeded = true;
    notes.push("O U-Trigger acertou, mas o efeito de HIT desta carta ainda precisa ser resolvido manualmente conforme o texto.");
  }

  next = finishTrigger(next, manualResolutionNeeded);
  return { ok: true, match: next, manualResolutionNeeded, notes };
}

export function finalizeUltimateTriggerAfterDecision(match) {
  if (match.pendingEffectDecision) return match;
  const battle = match.battle;
  if (!battle || battle.stage !== "ultimateTrigger" || battle.ultimateTrigger?.status !== "waitingDecision") return match;
  return finishTrigger(match, false);
}
