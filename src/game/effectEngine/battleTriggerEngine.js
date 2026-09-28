import { findPhysicalCard, getDatabaseCard, getEffectiveBP } from "../selectors.js";
import { dispatchEffectEvent } from "./triggerDispatcher.js";

export function createBattleContext(match, cardIndex, battle = match.battle) {
  if (!battle) return null;
  const attacker = findPhysicalCard(match, battle.attackerInstanceId);
  const blocker = battle.blockerInstanceId ? findPhysicalCard(match, battle.blockerInstanceId) : null;
  return {
    battleId: battle.id,
    stage: battle.stage,
    attackerPlayerId: battle.attackerPlayerId,
    defenderPlayerId: battle.defenderPlayerId,
    attackerInstanceId: battle.attackerInstanceId,
    blockerInstanceId: battle.blockerInstanceId || null,
    directAttack: !battle.blockerInstanceId,
    blocked: Boolean(battle.blockerInstanceId),
    attackerBP: attacker ? getEffectiveBP(match, cardIndex, attacker.card) : null,
    blockerBP: blocker ? getEffectiveBP(match, cardIndex, blocker.card) : null,
    attackerCardType: attacker ? getDatabaseCard(cardIndex, attacker.card)?.cardType || null : null,
    blockerCardType: blocker ? getDatabaseCard(cardIndex, blocker.card)?.cardType || null : null
  };
}

function dispatchOne(match, event, playerId, instanceId, cardIndex, context) {
  if (!instanceId || !playerId) return { match, manualResolutionNeeded: false, notes: [] };
  return dispatchEffectEvent(match, {
    event,
    sourcePlayerId: playerId,
    sourceInstanceId: instanceId,
    eventPlayerId: playerId,
    context
  }, cardIndex);
}

export function dispatchBattleParticipantEvent(match, event, cardIndex, options = {}) {
  const battle = options.battle || match.battle;
  if (!battle) return { match, manualResolutionNeeded: false, notes: [] };
  const context = { ...(createBattleContext(match, cardIndex, battle) || {}), ...(options.context || {}) };
  let next = match;
  let manualResolutionNeeded = false;
  const notes = [];

  const participants = options.participants || ["attacker", "blocker"];
  if (participants.includes("attacker")) {
    const result = dispatchOne(next, event, battle.attackerPlayerId, battle.attackerInstanceId, cardIndex, context);
    next = result.match;
    manualResolutionNeeded ||= Boolean(result.manualResolutionNeeded);
    notes.push(...(result.notes || []));
  }
  if (participants.includes("blocker") && battle.blockerInstanceId) {
    const result = dispatchOne(next, event, battle.defenderPlayerId, battle.blockerInstanceId, cardIndex, context);
    next = result.match;
    manualResolutionNeeded ||= Boolean(result.manualResolutionNeeded);
    notes.push(...(result.notes || []));
  }
  return { match: next, manualResolutionNeeded, notes, context };
}
