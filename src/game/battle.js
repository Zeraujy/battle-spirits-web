import { findPhysicalCard, getBraveAttachment, getCurrentLevel, getDatabaseCard, getEffectiveBP, getEffectiveCost, getEffectiveSymbols } from "./selectors.js";
import { updateFieldCard, removeFieldCard } from "./zones.js";
import { appendLog, otherPlayerId, uid } from "./utils.js";
import { resolveUltimateTriggerOnAttack } from "./specialRules.js";
import { dispatchEffectEvent } from "./effectEngine/triggerDispatcher.js";
import { clearEffectModifiers, getContinuousNumericModifier, getContinuousPlayerNumericModifier } from "./effectEngine/modifierResolver.js";
import { openLifeDecreaseBurstOpportunity } from "./burstRules.js";
import { BurstEvent, openBurstOpportunityForEvent } from "./effectEngine/burstEngine.js";
import { dispatchBattleParticipantEvent, createBattleContext } from "./effectEngine/battleTriggerEngine.js";
import { ReplacementEvent, clearReplacementWindow, resolveReplacementWindow } from "./effectEngine/replacementEngine.js";

function refreshedBattleCards(match, playerId, cardIndex) {
  const player = match.players[playerId];
  const cards = [...(player.field.spirits || []), ...(player.field.other || [])];
  return cards.filter((physical) => {
    if (physical.combinedWith || physical.exhausted) return false;
    if (getContinuousNumericModifier(match, cardIndex, physical, "cannotAttack") > 0) return false;
    const symbolCount = getEffectiveSymbols(match, cardIndex, physical).length;
    const maxForSymbolCount = Math.max(0, Number(getContinuousNumericModifier(match, cardIndex, physical, `maxAttacksPerTurnSymbolCount${symbolCount}`) || 0));
    const usedForSymbolCount = Number(match.temporary?.attacksBySymbolCount?.[playerId]?.[symbolCount] || 0);
    if (maxForSymbolCount > 0 && usedForSymbolCount >= maxForSymbolCount) return false;
    const attackTax = Math.max(0, Number(getContinuousNumericModifier(match, cardIndex, physical, "attackReserveTrashCost") || 0));
    if (attackTax > Number(player.reserve || 0)) return false;
    const card = getDatabaseCard(cardIndex, physical);
    return ["spirit", "ultimate", "brave"].includes(card?.cardType);
  });
}

export function legalAttackers(match, playerId, cardIndex) {
  if (match.phase !== "attack" || match.activePlayerId !== playerId || match.battle) return [];
  return refreshedBattleCards(match, playerId, cardIndex);
}

