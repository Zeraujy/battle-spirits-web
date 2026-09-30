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
  if (pending.startedInBattle && pending.battleId && clean?.instanceId) {
    const currentByBattle = next.temporary?.magicUsedByBattle?.[pending.battleId] || {};
    const currentIds = currentByBattle[pending.playerId] || [];
    next = {
      ...next,
      temporary: {
        ...(next.temporary || {}),
        magicUsedByBattle: {
          ...(next.temporary?.magicUsedByBattle || {}),
          [pending.battleId]: { ...currentByBattle, [pending.playerId]: [...currentIds, clean.instanceId] }
        }
      }
    };
  }
  const previousCount = Number(next.temporary?.magicResolvedCounts?.[pending.playerId] || 0);
  const magicResolvedCount = previousCount + 1;
  next = {
    ...next,
    temporary: {
      ...(next.temporary || {}),
      magicResolvedCounts: { ...(next.temporary?.magicResolvedCounts || {}), [pending.playerId]: magicResolvedCount }
    },
    deferredCanonicalEvents: [
      ...(next.deferredCanonicalEvents || []),
      {
        event: "magicResolved",
        sourcePlayerId: pending.playerId,
        sourceInstanceId: clean.instanceId || null,
        sourcePhysical: clean,
        sourceCardId: pending.cardId || null,
        eventPlayerId: pending.playerId,
        context: { magicResolvedCount, magicMode: pending.mode, eventPlayerId: pending.playerId }
      }
    ]
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
