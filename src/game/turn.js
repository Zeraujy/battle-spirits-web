import { PHASES } from "./constants.js";
import { appendLog, otherPlayerId } from "./utils.js";
import { clearEffectModifiers } from "./effectEngine/modifierResolver.js";
import { createSeededRandom, deriveSeed } from "./random.js";
import { shuffle } from "./utils.js";
import { dispatchPhaseEntry } from "./effectEngine/phaseTriggerEngine.js";
import { legalAttackers } from "./battle.js";
import { findPhysicalCard } from "./selectors.js";


function decrementEndStepSuppressions(match, playerId) {
  const current = Number(match.persistentEffects?.suppressWhenSummonedEndSteps?.[playerId] || 0);
  if (current <= 0) return match;
  const nextValue = Math.max(0, current - 1);
  return {
    ...match,
    persistentEffects: {
      ...(match.persistentEffects || {}),
      suppressWhenSummonedEndSteps: {
        ...(match.persistentEffects?.suppressWhenSummonedEndSteps || {}),
        [playerId]: nextValue
      }
    }
  };
}

export function isFirstPlayersFirstTurn(match) {
  return match.turnNumber === 1 && match.activePlayerId === match.firstPlayerId;
}

function drawOne(match, playerId) {
  const player = match.players[playerId];
  if (!player.deck.length) {
    return { ...match, winnerId: otherPlayerId(match, playerId), winnerReason: "deck" };
  }
  const deck = [...player.deck];
  const card = deck.shift();
  const nextPlayer = { ...player, deck, hand: [...player.hand, card] };
  return { ...match, players: { ...match.players, [playerId]: nextPlayer } };
}

function performPhaseEntry(match, phase) {
  const playerId = match.activePlayerId;
  const player = match.players[playerId];
  if (phase === "start") {
    if (player.deck.length === 0) {
      return { ...match, winnerId: otherPlayerId(match, playerId), winnerReason: "deck" };
    }
  }
  if (phase === "core") {
    if (!isFirstPlayersFirstTurn(match)) {
      return {
        ...match,
        players: {
          ...match.players,
          [playerId]: { ...player, reserve: player.reserve + 1 }
        }
      };
    }
  }
  if (phase === "draw") return drawOne(match, playerId);
  if (phase === "refresh") {
    const field = {};
    for (const [zone, cards] of Object.entries(player.field)) {
      field[zone] = cards.map((c) => ({ ...c, exhausted: false }));
    }
    const soulFromTrash = player.soulCore?.zone === "trash";
    return {
      ...match,
      players: {
        ...match.players,
        [playerId]: {
          ...player,
          field,
          reserve: player.reserve + player.trashCores,
          trashCores: 0,
          soulCore: soulFromTrash ? { zone: "reserve", instanceId: null } : player.soulCore
        }
      }
    };
  }
  return match;
}

export function completeScheduledAttackStepEnd(match, cardIndex) {
  const scheduled = match.temporary?.endAttackStepAfterBattle || null;
  if (!scheduled) return { match, completed: false, manualResolutionNeeded: false, notes: [] };
  if (match.phase !== "attack" || match.battle || match.pendingEffectDecision || match.burstOpportunity) {
    return { match, completed: false, manualResolutionNeeded: false, notes: [] };
  }

  let next = {
    ...match,
    phase: "end",
    temporary: { ...(match.temporary || {}), endAttackStepAfterBattle: null }
  };
  next = performPhaseEntry(next, "end");
  const phaseEvent = dispatchPhaseEntry(next, "end", cardIndex, { previousPhase: "attack", eventPlayerId: next.activePlayerId });
  next = phaseEvent.match;
  next = decrementEndStepSuppressions(next, next.activePlayerId);
  next = appendLog(next, `${next.players[next.activePlayerId].name}: end (efeito encerrou o Attack Step).`, "turn");
  return {
    match: next,
    completed: true,
    manualResolutionNeeded: Boolean(phaseEvent.manualResolutionNeeded),
    notes: phaseEvent.notes || []
  };
}