export function declareAttack(match, playerId, instanceId, cardIndex) {
  if (match.phase !== "attack" || match.activePlayerId !== playerId || match.battle) return { ok: false, error: "Não é possível declarar esse ataque agora." };
  const attacker = legalAttackers(match, playerId, cardIndex).find((card) => card.instanceId === instanceId);
  if (!attacker) return { ok: false, error: "Atacante inválido ou Exhausted." };

  const defenderId = otherPlayerId(match, playerId);
  const attackTax = Math.max(0, Number(getContinuousNumericModifier(match, cardIndex, attacker, "attackReserveTrashCost") || 0));
  let taxedPlayer = match.players[playerId];
  if (attackTax > 0) taxedPlayer = { ...taxedPlayer, reserve: Number(taxedPlayer.reserve || 0) - attackTax, trashCores: Number(taxedPlayer.trashCores || 0) + attackTax };
  const player = updateFieldCard(taxedPlayer, instanceId, (card) => ({ ...card, exhausted: true }));
  const battle = {
    id: uid("battle"),
    attackerPlayerId: playerId,
    defenderPlayerId: defenderId,
    attackerInstanceId: instanceId,
    blockerInstanceId: null,
    stage: "attackDeclared",
    flash: null,
    restrictions: {}
  };

  const attackNumber = Number(match.temporary?.attackCounts?.[playerId] || 0) + 1;
  const sourceAttackNumber = Number(match.temporary?.attackCountsByInstance?.[instanceId] || 0) + 1;
  let next = {
    ...match,
    players: { ...match.players, [playerId]: player },
    battle,
    temporary: {
      ...(match.temporary || {}),
      attackCounts: { ...(match.temporary?.attackCounts || {}), [playerId]: attackNumber },
      attackCountsByInstance: { ...(match.temporary?.attackCountsByInstance || {}), [instanceId]: sourceAttackNumber },
      attacksBySymbolCount: {
        ...(match.temporary?.attacksBySymbolCount || {}),
        [playerId]: {
          ...(match.temporary?.attacksBySymbolCount?.[playerId] || {}),
          [getEffectiveSymbols(match, cardIndex, attacker).length]: Number(match.temporary?.attacksBySymbolCount?.[playerId]?.[getEffectiveSymbols(match, cardIndex, attacker).length] || 0) + 1
        }
      }
    }
  };
  next = appendLog(next, `${match.players[playerId].name} declarou um ataque.`, "battle");

  const trigger = resolveUltimateTriggerOnAttack(next, playerId, attacker, cardIndex);
  next = trigger.match;

  if (!trigger.triggered) {
    next = {
      ...next,
      battle: {
        ...next.battle,
        stage: "flash1",
        flash: { number: 1, priorityPlayerId: defenderId, consecutivePasses: 0 }
      }
    };
  }

  const exhaustedEvent = dispatchEffectEvent(next, {
    event: "cardExhausted",
    sourcePlayerId: playerId,
    sourceInstanceId: instanceId,
    eventPlayerId: playerId,
    context: { attackNumber, sourceAttackNumber, exhaustedByAttack: true }
  }, cardIndex);
  next = exhaustedEvent.match;

  const engine = dispatchEffectEvent(next, {
    event: "whenAttacks",
    sourcePlayerId: playerId,
    sourceInstanceId: instanceId,
    context: { attackNumber, sourceAttackNumber }
  }, cardIndex);

  let resolvedMatch = engine.match;
  let manualResolutionNeeded = Boolean(trigger.manualResolutionNeeded || exhaustedEvent.manualResolutionNeeded || engine.manualResolutionNeeded);
  const notes = [...(exhaustedEvent.notes || []), ...engine.notes];

  const attachedBrave = getBraveAttachment(resolvedMatch, instanceId);
  if (attachedBrave) {
    const braveEngine = dispatchEffectEvent(resolvedMatch, {
      event: "whenAttacks",
      sourcePlayerId: playerId,
      sourceInstanceId: attachedBrave.instanceId,
      context: { isCombined: true, combinedHostInstanceId: instanceId, attackNumber, sourceAttackNumber }
    }, cardIndex);
    resolvedMatch = braveEngine.match;
    manualResolutionNeeded = manualResolutionNeeded || braveEngine.manualResolutionNeeded;
    notes.push(...braveEngine.notes);
  }

  return { ok: true, match: resolvedMatch, manualResolutionNeeded, notes };
}

export function passFlash(match, playerId) {
  const battle = match.battle;
  if (!battle || !["flash1", "flash2"].includes(battle.stage)) return { ok: false, error: "Não há Flash Timing ativo." };
  if (battle.flash.priorityPlayerId !== playerId) return { ok: false, error: "Não é sua prioridade de Flash." };
  const nextPasses = battle.flash.consecutivePasses + 1;
  if (nextPasses >= 2) {
    if (battle.stage === "flash1") {
      return { ok: true, match: { ...match, battle: { ...battle, stage: "block", flash: null } } };
    }
    return { ok: true, match: { ...match, battle: { ...battle, stage: "resolve", flash: null } } };
  }
  return {
    ok: true,
    match: {
      ...match,
      battle: {
        ...battle,
        flash: { ...battle.flash, consecutivePasses: nextPasses, priorityPlayerId: otherPlayerId(match, playerId) }
      }
    }
  };
}

export function registerFlashUsed(match, playerId) {
  const battle = match.battle;
  if (!battle?.flash || battle.flash.priorityPlayerId !== playerId) return { ok: false, error: "Prioridade de Flash inválida." };
  return {
    ok: true,
    match: {
      ...match,
      battle: {
        ...battle,
        flash: { ...battle.flash, consecutivePasses: 0, priorityPlayerId: otherPlayerId(match, playerId) }
      }
    }
  };
}

