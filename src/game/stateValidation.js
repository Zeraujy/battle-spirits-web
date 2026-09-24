import { FIELD_ZONES } from "./constants.js";
import { getDatabaseCard } from "./selectors.js";

function addCardLocations(playerId, player, locations) {
  const add = (zone, cards) => {
    for (const card of cards || []) {
      if (!card?.instanceId) continue;
      const list = locations.get(card.instanceId) || [];
      list.push(`${playerId}:${zone}`);
      locations.set(card.instanceId, list);
    }
  };

  add("deck", player.deck);
  add("hand", player.hand);
  add("trash", player.trash);
  add("revealed", player.revealed);
  add("removed", player.removed);
  for (const zone of FIELD_ZONES) add(zone, player.field?.[zone]);
  if (player.burst) add("burst", [player.burst]);
  if (player.mirage) add("mirage", [player.mirage]);
}

function minimumLevelCores(card) {
  const values = (card?.levels || [])
    .map((level) => Number(level?.cores))
    .filter(Number.isFinite);
  if (!values.length) return ["spirit", "ultimate", "brave"].includes(card?.cardType) ? 1 : 0;
  return Math.min(...values);
}

export function validateMatchState(match, cardIndex = null) {
  const errors = [];
  const warnings = [];

  if (!match || typeof match !== "object") {
    return { ok: false, errors: ["Estado da partida ausente ou inválido."], warnings };
  }

  const playerIds = Object.keys(match.players || {});
  if (playerIds.length !== 2) errors.push("A partida precisa possuir exatamente dois jogadores.");
  if (!match.players?.[match.activePlayerId]) errors.push("activePlayerId não aponta para um jogador válido.");
  if (match.winnerId && !match.players?.[match.winnerId]) errors.push("winnerId não aponta para um jogador válido.");

  const locations = new Map();
  for (const [playerId, player] of Object.entries(match.players || {})) {
    for (const key of ["life", "reserve", "trashCores"]) {
      const value = Number(player?.[key]);
      if (!Number.isFinite(value) || value < 0) errors.push(`${playerId}.${key} possui valor inválido: ${player?.[key]}.`);
    }

    addCardLocations(playerId, player, locations);

    const soul = player?.soulCore;
    if (!soul || !["reserve", "trash", "card", "moving"].includes(soul.zone)) {
      warnings.push(`${playerId}.soulCore possui zona desconhecida.`);
    }
    if (soul?.zone === "card") {
      const target = locations.get(soul.instanceId) || [];
      if (!target.some((location) => location.startsWith(`${playerId}:`))) {
        errors.push(`${playerId}.soulCore aponta para uma carta inexistente.`);
      }
    }

    for (const zone of FIELD_ZONES) {
      for (const physical of player.field?.[zone] || []) {
        const regular = Number(physical?.cores?.regular || 0);
        if (!Number.isFinite(regular) || regular < 0) errors.push(`${physical.instanceId} possui quantidade inválida de Cores.`);

        if (physical.combinedWith) {
          const hostLocations = locations.get(physical.combinedWith) || [];
          if (!hostLocations.includes(`${playerId}:spirits`)) {
            errors.push(`Brave ${physical.instanceId} está combinado com um alvo inexistente.`);
          }
        } else if (cardIndex) {
          const card = getDatabaseCard(cardIndex, physical);
          const min = minimumLevelCores(card);
          const total = regular + (physical?.cores?.soul ? 1 : 0);
          if (["spirit", "ultimate", "brave"].includes(card?.cardType) && total < min) {
            warnings.push(`${physical.instanceId} está abaixo do mínimo de Cores para seu menor Level.`);
          }
        }
      }
    }
  }

  for (const [instanceId, cardLocations] of locations.entries()) {
    if (cardLocations.length > 1) errors.push(`${instanceId} aparece em múltiplas zonas: ${cardLocations.join(", ")}.`);
  }

  if (match.battle) {
    const attackerLocations = locations.get(match.battle.attackerInstanceId) || [];
    if (!attackerLocations.includes(`${match.battle.attackerPlayerId}:spirits`) && !attackerLocations.includes(`${match.battle.attackerPlayerId}:other`)) {
      errors.push("A batalha referencia um atacante que não está mais no campo.");
    }
    if (match.battle.blockerInstanceId) {
      const blockerLocations = locations.get(match.battle.blockerInstanceId) || [];
      if (!blockerLocations.includes(`${match.battle.defenderPlayerId}:spirits`) && !blockerLocations.includes(`${match.battle.defenderPlayerId}:other`)) {
        errors.push("A batalha referencia um bloqueador que não está mais no campo.");
      }
    }
  }

  if (match.burstOpportunity) {
    const player = match.players?.[match.burstOpportunity.playerId];
    if (!player) errors.push("A janela de Burst aponta para um jogador inválido.");
    else if (!player.burst) warnings.push("Há uma janela de Burst aberta sem uma carta Burst setada.");
  }

  return { ok: errors.length === 0, errors, warnings };
}
