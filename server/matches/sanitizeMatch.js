export function sanitizeMatchForViewer(match, viewerPlayerId) {
  if (!match) return null;

  const players = Object.fromEntries(
    Object.entries(match.players || {}).map(([playerId, player]) => {
      if (playerId === viewerPlayerId || !player) return [playerId, player];
      return [playerId, {
        ...player,
        hand: (player.hand || []).map((card) => ({ instanceId: card.instanceId, hidden: true })),
        deck: (player.deck || []).map((card) => ({ instanceId: card.instanceId, hidden: true })),
        burst: player.burst
          ? { instanceId: player.burst.instanceId, hidden: true, faceDown: true }
          : player.burst
      }];
    })
  );

  const pendingEffectDecision = match.pendingEffectDecision && match.pendingEffectDecision.playerId !== viewerPlayerId
    ? {
        id: match.pendingEffectDecision.id,
        kind: match.pendingEffectDecision.kind,
        playerId: match.pendingEffectDecision.playerId,
        titlePT: match.pendingEffectDecision.titlePT || null,
        titleEN: match.pendingEffectDecision.titleEN || null,
        instructionPT: match.pendingEffectDecision.instructionPT || null,
        instructionEN: match.pendingEffectDecision.instructionEN || null,
        candidateCount: Array.isArray(match.pendingEffectDecision.candidates) ? match.pendingEffectDecision.candidates.length : 0,
        hidden: true,
        candidates: [],
        options: []
      }
    : match.pendingEffectDecision;

  return { ...match, players, pendingEffectDecision, triggerBatch: null };
}
