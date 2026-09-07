import { findPhysicalCard, getDatabaseCard, getEffectiveBP, getEffectiveSymbols } from "./selectors.js";
import { updateFieldCard, removeFieldCard } from "./zones.js";
import { appendLog, otherPlayerId, uid } from "./utils.js";
import { resolveUltimateTriggerOnAttack } from "./specialRules.js";

function refreshedBattleCards(player, cardIndex) {
  const cards = [...(player.field.spirits || []), ...(player.field.other || [])];
  return cards.filter((physical) => {
    if (physical.combinedWith || physical.exhausted) return false;
    const card = getDatabaseCard(cardIndex, physical);
    return ["spirit", "ultimate", "brave"].includes(card?.cardType);
  });
}

export function legalAttackers(match, playerId, cardIndex) {
  if (match.phase !== "attack" || match.activePlayerId !== playerId || match.battle) return [];
  return refreshedBattleCards(match.players[playerId], cardIndex);
}

export function declareAttack(match, playerId, instanceId, cardIndex) {
  if (match.phase !== "attack" || match.activePlayerId !== playerId || match.battle) return { ok: false, error: "Não é possível declarar esse ataque agora." };
  const attacker = legalAttackers(match, playerId, cardIndex).find((c) => c.instanceId === instanceId);
  if (!attacker) return { ok: false, error: "Atacante inválido ou Exhausted." };
  const defenderId = otherPlayerId(match, playerId);
  let player = updateFieldCard(match.players[playerId], instanceId, (c) => ({ ...c, exhausted: true }));
  const battle = {
    id: uid("battle"),
    attackerPlayerId: playerId,
    defenderPlayerId: defenderId,
    attackerInstanceId: instanceId,
    blockerInstanceId: null,
    stage: "flash1",
    flash: { number: 1, priorityPlayerId: defenderId, consecutivePasses: 0 }
  };
  let next = { ...match, players: { ...match.players, [playerId]: player }, battle };
  next = appendLog(next, `${match.players[playerId].name} declarou um ataque.`, "battle");
  const trigger = resolveUltimateTriggerOnAttack(next, playerId, attacker, cardIndex);
  return { ok: true, match: trigger.match, manualResolutionNeeded: trigger.manualResolutionNeeded };
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
  return refreshedBattleCards(match.players[battle.defenderPlayerId], cardIndex);
}

export function declareBlock(match, playerId, instanceId, cardIndex) {
  const battle = match.battle;
  if (!battle || battle.stage !== "block" || playerId !== battle.defenderPlayerId) return { ok: false, error: "Bloqueio indisponível." };
  const blocker = legalBlockers(match, cardIndex).find((c) => c.instanceId === instanceId);
  if (!blocker) return { ok: false, error: "Bloqueador inválido." };
  const player = updateFieldCard(match.players[playerId], instanceId, (c) => ({ ...c, exhausted: true }));
  return {
    ok: true,
    match: {
      ...match,
      players: { ...match.players, [playerId]: player },
      battle: {
        ...battle,
        blockerInstanceId: instanceId,
        stage: "flash2",
        flash: { number: 2, priorityPlayerId: playerId, consecutivePasses: 0 }
      }
    }
  };
}

export function declineBlock(match, playerId) {
  const battle = match.battle;
  if (!battle || battle.stage !== "block" || battle.defenderPlayerId !== playerId) return { ok: false, error: "Não é possível recusar bloqueio agora." };
  return { ok: true, match: { ...match, battle: { ...battle, stage: "resolve", blockerInstanceId: null, flash: null } } };
}

function destroyBattleCard(match, playerId, instanceId, cardIndex) {
  const player = match.players[playerId];
  const removed = removeFieldCard(player, instanceId);
  if (!removed.card) return match;
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
    if (min <= nextPlayer.reserve) {
      nextPlayer = { ...nextPlayer, reserve: nextPlayer.reserve - min };
      nextPlayer = updateFieldCard(nextPlayer, attachedBrave.instanceId, (b) => ({ ...b, combinedWith: null, cores: { regular: min, soul: false } }));
    } else {
      const braveRemoved = removeFieldCard(nextPlayer, attachedBrave.instanceId);
      nextPlayer = { ...braveRemoved.player, trash: [...braveRemoved.player.trash, { ...braveRemoved.card, combinedWith: null }] };
    }
  }
  return { ...match, players: { ...match.players, [playerId]: nextPlayer } };
}

export function resolveBattle(match, actorId, cardIndex) {
  const battle = match.battle;
  if (!battle || battle.stage !== "resolve") return { ok: false, error: "A batalha ainda não está pronta para resolução." };
  if (![battle.attackerPlayerId, battle.defenderPlayerId].includes(actorId)) return { ok: false, error: "Jogador inválido para resolver a batalha." };
  const attackerCtx = findPhysicalCard(match, battle.attackerInstanceId);
  let next = match;

  if (!battle.blockerInstanceId) {
    if (attackerCtx) {
      const symbols = getEffectiveSymbols(match, cardIndex, attackerCtx.card);
      const damage = symbols.length;
      const defender = match.players[battle.defenderPlayerId];
      const actual = Math.min(damage, defender.life);
      next = {
        ...match,
        players: {
          ...match.players,
          [battle.defenderPlayerId]: {
            ...defender,
            life: defender.life - actual,
            reserve: defender.reserve + actual
          }
        }
      };
      if (defender.life - actual <= 0) {
        next = { ...next, winnerId: battle.attackerPlayerId, winnerReason: "life" };
      }
      next = appendLog(next, `${actual} Life foi reduzida pelo ataque não bloqueado.`, "battle");
    }
  } else {
    const blockerCtx = findPhysicalCard(match, battle.blockerInstanceId);
    if (attackerCtx && blockerCtx) {
      const aBP = getEffectiveBP(match, cardIndex, attackerCtx.card);
      const bBP = getEffectiveBP(match, cardIndex, blockerCtx.card);
      if (aBP <= bBP) next = destroyBattleCard(next, battle.attackerPlayerId, battle.attackerInstanceId, cardIndex);
      if (bBP <= aBP) next = destroyBattleCard(next, battle.defenderPlayerId, battle.blockerInstanceId, cardIndex);
      next = appendLog(next, `Battle Resolution: ${aBP} BP × ${bBP} BP.`, "battle");
    }
  }
  next = { ...next, battle: null };
  return { ok: true, match: next };
}
