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

  return { ...match, players };
}
