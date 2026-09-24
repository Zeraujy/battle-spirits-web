import { fieldCards, findPhysicalCard, getBraveAttachment, getCurrentLevel, getDatabaseCard } from "./selectors.js";
import { calculateReduction, autoBuildPayment } from "./cost.js";
import { payCoreCost } from "./cores.js";
import { removeHandCard } from "./zones.js";
import { appendLog, otherPlayerId } from "./utils.js";
import { resolveCardEvent, resolveOperations } from "./effectEngine/effectEngine.js";
import { entryConditionsMatch } from "./effectEngine/conditionResolver.js";
import { getCombinedStats } from "./brave.js";

const COLOR_WORDS = {
  red: ["red", "vermelho", "vermelha", "赤"],
  purple: ["purple", "roxo", "roxa", "紫"],
  green: ["green", "verde", "緑"],
  white: ["white", "branco", "branca", "白"],
  yellow: ["yellow", "amarelo", "amarela", "黄"],
  blue: ["blue", "azul", "青"]
};

function compact(value) {
  return String(value || "").replace(/[\s_-]+/g, "").toLowerCase();
}

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

function levelMatches(effect, card, physical) {
  const level = getCurrentLevel(card, physical)?.level ?? 0;
  if (Array.isArray(effect?.levels) && effect.levels.length && !effect.levels.map(Number).includes(Number(level))) return false;
  if (effect?.level != null && Number(effect.level) !== Number(level)) return false;
  return true;
}

function triggerTimingMatches(effect, timing = "whenAttacks") {
  const type = compact(effect?.type);
  const effectTiming = compact(effect?.timing);
  const isTrigger = type.includes("ultimatetrigger") || effectTiming === "ultimatetrigger";
  if (!isTrigger) return false;
  if (timing === "whenBattles") return effectTiming === "whenbattles" || type.includes("battle");
  return effectTiming === "whenattacks" || effectTiming === "ultimatetrigger" || (!effectTiming && !type.includes("battle"));
}

function ultimateTriggerEffects(match, cardIndex, card, physical, timing = "whenAttacks") {
  const combined = Boolean(getBraveAttachment(match, physical?.instanceId));
  return (card?.effects || []).filter((effect) => {
    if (!triggerTimingMatches(effect, timing)) return false;
    if (!levelMatches(effect, card, physical)) return false;
    if (effect.requiresCombined === true && !combined) return false;
    if (effect.requiresCombined === false && combined) return false;
    return true;
  });
}

export function findUltimateTriggerEffect(match, cardIndex, card, physical, timing = "whenAttacks") {
  return ultimateTriggerEffects(match, cardIndex, card, physical, timing)[0] || null;
}

function findXUTriggerEffect(match, cardIndex, card, physical) {
  if (!card || !physical) return null;
  const context = {
    event: "afterUltimateTrigger",
    sourcePlayerId: findPhysicalCard(match, physical.instanceId)?.playerId || null,
    sourceInstanceId: physical.instanceId,
    sourcePhysical: physical,
    sourceCard: card,
    combinedBrave: getBraveAttachment(match, physical.instanceId)
  };
  return (card.effects || []).find((effect) => {
    if (compact(effect?.type) !== "xutrigger") return false;
    if (!levelMatches(effect, card, physical)) return false;
    return entryConditionsMatch(match, effect, context, cardIndex);
  }) || null;
}

function findCriticalHitEffect(match, cardIndex, card, physical, trigger) {
  if (!trigger?.hit || !card || !physical) return null;
  const context = {
    event: "ultimateTriggerHit",
    sourcePlayerId: trigger.controllerPlayerId,
    sourceInstanceId: physical.instanceId,
    sourcePhysical: physical,
    sourceCard: card,
    combinedBrave: getBraveAttachment(match, physical.instanceId),
    ultimateTrigger: trigger,
    ultimateTriggerHit: true
  };
  return (card.effects || []).find((effect) =>
    compact(effect?.type) === "criticalhit" &&
    levelMatches(effect, card, physical) &&
    entryConditionsMatch(match, effect, context, cardIndex)
  ) || null;
}