export function legalBlockers(match, cardIndex) {
  const battle = match.battle;
  if (!battle || battle.stage !== "block") return [];
  const restrictions = battle.restrictions || {};
  const defender = match.players[battle.defenderPlayerId];
  const attackerCtx = findPhysicalCard(match, battle.attackerInstanceId);
  const attackerPhysical = attackerCtx?.card || null;
  const attackerBP = attackerPhysical ? getEffectiveBP(match, cardIndex, attackerPhysical) : 0;
  const blockDiscardMagicCost = attackerPhysical ? Math.max(0, Number(getContinuousNumericModifier(match, cardIndex, attackerPhysical, "blockDiscardMagicCost") || 0)) : 0;
  if (blockDiscardMagicCost > 0) {
    const magicInHand = (defender.hand || []).filter((physical) => String(getDatabaseCard(cardIndex, physical)?.cardType || "").toLowerCase() === "magic").length;
    if (magicInHand < blockDiscardMagicCost) return [];
  }
  const attackerBraved = Boolean(attackerPhysical && getBraveAttachment(match, attackerPhysical.instanceId));
  const candidates = [...(defender.field.spirits || []), ...(defender.field.other || [])].filter((physical) => {
    if (physical.combinedWith) return false;
    if (!physical.exhausted) return true;
    if (getContinuousNumericModifier(match, cardIndex, physical, "allowExhaustedBlock") > 0) return true;
    const maxBP = getContinuousNumericModifier(match, cardIndex, physical, "allowExhaustedBlockMaxOpponentBP");
    if (maxBP > 0 && attackerBP <= maxBP) return true;
    if (attackerBraved && getContinuousNumericModifier(match, cardIndex, physical, "allowExhaustedBlockAgainstBraved") > 0) return true;
    return false;
  });
  return candidates.filter((physical) => {
    const card = getDatabaseCard(cardIndex, physical);
    if (getContinuousNumericModifier(match, cardIndex, physical, "cannotBlock") > 0) return false;
    if (restrictions.spiritsCannotBlock && ["spirit", "brave"].includes(card?.cardType)) return false;
    if (restrictions.ultimatesCannotBlock && card?.cardType === "ultimate") return false;
    if (restrictions.minimumBlockerLevel != null) {
      const level = Number(getCurrentLevel(card, physical)?.level || 0);
      if (level < Number(restrictions.minimumBlockerLevel)) return false;
    }
    if (restrictions.maximumBlockerBP != null && getEffectiveBP(match, cardIndex, physical) > Number(restrictions.maximumBlockerBP)) return false;
    return true;
  });
}

