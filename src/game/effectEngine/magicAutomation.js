import { appendLog, otherPlayerId } from "../utils.js";

export function stageMagicResolution(match, { playerId, physical, card, mode }) {
  return {
    ...match,
    pendingMagicResolution: {
      playerId,
      physical,
      cardId: card?.id || physical?.cardId || null,
      mode,
      startedInBattle: Boolean(match.battle),
      battleId: match.battle?.id || null
    }
  };
}

export function finalizePendingMagicResolution(match, cardIndex) {
  const pending = match.pendingMagicResolution;
  if (!pending || match.pendingEffectDecision) return match;
  const player = match.players?.[pending.playerId];
  if (!player || !pending.physical) return { ...match, pendingMagicResolution: null };
  const card = cardIndex.get(pending.cardId) || null;
  const clean = { ...pending.physical, cores: { regular: 0, soul: false } };
  let next = {
    ...match,
    pendingMagicResolution: null,
    players: { ...match.players, [pending.playerId]: { ...player, trash: [...player.trash, clean] } }
  };
  if (pending.mode === "flash" && next.battle?.flash && (!pending.battleId || next.battle.id === pending.battleId)) {
    next = {
      ...next,
      battle: {
        ...next.battle,
        flash: { ...next.battle.flash, consecutivePasses: 0, priorityPlayerId: otherPlayerId(next, pending.playerId) }
      }
    };
  }
  const name = card?.namePT || card?.nameEN || card?.id || pending.cardId || "Magic";
  return appendLog(next, `${name}: resolução de Magic concluída.`, "effect");
}