function hitOperations(effect) {
  const value = effect?.onHitOperations ?? effect?.hitOperations ?? effect?.operationsOnHit ?? effect?.onHit ?? [];
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function xuHitOperations(effect) {
  const value = effect?.operations ?? effect?.actions ?? effect?.onHitOperations ?? effect?.hitOperations ?? effect?.operationsOnHit ?? [];
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function resumeBattle(match, stage) {
  const battle = match.battle;
  if (!battle) return match;
  const resumeStage = stage || "flash1";
  if (resumeStage === "flash2") {
    return {
      ...match,
      battle: {
        ...battle,
        stage: "flash2",
        flash: {
          number: 2,
          priorityPlayerId: battle.defenderPlayerId,
          consecutivePasses: 0
        }
      }
    };
  }
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

function triggerDisplayName(kind) {
  return kind === "xu" ? "XU Trigger" : "U-Trigger";
}

function buildTriggerBase(match, sourcePlayerId, sourcePhysical, sourceCard, effect, kind, resumeStage) {
  const opponentId = otherPlayerId(match, sourcePlayerId);
  return {
    kind,
    sourceInstanceId: sourcePhysical.instanceId,
    sourceCardId: sourcePhysical.cardId,
    controllerPlayerId: sourcePlayerId,
    opponentPlayerId: opponentId,
    counterPlayerId: opponentId,
    effectId: effect.id || null,
    sourceCost: Number(sourceCard?.cost || 0),
    sourceLevel: getCurrentLevel(sourceCard, sourcePhysical)?.level ?? null,
    originalHit: false,
    hit: false,
    countered: false,
    counterPassed: false,
    revealedCardId: null,
    revealedInstanceId: null,
    revealedCost: null,
    status: "revealed",
    effectResolution: "pending",
    counterResolution: "pending",
    manualResolutionNeeded: false,
    resumeStage,
    effectTextPT: effectTextValue(effect, "ptBR"),
    effectTextEN: effectTextValue(effect, "en"),
    criticalHit: null
  };
}

function beginTriggerReveal(match, sourcePlayerId, sourcePhysical, sourceCard, effect, cardIndex, { kind = "ultimate", resumeStage = "flash1" } = {}) {
  const opponentId = otherPlayerId(match, sourcePlayerId);
  const opponent = match.players[opponentId];
  const combinedStats = getCombinedStats(match, cardIndex, sourcePhysical);
  const sourceCost = Number(combinedStats.cost || sourceCard?.cost || 0);
  const baseTrigger = {
    ...buildTriggerBase(match, sourcePlayerId, sourcePhysical, sourceCard, effect, kind, resumeStage),
    sourceCost
  };

  if (!opponent?.deck?.length) {
    const next = appendLog({
      ...match,
      battle: {
        ...match.battle,
        stage: "ultimateTrigger",
        flash: null,
        ultimateTrigger: { ...baseTrigger, status: "emptyDeck", effectResolution: "none", counterResolution: "none" }
      }
    }, `${triggerDisplayName(kind)}: o deck do oponente estava vazio; nenhuma carta foi revelada.`, "effect");
    return { match: next, triggered: true, hit: false, manualResolutionNeeded: false };
  }

  const deck = [...opponent.deck];
  const revealed = deck.shift();
  const revealedCard = getDatabaseCard(cardIndex, revealed);
  const revealedCost = Number(revealedCard?.cost || 0);
  const hit = sourceCost > revealedCost;

  const hasTriggerCounter = hit && (opponent.hand || []).some((physical) => {
    const card = getDatabaseCard(cardIndex, physical);
    return card?.cardType === "magic" && isTriggerCounterCard(card);
  });

  let trigger = {
    ...baseTrigger,
    revealedCardId: revealed.cardId,
    revealedInstanceId: revealed.instanceId,
    revealedCost,
    originalHit: hit,
    hit,
    status: hasTriggerCounter ? "counterWindow" : "revealed",
    counterResolution: hasTriggerCounter ? "pending" : "none"
  };

  if (kind === "ultimate" && hit) {
    const criticalHit = findCriticalHitEffect(match, cardIndex, sourceCard, sourcePhysical, trigger);
    if (criticalHit) {
      trigger = {
        ...trigger,
        criticalHit: {
          eligible: true,
          effectId: criticalHit.id || null,
          textPT: effectTextValue(criticalHit, "ptBR"),
          textEN: effectTextValue(criticalHit, "en")
        }
      };
    }
  }

  let next = {
    ...match,
    players: {
      ...match.players,
      [opponentId]: {
        ...opponent,
        deck,
        trash: [
          ...opponent.trash,
          {
            ...revealed,
            revealedByUltimateTrigger: true,
            revealedByXUTrigger: kind === "xu"
          }
        ]
      }
    },
    battle: {
      ...match.battle,
      stage: "ultimateTrigger",
      flash: null,
      ultimateTrigger: trigger
    }
  };

  next = appendLog(
    next,
    `${triggerDisplayName(kind)}: ${revealedCard?.namePT || revealedCard?.nameEN || revealed.cardId} (Cost ${revealedCost}) — ${hit ? "HIT" : "GUARD"}.`,
    "effect"
  );

  return { match: next, triggered: true, hit, manualResolutionNeeded: false };
}

export function resolveUltimateTriggerOnAttack(match, attackerPlayerId, attackerPhysical, cardIndex) {
  const attackerCard = getDatabaseCard(cardIndex, attackerPhysical);
  if (attackerCard?.cardType !== "ultimate") {
    return { match, triggered: false, manualResolutionNeeded: false };
  }

  const combined = Boolean(getBraveAttachment(match, attackerPhysical.instanceId));
  const attackEffect = findUltimateTriggerEffect(match, cardIndex, attackerCard, attackerPhysical, "whenAttacks");
  const battleEffect = findUltimateTriggerEffect(match, cardIndex, attackerCard, attackerPhysical, "whenBattles");
  const effect = attackEffect || battleEffect;
  if (!effect) return { match, triggered: false, manualResolutionNeeded: false };
  if (effect.requiresCombined === true && !combined) return { match, triggered: false, manualResolutionNeeded: false };

  return beginTriggerReveal(match, attackerPlayerId, attackerPhysical, attackerCard, effect, cardIndex, {
    kind: "ultimate",
    resumeStage: "flash1"
  });
}

export function resolveUltimateTriggerOnBlock(match, blockerPlayerId, blockerPhysical, cardIndex) {
  const blockerCard = getDatabaseCard(cardIndex, blockerPhysical);
  if (blockerCard?.cardType !== "ultimate") return { match, triggered: false, manualResolutionNeeded: false };
  const effect = findUltimateTriggerEffect(match, cardIndex, blockerCard, blockerPhysical, "whenBattles");
  if (!effect) return { match, triggered: false, manualResolutionNeeded: false };
  const combined = Boolean(getBraveAttachment(match, blockerPhysical.instanceId));
  if (effect.requiresCombined === true && !combined) return { match, triggered: false, manualResolutionNeeded: false };
  return beginTriggerReveal(match, blockerPlayerId, blockerPhysical, blockerCard, effect, cardIndex, {
    kind: "ultimate",
    resumeStage: "flash2"
  });
}

export function isTriggerCounterCard(card) {
  if (!card) return false;
  return (card.effects || []).some((effect) => compact(effect?.type) === "triggercounter" || compact(effect?.timing) === "triggercounter");
}

export function getTriggerCounterCards(match, playerId, cardIndex) {
  const trigger = match.battle?.ultimateTrigger;
  if (!trigger || match.battle?.stage !== "ultimateTrigger" || trigger.status !== "counterWindow" || trigger.counterPlayerId !== playerId) return [];
  return (match.players?.[playerId]?.hand || [])
    .map((physical) => ({ physical, card: getDatabaseCard(cardIndex, physical) }))
    .filter(({ card }) => card?.cardType === "magic" && isTriggerCounterCard(card));
}

export function passTriggerCounter(match, actorId) {
  const battle = match.battle;
  const trigger = battle?.ultimateTrigger;
  if (!battle || battle.stage !== "ultimateTrigger" || !trigger || trigger.status !== "counterWindow") {
    return { ok: false, error: "Não existe janela de Trigger Counter ativa." };
  }
  if (actorId !== trigger.counterPlayerId) return { ok: false, error: "A janela de Trigger Counter pertence ao outro jogador." };
  const next = {
    ...match,
    battle: {
      ...battle,
      ultimateTrigger: {
        ...trigger,
        status: "revealed",
        counterPassed: true,
        counterResolution: "passed"
      }
    }
  };
  return { ok: true, match: appendLog(next, `${match.players[actorId].name} não usou Trigger Counter.`, "effect") };
}

export function useTriggerCounter(match, actorId, instanceId, cardIndex, { payment } = {}) {
  const battle = match.battle;
  const trigger = battle?.ultimateTrigger;
  if (!battle || battle.stage !== "ultimateTrigger" || !trigger || trigger.status !== "counterWindow") {
    return { ok: false, error: "Não existe janela de Trigger Counter ativa." };
  }
  if (actorId !== trigger.counterPlayerId) return { ok: false, error: "A janela de Trigger Counter pertence ao outro jogador." };

  const ctx = findPhysicalCard(match, instanceId);
  if (!ctx || ctx.playerId !== actorId || ctx.zone !== "hand") return { ok: false, error: "Trigger Counter não encontrado na mão." };
  const card = getDatabaseCard(cardIndex, ctx.card);
  if (card?.cardType !== "magic" || !isTriggerCounterCard(card)) return { ok: false, error: "Esta carta não possui Trigger Counter Magic estruturado." };

  const cost = calculateReduction(match, actorId, card, cardIndex);
  const chosen = payment ?? autoBuildPayment(match, actorId, cost.payable, cardIndex);
  if (!chosen && cost.payable > 0) return { ok: false, error: "Cores insuficientes para usar o Trigger Counter." };
  const paid = payCoreCost(match, actorId, chosen || [], cost.payable, cardIndex);
  if (!paid.ok) return paid;

  const removed = removeHandCard(paid.match.players[actorId], instanceId);
  if (!removed.card) return { ok: false, error: "Não foi possível retirar o Trigger Counter da mão." };
  let next = {
    ...paid.match,
    players: {
      ...paid.match.players,
      [actorId]: removed.player
    }
  };

  const engine = resolveCardEvent(next, {
    event: "triggerCounter",
    sourcePlayerId: actorId,
    sourcePhysical: removed.card,
    sourceCard: card,
    sourceCardId: card.id,
    context: {
      ultimateTrigger: next.battle?.ultimateTrigger,
      triggerCounter: true
    }
  }, cardIndex);
  next = engine.match;

  const playerAfter = next.players[actorId];
  next = {
    ...next,
    players: {
      ...next.players,
      [actorId]: {
        ...playerAfter,
        trash: [
          ...playerAfter.trash,
          { ...removed.card, cores: { regular: 0, soul: false } }
        ]
      }
    }
  };

  const currentTrigger = next.battle?.ultimateTrigger || trigger;
  const waitingDecision = Boolean(next.pendingEffectDecision);
  next = {
    ...next,
    battle: {
      ...next.battle,
      ultimateTrigger: {
        ...currentTrigger,
        status: waitingDecision
          ? "waitingCounterDecision"
          : (currentTrigger.countered ? "countered" : "revealed"),
        counterResolution: waitingDecision ? "waitingDecision" : "resolved",
        counterCardId: card.id,
        counterCardInstanceId: removed.card.instanceId,
        manualResolutionNeeded: Boolean(engine.manualResolutionNeeded)
      }
    }
  };
  next = appendLog(next, `${match.players[actorId].name} usou ${card.namePT || card.nameEN || card.id} como Trigger Counter.`, "effect");

  return {
    ok: true,
    match: next,
    manualResolutionNeeded: Boolean(engine.manualResolutionNeeded),
    notes: engine.notes || []
  };
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

function startXUTriggerIfEligible(match, previousTrigger, cardIndex) {
  if (!previousTrigger || previousTrigger.kind === "xu") return null;
  const sourceCtx = findPhysicalCard(match, previousTrigger.sourceInstanceId);
  if (!sourceCtx) return null;
  const sourcePhysical = sourceCtx.card;
  const sourceCard = getDatabaseCard(cardIndex, sourcePhysical);
  const xuEffect = findXUTriggerEffect(match, cardIndex, sourceCard, sourcePhysical);
  if (!xuEffect) return null;

  return beginTriggerReveal(match, previousTrigger.controllerPlayerId, sourcePhysical, sourceCard, xuEffect, cardIndex, {
    kind: "xu",
    resumeStage: previousTrigger.resumeStage || "flash1"
  }).match;
}

function completeCurrentTrigger(match, cardIndex, manualResolutionNeeded = false) {
  const trigger = match.battle?.ultimateTrigger;
  if (!trigger) return match;

  const resolved = {
    ...match,
    battle: {
      ...match.battle,
      ultimateTrigger: {
        ...trigger,
        status: "resolved",
        effectResolution: "resolved",
        manualResolutionNeeded: Boolean(manualResolutionNeeded)
      }
    }
  };

  const xu = startXUTriggerIfEligible(resolved, trigger, cardIndex);
  if (xu) return xu;
  return resumeBattle(resolved, trigger.resumeStage || "flash1");
}

export function resolveUltimateTriggerStage(match, actorId, cardIndex) {
  const battle = match.battle;
  const trigger = battle?.ultimateTrigger;
  if (!battle || battle.stage !== "ultimateTrigger" || !trigger) {
    return { ok: false, error: "Não existe Ultimate Trigger aguardando resolução." };
  }
  if (trigger.status === "counterWindow" || trigger.status === "waitingCounterDecision") {
    return { ok: false, error: "Conclua a janela de Trigger Counter antes de resolver o Trigger." };
  }
  if (actorId !== trigger.controllerPlayerId) {
    return { ok: false, error: "A resolução deste Trigger pertence ao jogador controlador." };
  }
  if (match.pendingEffectDecision) {
    return { ok: false, error: "Resolva a decisão de efeito pendente antes de continuar o Trigger." };
  }

  if (!trigger.hit || trigger.countered || trigger.status === "emptyDeck") {
    const next = completeCurrentTrigger(match, cardIndex, false);
    return { ok: true, match: next, manualResolutionNeeded: false, notes: [] };
  }

  const sourceCtx = findPhysicalCard(match, trigger.sourceInstanceId);
  if (!sourceCtx) {
    const next = completeCurrentTrigger(
      appendLog(match, `${triggerDisplayName(trigger.kind)}: a fonte não está mais no campo; o efeito de HIT não foi ativado.`, "effect"),
      cardIndex,
      false
    );
    return { ok: true, match: next, manualResolutionNeeded: false, notes: [] };
  }

  const sourcePhysical = sourceCtx.card;
  const sourceCard = getDatabaseCard(cardIndex, sourcePhysical) || cardIndex.get(trigger.sourceCardId);
  const effect = sourceCard
    ? (sourceCard.effects || []).find((entry) => entry.id === trigger.effectId) ||
      (trigger.kind === "xu"
        ? findXUTriggerEffect(match, cardIndex, sourceCard, sourcePhysical)
        : findUltimateTriggerEffect(match, cardIndex, sourceCard, sourcePhysical, trigger.resumeStage === "flash2" ? "whenBattles" : "whenAttacks"))
    : null;

  const event = trigger.kind === "xu" ? "xuTriggerHit" : "ultimateTriggerHit";
  const context = {
    event,
    sourcePlayerId: trigger.controllerPlayerId,
    sourceInstanceId: trigger.sourceInstanceId,
    sourcePhysical,
    sourceCard,
    ultimateTrigger: trigger,
    ultimateTriggerHit: trigger.kind !== "xu",
    xuTriggerHit: trigger.kind === "xu"
  };

  let next = match;
  let manualResolutionNeeded = false;
  const notes = [];
  let structuredResolved = false;

  const operations = trigger.kind === "xu" ? xuHitOperations(effect) : hitOperations(effect);
  if (operations.length) {
    const opsResult = resolveOperations(next, trigger.controllerPlayerId, operations, cardIndex, context);
    next = opsResult.match;
    manualResolutionNeeded = manualResolutionNeeded || Boolean(opsResult.manualResolutionNeeded);
    structuredResolved = structuredResolved || Boolean(opsResult.executed || opsResult.decision);
    notes.push(...(opsResult.notes || []));

    if (next.pendingEffectDecision) {
      next = markTriggerWaitingDecision(next, true);
      return { ok: true, match: next, manualResolutionNeeded: true, notes };
    }
  }

  const eventResult = resolveCardEvent(next, {
    event,
    sourcePlayerId: trigger.controllerPlayerId,
    sourceInstanceId: trigger.sourceInstanceId,
    sourcePhysical,
    sourceCardId: trigger.sourceCardId,
    context
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
    notes.push(`${triggerDisplayName(trigger.kind)} acertou, mas o efeito de HIT desta carta ainda precisa ser resolvido manualmente conforme o texto.`);
  }

  next = completeCurrentTrigger(next, cardIndex, manualResolutionNeeded);
  return { ok: true, match: next, manualResolutionNeeded, notes };
}

export function finalizeTriggerCounterAfterDecision(match) {
  if (match.pendingEffectDecision) return match;
  const battle = match.battle;
  const trigger = battle?.ultimateTrigger;
  if (!battle || battle.stage !== "ultimateTrigger" || !trigger || trigger.counterResolution !== "waitingDecision") return match;
  return {
    ...match,
    battle: {
      ...battle,
      ultimateTrigger: {
        ...trigger,
        status: trigger.countered ? "countered" : "revealed",
        counterResolution: "resolved"
      }
    }
  };
}

export function finalizeUltimateTriggerAfterDecision(match, cardIndex) {
  if (match.pendingEffectDecision) return match;
  const battle = match.battle;
  if (!battle || battle.stage !== "ultimateTrigger" || battle.ultimateTrigger?.status !== "waitingDecision") return match;
  return completeCurrentTrigger(match, cardIndex, false);
}