export function declareBlock(match, playerId, instanceId, cardIndex) {
  const battle = match.battle;
  if (!battle || battle.stage !== "block" || playerId !== battle.defenderPlayerId) return { ok: false, error: "Bloqueio indisponível." };
  const blocker = legalBlockers(match, cardIndex).find((c) => c.instanceId === instanceId);
  if (!blocker) return { ok: false, error: "Bloqueador inválido." };
  let blockingPlayer = match.players[playerId];
  const attackerCtx = findPhysicalCard(match, battle.attackerInstanceId);
  const blockDiscardMagicCost = attackerCtx?.card ? Math.max(0, Number(getContinuousNumericModifier(match, cardIndex, attackerCtx.card, "blockDiscardMagicCost") || 0)) : 0;
  if (blockDiscardMagicCost > 0) {
    const hand = [...(blockingPlayer.hand || [])];
    const discardIndexes = [];
    for (let i = 0; i < hand.length && discardIndexes.length < blockDiscardMagicCost; i += 1) {
      if (String(getDatabaseCard(cardIndex, hand[i])?.cardType || "").toLowerCase() === "magic") discardIndexes.push(i);
    }
    if (discardIndexes.length < blockDiscardMagicCost) return { ok: false, error: "É necessário descartar Magic para bloquear." };
    const discarded = discardIndexes.map((i) => hand[i]);
    blockingPlayer = { ...blockingPlayer, hand: hand.filter((_, i) => !discardIndexes.includes(i)), trash: [...(blockingPlayer.trash || []), ...discarded] };
  }
  const player = updateFieldCard(blockingPlayer, instanceId, (c) => ({ ...c, exhausted: true }));
  const next = {
    ...match,
    players: { ...match.players, [playerId]: player },
    battle: {
      ...battle,
      blockerInstanceId: instanceId,
      stage: "flash2",
      flash: { number: 2, priorityPlayerId: playerId, consecutivePasses: 0 }
    }
  };
  const exhaustedEvent = dispatchEffectEvent(next, { event: "cardExhausted", sourcePlayerId: playerId, sourceInstanceId: instanceId, eventPlayerId: playerId, context: { exhaustedByBlock: true } }, cardIndex);
  const engine = dispatchEffectEvent(exhaustedEvent.match, { event: "whenBlocks", sourcePlayerId: playerId, sourceInstanceId: instanceId }, cardIndex);
  let resolvedMatch = engine.match;
  let manualResolutionNeeded = Boolean(exhaustedEvent.manualResolutionNeeded || engine.manualResolutionNeeded);
  const notes = [...(exhaustedEvent.notes || []), ...engine.notes];
  const attachedBrave = getBraveAttachment(resolvedMatch, instanceId);
  if (attachedBrave) {
    const braveEngine = dispatchEffectEvent(resolvedMatch, {
      event: "whenBlocks",
      sourcePlayerId: playerId,
      sourceInstanceId: attachedBrave.instanceId,
      context: { isCombined: true, combinedHostInstanceId: instanceId }
    }, cardIndex);
    resolvedMatch = braveEngine.match;
    manualResolutionNeeded = manualResolutionNeeded || braveEngine.manualResolutionNeeded;
    notes.push(...braveEngine.notes);
  }

  const battleContext = createBattleContext(resolvedMatch, cardIndex);
  const blocked = dispatchEffectEvent(resolvedMatch, {
    event: "whenBlocked",
    sourcePlayerId: battle.attackerPlayerId,
    sourceInstanceId: battle.attackerInstanceId,
    eventPlayerId: battle.attackerPlayerId,
    context: battleContext || {}
  }, cardIndex);
  resolvedMatch = blocked.match;
  manualResolutionNeeded = manualResolutionNeeded || blocked.manualResolutionNeeded;
  notes.push(...(blocked.notes || []));

  const battles = dispatchBattleParticipantEvent(resolvedMatch, "whenBattles", cardIndex);
  resolvedMatch = battles.match;
  manualResolutionNeeded = manualResolutionNeeded || battles.manualResolutionNeeded;
  notes.push(...(battles.notes || []));

  return { ok: true, match: resolvedMatch, manualResolutionNeeded, notes };
}

export function declineBlock(match, playerId, cardIndex) {
  const battle = match.battle;
  if (!battle || battle.stage !== "block" || battle.defenderPlayerId !== playerId) return { ok: false, error: "Não é possível recusar bloqueio agora." };
  if (battle.restrictions?.mustBlockIfAble && legalBlockers(match, cardIndex).length > 0) {
    return { ok: false, error: "Este efeito exige que o ataque seja bloqueado se houver um bloqueador válido." };
  }
  return { ok: true, match: { ...match, battle: { ...battle, stage: "resolve", blockerInstanceId: null, flash: null } } };
}

function moveDestroyedReplacement(match, playerId, instanceId, destination) {
  const player = match.players[playerId];
  const removed = removeFieldCard(player, instanceId);
  if (!removed.card) return { match, moved: null };
  const returnedRegular = Number(removed.card.cores?.regular || 0);
  let nextPlayer = { ...removed.player, reserve: Number(removed.player.reserve || 0) + returnedRegular };
  if (removed.card.cores?.soul) nextPlayer.soulCore = { zone: "reserve", instanceId: null };
  const clean = { ...removed.card, cores: { regular: 0, soul: false }, pendingDestruction: false, exhausted: false };
  if (destination === "hand") nextPlayer = { ...nextPlayer, hand: [...nextPlayer.hand, clean] };
  else if (destination === "topDeck") nextPlayer = { ...nextPlayer, deck: [clean, ...nextPlayer.deck] };
  else if (destination === "bottomDeck") nextPlayer = { ...nextPlayer, deck: [...nextPlayer.deck, clean] };
  else return { match, moved: null };
  return { match: { ...match, players: { ...match.players, [playerId]: nextPlayer } }, moved: clean };
}

