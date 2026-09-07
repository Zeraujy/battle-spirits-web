import { PHASES } from "./constants.js";
import { appendLog, otherPlayerId } from "./utils.js";

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

export function advancePhase(match, actorId) {
  if (match.winnerId) return { ok: false, error: "A partida já terminou." };
  if (actorId !== match.activePlayerId) return { ok: false, error: "Apenas o jogador do turno pode avançar a fase." };
  if (match.battle) return { ok: false, error: "Resolva a batalha atual antes de avançar a fase." };

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
      players: {
        ...match.players,
        [nextPlayerId]: {
          ...match.players[nextPlayerId],
          turnFlags: { burstSet: false, mirageSet: false }
        }
      }
    };
    next = performPhaseEntry(next, "start");
    next = appendLog(next, `Turno ${next.turnNumber}: ${next.players[nextPlayerId].name}.`, "turn");
    return { ok: true, match: next };
  }

  let nextPhase = PHASES[index + 1];
  if (nextPhase === "attack" && isFirstPlayersFirstTurn(match)) nextPhase = "end";
  next = { ...match, phase: nextPhase };
  next = performPhaseEntry(next, nextPhase);
  next = appendLog(next, `${next.players[next.activePlayerId].name}: ${nextPhase}.`, "turn");
  return { ok: true, match: next };
}

export function mulligan(match, playerId) {
  const player = match.players[playerId];
  if (!player || player.mulliganUsed || match.turnNumber !== 1 || match.phase !== "start") {
    return { ok: false, error: "Mulligan indisponível." };
  }
  const deck = [...player.deck, ...player.hand].sort(() => Math.random() - 0.5);
  const hand = deck.splice(0, 4);
  return {
    ok: true,
    match: {
      ...match,
      players: { ...match.players, [playerId]: { ...player, deck, hand, mulliganUsed: true } }
    }
  };
}