export function advancePhase(match, actorId, cardIndex) {
  if (match.winnerId) return { ok: false, error: "A partida já terminou." };
  if (actorId !== match.activePlayerId) return { ok: false, error: "Apenas o jogador do turno pode avançar a fase." };
  if (match.battle) return { ok: false, error: "Resolva a batalha atual antes de avançar a fase." };
  if (match.phase === "attack") {
    const requirement = match.temporary?.attackRequirements?.[actorId] || null;
    const sourceStillActive = !requirement?.sourceInstanceId || Boolean(findPhysicalCard(match, requirement.sourceInstanceId));
    const completed = Number(match.temporary?.attackCounts?.[actorId] || 0);
    const minimum = Math.max(0, Number(requirement?.minimumAttacks || 0));
    if (requirement && sourceStillActive && completed < minimum && legalAttackers(match, actorId, cardIndex).length > 0) {
      return { ok: false, error: `Você deve declarar pelo menos ${minimum} ataque(s) neste Attack Step se puder.` };
    }
  }

  const index = PHASES.indexOf(match.phase);
  if (index < 0) return { ok: false, error: "Fase atual inválida." };
  let next;
  if (index === PHASES.length - 1) {
    const nextPlayerId = otherPlayerId(match, match.activePlayerId);
    next = {
      ...match,
      turnNumber: match.turnNumber + 1,
      activePlayerId: nextPlayerId,
      phase: "start",
      temporary: {},
      burstOpportunity: null,
      players: {
        ...match.players,
        [nextPlayerId]: {
          ...match.players[nextPlayerId],
          turnFlags: { burstSet: false, mirageSet: false }
        }
      }
    };
    next = clearEffectModifiers(next, "turn");
    next = performPhaseEntry(next, "start");
    const phaseEvent = dispatchPhaseEntry(next, "start", cardIndex, { previousPhase: "end", turnStarted: true, eventPlayerId: nextPlayerId });
    next = phaseEvent.match;
    next = appendLog(next, `Turno ${next.turnNumber}: ${next.players[nextPlayerId].name}.`, "turn");
    return { ok: true, match: next, manualResolutionNeeded: Boolean(phaseEvent.manualResolutionNeeded), notes: phaseEvent.notes || [] };
  }

  let nextPhase = PHASES[index + 1];
  if (nextPhase === "attack" && isFirstPlayersFirstTurn(match)) nextPhase = "end";
  next = { ...match, phase: nextPhase };
  next = performPhaseEntry(next, nextPhase);
  const phaseEvent = dispatchPhaseEntry(next, nextPhase, cardIndex, { previousPhase: match.phase, eventPlayerId: next.activePlayerId });
  next = phaseEvent.match;
  if (nextPhase === "end") next = decrementEndStepSuppressions(next, next.activePlayerId);
  next = appendLog(next, `${next.players[next.activePlayerId].name}: ${nextPhase}.`, "turn");
  return { ok: true, match: next, manualResolutionNeeded: Boolean(phaseEvent.manualResolutionNeeded), notes: phaseEvent.notes || [] };
}

export function mulligan(match, playerId) {
  const player = match.players[playerId];
  if (!player || player.mulliganUsed || match.turnNumber !== 1 || match.phase !== "start") {
    return { ok: false, error: "Mulligan indisponível." };
  }
  const mulliganSeed = deriveSeed(match.randomSeed, "mulligan", playerId, match.turnNumber);
  const random = mulliganSeed != null ? createSeededRandom(mulliganSeed) : Math.random;
  const deck = shuffle([...player.deck, ...player.hand], random);
  const hand = deck.splice(0, 4);
  return {
    ok: true,
    match: {
      ...match,
      players: { ...match.players, [playerId]: { ...player, deck, hand, mulliganUsed: true } }
    }
  };
}