function destroyBattleCard(match, playerId, instanceId, cardIndex, metadata = {}) {
  const found = findPhysicalCard(match, instanceId);
  if (!found) return { match, destroyed: null, prevented: false, manualResolutionNeeded: false, notes: [] };
  const replacement = resolveReplacementWindow(match, {
    event: ReplacementEvent.WOULD_BE_DESTROYED,
    targetPlayerId: playerId,
    targetInstanceId: instanceId,
    sourcePhysical: found.card,
    sourceCardId: found.card.cardId,
    cause: metadata.cause || "battle",
    context: metadata.context || {}
  }, cardIndex);
  let next = replacement.match;
  const notes = [...(replacement.notes || [])];
  if (replacement.pending) {
    return { match: next, destroyed: null, prevented: true, manualResolutionNeeded: true, notes };
  }
  if (replacement.prevented) {
    next = clearReplacementWindow(next);
    return { match: next, destroyed: null, prevented: true, manualResolutionNeeded: replacement.manualResolutionNeeded, notes };
  }
  if (replacement.replacement?.destination) {
    const moved = moveDestroyedReplacement(next, playerId, instanceId, replacement.replacement.destination);
    if (moved.moved) {
      next = clearReplacementWindow(moved.match);
      return { match: next, destroyed: null, prevented: true, replaced: true, manualResolutionNeeded: replacement.manualResolutionNeeded, notes };
    }
  }
  next = clearReplacementWindow(next);
  const player = next.players[playerId];
  const removed = removeFieldCard(player, instanceId);
  if (!removed.card) return { match: next, destroyed: null, prevented: false, manualResolutionNeeded: replacement.manualResolutionNeeded, notes };
  const returnedRegular = Number(removed.card.cores?.regular || 0);
  let nextPlayer = {
    ...removed.player,
    reserve: removed.player.reserve + returnedRegular,
    trash: [...removed.player.trash, { ...removed.card, cores: { regular: 0, soul: false }, pendingDestruction: false }]
  };
  if (removed.card.cores?.soul) nextPlayer.soulCore = { zone: "reserve", instanceId: null };

  const attachedBrave = (nextPlayer.field.other || []).find((b) => b.combinedWith === instanceId);
  if (attachedBrave) {
    const braveCard = getDatabaseCard(cardIndex, attachedBrave);
    const min = Math.min(...(braveCard?.levels || [{ cores: 1 }]).map((l) => Number(l.cores || 0)));
    const survives = getContinuousNumericModifier(next, cardIndex, attachedBrave, "braveSurvivesHostDestructionRefresh") > 0;
    if (min <= nextPlayer.reserve) {
      nextPlayer = { ...nextPlayer, reserve: nextPlayer.reserve - min };
      nextPlayer = updateFieldCard(nextPlayer, attachedBrave.instanceId, (b) => ({ ...b, combinedWith: null, exhausted: survives ? false : b.exhausted, flags: survives ? { ...(b.flags || {}), lastCombinedWith: instanceId } : b.flags, cores: { regular: min, soul: false } }));
    } else if (survives) {
      nextPlayer = updateFieldCard(nextPlayer, attachedBrave.instanceId, (b) => ({ ...b, combinedWith: null, exhausted: false, flags: { ...(b.flags || {}), lastCombinedWith: instanceId }, cores: { regular: 0, soul: false } }));
    } else {
      const braveRemoved = removeFieldCard(nextPlayer, attachedBrave.instanceId);
      nextPlayer = { ...braveRemoved.player, trash: [...braveRemoved.player.trash, { ...braveRemoved.card, combinedWith: null }] };
    }
  }
  return {
    match: { ...next, players: { ...next.players, [playerId]: nextPlayer } },
    destroyed: { playerId, physical: removed.card },
    prevented: false,
    manualResolutionNeeded: replacement.manualResolutionNeeded,
    notes
  };
}

