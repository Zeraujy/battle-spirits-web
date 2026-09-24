import { findPhysicalCard } from "./selectors.js";
import { removeFieldCard, removeHandCard } from "./zones.js";

/**
 * Manual tabletop-style card movement.
 *
 * This module is intentionally small and isolated from the official summon /
 * battle rules. It exists for explicit manual corrections and drag-to-zone
 * interactions (hand, trash and deck) while preserving core ownership when a
 * card leaves the field.
 *
 * Rule-driven actions such as Summon, Deploy Nexus and Set Burst still go
 * through their dedicated engine actions; the UI must not use this helper to
 * bypass those rules.
 */

function cleanForOffField(card) {
  return {
    ...card,
    cores: { regular: 0, soul: false },
    exhausted: false,
    combinedWith: null,
    faceDown: false,
    pendingDestruction: false,
    flags: {
      ...(card.flags || {}),
      pendingManualPlay: false
    }
  };
}

function removeFromTrash(player, instanceId) {
  const index = player.trash.findIndex((card) => card.instanceId === instanceId);
  if (index < 0) return { player, card: null };
  const trash = [...player.trash];
  const [card] = trash.splice(index, 1);
  return { player: { ...player, trash }, card };
}

function removeFromRevealed(player, instanceId) {
  const revealed = [...(player.revealed || [])];
  const index = revealed.findIndex((card) => card.instanceId === instanceId);
  if (index < 0) return { player, card: null };
  const [card] = revealed.splice(index, 1);
  return { player: { ...player, revealed }, card };
}

function removeBurst(player, instanceId) {
  if (player.burst?.instanceId !== instanceId) return { player, card: null };
  return { player: { ...player, burst: null }, card: player.burst };
}

/**
 * Moves an owned physical card to hand, trash, top deck or bottom deck.
 * Field cards return their regular cores to Reserve and their Soul Core to the
 * Reserve before leaving the field.
 */
export function manualMoveCard(match, actorId, payload = {}) {
  const { instanceId, destination, placement = "top" } = payload;
  if (!instanceId || !destination) {
    return { ok: false, error: "Movimento manual incompleto." };
  }

  const ctx = findPhysicalCard(match, instanceId);
  if (!ctx) return { ok: false, error: "Carta não encontrada." };
  if (ctx.playerId !== actorId) {
    return { ok: false, error: "Você só pode mover manualmente suas próprias cartas." };
  }

  let player = match.players[actorId];
  let removed = { player, card: null };

  if (ctx.zone === "hand") {
    removed = removeHandCard(player, instanceId);
  } else if (["spirits", "nexuses", "other"].includes(ctx.zone)) {
    removed = removeFieldCard(player, instanceId);
    if (removed.card) {
      const regular = Number(removed.card.cores?.regular || 0);
      player = {
        ...removed.player,
        reserve: Number(removed.player.reserve || 0) + regular
      };
      if (removed.card.cores?.soul) {
        player.soulCore = { zone: "reserve", instanceId: null };
      }
      removed = { player, card: removed.card };
    }
  } else if (ctx.zone === "trash") {
    removed = removeFromTrash(player, instanceId);
  } else if (ctx.zone === "revealed") {
    removed = removeFromRevealed(player, instanceId);
  } else if (ctx.zone === "burst") {
    removed = removeBurst(player, instanceId);
  } else {
    return { ok: false, error: "Esta origem não aceita movimento manual por arraste." };
  }

  if (!removed.card) return { ok: false, error: "Não foi possível remover a carta da origem." };

  player = removed.player;
  const card = cleanForOffField(removed.card);

  if (destination === "hand") {
    player = { ...player, hand: [...player.hand, card] };
  } else if (destination === "trash") {
    player = { ...player, trash: [...player.trash, card] };
  } else if (destination === "deck") {
    player = {
      ...player,
      deck: placement === "bottom" ? [...player.deck, card] : [card, ...player.deck]
    };
  } else {
    return { ok: false, error: "Destino manual não reconhecido." };
  }

  return {
    ok: true,
    match: {
      ...match,
      players: {
        ...match.players,
        [actorId]: player
      }
    }
  };
}