export function resolveBattle(match, actorId, cardIndex) {
  const battle = match.battle;
  if (!battle || battle.stage !== "resolve") return { ok: false, error: "A batalha ainda não está pronta para resolução." };
  if (![battle.attackerPlayerId, battle.defenderPlayerId].includes(actorId)) return { ok: false, error: "Jogador inválido para resolver a batalha." };

  const attackerCtx = findPhysicalCard(match, battle.attackerInstanceId);
  const blockerCtxBefore = battle.blockerInstanceId ? findPhysicalCard(match, battle.blockerInstanceId) : null;
  const originalBattleContext = createBattleContext(match, cardIndex, battle) || {};
  let next = match;
  let manualResolutionNeeded = false;
  const notes = [];

  const before = dispatchBattleParticipantEvent(next, "beforeBattleResolution", cardIndex, { battle });
  next = before.match;
  manualResolutionNeeded ||= Boolean(before.manualResolutionNeeded);
  notes.push(...(before.notes || []));
  if (next.pendingEffectDecision) return { ok: true, match: next, manualResolutionNeeded: true, notes };

  if (!battle.blockerInstanceId || next.battle?.restrictions?.treatAsUnblocked === true) {
    if (attackerCtx) {
      const symbols = getEffectiveSymbols(next, cardIndex, attackerCtx.card);
      const attackerCard = getDatabaseCard(cardIndex, attackerCtx.card);
      let damage = symbols.length;
      const defender = next.players[battle.defenderPlayerId];
      const turnProtection = next.temporary?.turnProtections?.[battle.defenderPlayerId]?.limitSpiritAttackLifeDamage;
      if (attackerCard?.cardType === "spirit" && turnProtection?.maxDamage != null) {
        damage = Math.min(damage, Math.max(0, Number(turnProtection.maxDamage)));
      }
      const instanceProtection = next.temporary?.turnProtections?.[battle.defenderPlayerId]?.blockSpiritAttackLifeDamageFromInstanceIds;
      if (attackerCard?.cardType === "spirit" && Array.isArray(instanceProtection?.instanceIds) && instanceProtection.instanceIds.includes(battle.attackerInstanceId)) damage = 0;
      const costProtection = next.temporary?.turnProtections?.[battle.defenderPlayerId]?.blockSpiritAttackLifeDamageByCosts;
      if (attackerCard?.cardType === "spirit" && Array.isArray(costProtection?.costs)) {
        const effectiveCost = getEffectiveCost(next, cardIndex, attackerCtx.card);
        if (costProtection.costs.map(Number).includes(Number(effectiveCost))) damage = 0;
      }
      if (attackerCard?.cardType === "spirit") {
        const attackerBP = getEffectiveBP(next, cardIndex, attackerCtx.card);
        const defenderField = [
          ...(next.players?.[battle.defenderPlayerId]?.field?.spirits || []),
          ...(next.players?.[battle.defenderPlayerId]?.field?.nexuses || []),
          ...(next.players?.[battle.defenderPlayerId]?.field?.other || [])
        ];
        const maxProtectedBP = defenderField.reduce((max, physical) => Math.max(max, Number(getContinuousNumericModifier(next, cardIndex, physical, "lifeProtectionMaxAttackerBP") || 0)), 0);
        if (maxProtectedBP > 0 && attackerBP <= maxProtectedBP) damage = 0;
      }
      if (next.battle?.restrictions?.preventLifeDamage === true) damage = 0;

      const replacement = resolveReplacementWindow(next, {
        event: ReplacementEvent.WOULD_LOSE_LIFE,
        targetPlayerId: battle.defenderPlayerId,
        amount: Math.min(damage, defender.life),
        cause: "unblockedAttack",
        context: originalBattleContext
      }, cardIndex);
      next = replacement.match;
      manualResolutionNeeded ||= Boolean(replacement.manualResolutionNeeded);
      notes.push(...(replacement.notes || []));
      if (replacement.pending) return { ok: true, match: next, manualResolutionNeeded: true, notes };

      let actual = replacement.prevented ? 0 : Math.min(damage, defender.life);
      if (replacement.replacement?.amount != null) actual = Math.max(0, Math.min(Number(replacement.replacement.amount), defender.life));
      next = clearReplacementWindow(next);

      if (actual > 0) {
        const currentDefender = next.players[battle.defenderPlayerId];
        const attackerLevel = attackerCtx ? Number(getCurrentLevel(attackerCard, attackerCtx.card)?.level || 0) : 0;
        const darkSnakeToVoid = attackerCard?.cardType === "spirit"
          && (attackerCard?.families || []).includes("Dark Snake")
          && attackerLevel >= 2
          && getContinuousPlayerNumericModifier(next, battle.attackerPlayerId, "darkSnakeAttackLifeToVoid") > 0;
        next = {
          ...next,
          players: {
            ...next.players,
            [battle.defenderPlayerId]: {
              ...currentDefender,
              life: currentDefender.life - actual,
              reserve: currentDefender.reserve + (darkSnakeToVoid ? 0 : actual)
            }
          }
        };
        const discardPerSymbol = getContinuousPlayerNumericModifier(next, battle.defenderPlayerId, "opponentAttackLifeDiscardPerSymbol");
        if (discardPerSymbol > 0) {
          const attackerPlayer = next.players[battle.attackerPlayerId];
          const count = Math.min(attackerPlayer.hand?.length || 0, getEffectiveSymbols(next, cardIndex, attackerCtx.card).length * discardPerSymbol);
          if (count > 0) {
            const discarded = (attackerPlayer.hand || []).slice(0, count);
            next = { ...next, players: { ...next.players, [battle.attackerPlayerId]: { ...attackerPlayer, hand: attackerPlayer.hand.slice(count), trash: [...attackerPlayer.trash, ...discarded] } } };
          }
        }
        if (currentDefender.life - actual <= 0) {
          next = { ...next, winnerId: battle.attackerPlayerId, winnerReason: "life" };
        } else {
          next = openLifeDecreaseBurstOpportunity(next, battle.defenderPlayerId, cardIndex, {
            amount: actual,
            cause: "unblockedAttack",
            sourcePlayerId: battle.attackerPlayerId,
            battleId: battle.id
          });
        }
        const lifeEvent = dispatchEffectEvent(next, {
          event: "lifeDecreased",
          eventPlayerId: battle.defenderPlayerId,
          context: { ...originalBattleContext, amount: actual, cause: "unblockedAttack" }
        }, cardIndex);
        next = lifeEvent.match;
        manualResolutionNeeded ||= Boolean(lifeEvent.manualResolutionNeeded);
        notes.push(...(lifeEvent.notes || []));
      }
      next = appendLog(next, `${actual} Life foi reduzida pelo ataque não bloqueado.`, "battle");
    }
  } else if (next.battle?.restrictions?.skipBPComparison !== true) {
    const blockerCtx = findPhysicalCard(next, battle.blockerInstanceId);
    const currentAttacker = findPhysicalCard(next, battle.attackerInstanceId);
    if (currentAttacker && blockerCtx) {
      const aBP = getEffectiveBP(next, cardIndex, currentAttacker.card);
      const bBP = getEffectiveBP(next, cardIndex, blockerCtx.card);
      const destroyed = [];
      if (aBP <= bBP) {
        const result = destroyBattleCard(next, battle.attackerPlayerId, battle.attackerInstanceId, cardIndex, { cause: "bpComparison", context: { ...originalBattleContext, attackerBP: aBP, blockerBP: bBP } });
        next = result.match;
        manualResolutionNeeded ||= Boolean(result.manualResolutionNeeded);
        notes.push(...(result.notes || []));
        if (result.destroyed) destroyed.push(result.destroyed);
        if (next.pendingEffectDecision) return { ok: true, match: next, manualResolutionNeeded: true, notes };
      }
      if (bBP <= aBP) {
        const result = destroyBattleCard(next, battle.defenderPlayerId, battle.blockerInstanceId, cardIndex, { cause: "bpComparison", context: { ...originalBattleContext, attackerBP: aBP, blockerBP: bBP } });
        next = result.match;
        manualResolutionNeeded ||= Boolean(result.manualResolutionNeeded);
        notes.push(...(result.notes || []));
        if (result.destroyed) destroyed.push(result.destroyed);
        if (next.pendingEffectDecision) return { ok: true, match: next, manualResolutionNeeded: true, notes };
      }
      next = appendLog(next, `Battle Resolution: ${aBP} BP × ${bBP} BP.`, "battle");

      originalBattleContext.attackerBP = aBP;
      originalBattleContext.blockerBP = bBP;
      originalBattleContext.cause = "bpComparison";
      originalBattleContext.destroyed = destroyed.map((entry) => ({
        playerId: entry.playerId,
        instanceId: entry.physical?.instanceId || null,
        cardId: entry.physical?.cardId || null,
        cardType: getDatabaseCard(cardIndex, entry.physical)?.cardType || null
      }));
      originalBattleContext.destroyedCount = originalBattleContext.destroyed.length;

      for (const destroyedCard of destroyed) {
        const engine = dispatchEffectEvent(next, {
          event: "whenDestroyed",
          sourcePlayerId: destroyedCard.playerId,
          sourcePhysical: destroyedCard.physical,
          sourceCardId: destroyedCard.physical.cardId,
          eventPlayerId: destroyedCard.playerId,
          context: {
            ...originalBattleContext,
            attackerBP: aBP,
            blockerBP: bBP,
            cause: "bpComparison",
            destroyedByPlayerId: otherPlayerId(next, destroyedCard.playerId),
            destroyedByCardType: "spirit",
            destroyedByInstanceId: destroyedCard.playerId === battle.attackerPlayerId ? battle.blockerInstanceId : battle.attackerInstanceId
          }
        }, cardIndex);
        next = engine.match;
        next = openBurstOpportunityForEvent(next, BurstEvent.OWN_SPIRIT_DESTROYED, destroyedCard.playerId, cardIndex, { sourcePlayerId: destroyedCard.playerId, sourceInstanceId: destroyedCard.physical.instanceId, battleId: battle.id, cause: "bpComparison" });
        manualResolutionNeeded ||= Boolean(engine.manualResolutionNeeded);
        notes.push(...(engine.notes || []));
      }
    }
  }

  if (Array.isArray(originalBattleContext.destroyed) && originalBattleContext.destroyed.length === 1 && originalBattleContext.cause === "bpComparison") {
    const destroyedEntry = originalBattleContext.destroyed[0];
    for (const [playerId, player] of Object.entries(next.players || {})) {
      if (destroyedEntry.playerId === playerId) continue;
      for (const physical of [...(player.field?.spirits || []), ...(player.field?.other || [])]) {
        if (getContinuousNumericModifier(next, cardIndex, physical, "refreshWhenOnlyOpponentDestroyedByBP") > 0 && physical.exhausted) {
          const updatedPlayer = updateFieldCard(next.players[playerId], physical.instanceId, (card) => ({ ...card, exhausted: false }));
          next = { ...next, players: { ...next.players, [playerId]: updatedPlayer } };
        }
      }
    }
  }

  const afterInputs = [
    attackerCtx ? { playerId: battle.attackerPlayerId, physical: attackerCtx.card } : null,
    blockerCtxBefore ? { playerId: battle.defenderPlayerId, physical: blockerCtxBefore.card } : null
  ].filter(Boolean);
  for (const participant of afterInputs) {
    const result = dispatchEffectEvent(next, {
      event: "afterBattleResolution",
      sourcePlayerId: participant.playerId,
      sourcePhysical: participant.physical,
      sourceCardId: participant.physical.cardId,
      eventPlayerId: participant.playerId,
      context: originalBattleContext
    }, cardIndex);
    next = result.match;
    manualResolutionNeeded ||= Boolean(result.manualResolutionNeeded);
    notes.push(...(result.notes || []));
  }

  next = { ...next, battle: null };
  next = clearEffectModifiers(next, "battle", { battleId: battle.id });
  return { ok: true, match: next, manualResolutionNeeded, notes };
}
