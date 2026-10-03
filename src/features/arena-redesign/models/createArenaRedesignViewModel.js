import { createArenaInteractionHints } from "./arenaInteractionHints.js";
function objectOrEmpty(value) {
  return value && typeof value === "object" ? value : {};
}

function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeCard(card, { hidden = false } = {}) {
  if (!card || hidden) {
    return {
      hidden: true
    };
  }

  return {
    instanceId: card.instanceId || null,
    cardId: card.cardId || card.id || null,
    cardType: card.cardType || null,
    exhausted: Boolean(card.exhausted),
    temporaryBP: normalizeNumber(card.temporaryBP),
    cores: {
      regular: normalizeNumber(card.cores?.regular),
      soul: Boolean(card.cores?.soul)
    },
    combinedWith: card.combinedWith || null,
    pendingDestruction: Boolean(card.pendingDestruction),
    flags: objectOrEmpty(card.flags)
  };
}

function normalizeVisibleZone(cards) {
  return arrayOrEmpty(cards).map((card) => normalizeCard(card));
}

function normalizeHiddenZone(cards) {
  return arrayOrEmpty(cards).map(() => normalizeCard(null, { hidden: true }));
}

function normalizeField(field) {
  const source = objectOrEmpty(field);

  return {
    spirits: normalizeVisibleZone(source.spirits),
    nexuses: normalizeVisibleZone(source.nexuses),
    other: normalizeVisibleZone(source.other)
  };
}

function normalizePlayer(player, { hidePrivateZones = false } = {}) {
  const source = objectOrEmpty(player);

  return {
    id: source.id || null,
    name: source.name || null,
    username: source.username || null,
    avatar: source.avatar || null,
    playerColor: source.playerColor || null,

    zones: {
      hand: hidePrivateZones
        ? normalizeHiddenZone(source.hand)
        : normalizeVisibleZone(source.hand),
      field: normalizeField(source.field),
      trash: normalizeVisibleZone(source.trash),
      revealed: normalizeVisibleZone(source.revealed),
      openArea: normalizeVisibleZone(source.openArea),
      removed: normalizeVisibleZone(source.removed),
      burst: source.burst
        ? hidePrivateZones
          ? normalizeCard(null, { hidden: true })
          : normalizeCard(source.burst)
        : null,
      mirage: source.mirage
        ? hidePrivateZones
          ? normalizeCard(null, { hidden: true })
          : normalizeCard(source.mirage)
        : null
    },

    counts: {
      deck: arrayOrEmpty(source.deck).length,
      hand: arrayOrEmpty(source.hand).length,
      trash: arrayOrEmpty(source.trash).length,
      removed: arrayOrEmpty(source.removed).length
    },

    resources: {
      life: normalizeNumber(source.life),
      reserve: normalizeNumber(source.reserve),
      trashCores: normalizeNumber(source.trashCores),
      soulCore: {
        zone: source.soulCore?.zone || null,
        instanceId: source.soulCore?.instanceId || null
      }
    },

    turnFlags: objectOrEmpty(source.turnFlags),
    mulliganUsed: Boolean(source.mulliganUsed)
  };
}

function resolveViewerPlayerId(players, requestedPlayerId) {
  if (requestedPlayerId && players[requestedPlayerId]) {
    return requestedPlayerId;
  }

  if (players.player1) return "player1";

  return Object.keys(players)[0] || null;
}

function resolveOpponentPlayerId(players, viewerPlayerId) {
  return Object.keys(players).find((playerId) => playerId !== viewerPlayerId) || null;
}

function normalizeAvailableActions(actions) {
  return arrayOrEmpty(actions).map((descriptor) => {
    const source = objectOrEmpty(descriptor?.action || descriptor);

    return {
      id: descriptor?.id || source?.id || source?.type || null,
      type: source?.type || descriptor?.type || null,
      label: descriptor?.label || source?.label || null,
      category: descriptor?.category || source?.category || null,
      instanceId: source?.instanceId || null,
      braveInstanceId: source?.braveInstanceId || null,
      hostInstanceId: source?.hostInstanceId || null,
      move: source?.move && typeof source.move === "object"
        ? {
            from: source.move.from ? { zone: source.move.from.zone || null, instanceId: source.move.from.instanceId || null } : null,
            to: source.move.to ? { zone: source.move.to.zone || null, instanceId: source.move.to.instanceId || null } : null,
            coreType: source.move.coreType || null
          }
        : null,
      payload: source?.payload ?? descriptor?.payload ?? null,
      disabled: Boolean(descriptor?.disabled || source?.disabled)
    };
  });
}

/**
 * Presentation-only adapter for the parallel Arena redesign.
 *
 * The redesign must consume this view model instead of reading the game engine
 * directly. Hidden opponent zones are converted to anonymous placeholders so
 * the presentation layer cannot accidentally expose private card identities.
 */
export function createArenaRedesignViewModel({
  match,
  viewerPlayerId,
  mode = "local",
  roomState = null,
  availableActions = []
} = {}) {
  const sourceMatch = objectOrEmpty(match);
  const players = objectOrEmpty(sourceMatch.players);
  const resolvedViewerPlayerId = resolveViewerPlayerId(players, viewerPlayerId);
  const opponentPlayerId = resolveOpponentPlayerId(players, resolvedViewerPlayerId);

  const viewer = resolvedViewerPlayerId
    ? normalizePlayer(players[resolvedViewerPlayerId])
    : normalizePlayer(null);

  const opponent = opponentPlayerId
    ? normalizePlayer(players[opponentPlayerId], { hidePrivateZones: true })
    : normalizePlayer(null, { hidePrivateZones: true });
  const normalizedActions = normalizeAvailableActions(availableActions);
  const interactionHints = createArenaInteractionHints({
    actions: normalizedActions,
    pendingEffectDecision: sourceMatch.pendingEffectDecision || null,
    viewerPlayerId: resolvedViewerPlayerId
  });

  return {
    schema: "arena-redesign-view-model",
    schemaVersion: 1,

    match: {
      id: sourceMatch.id || null,
      mode,
      format: sourceMatch.format || null,
      rulesVersion: sourceMatch.rulesVersion || null,
      turnNumber: normalizeNumber(sourceMatch.turnNumber, 1),
      phase: sourceMatch.phase || "start",
      activePlayerId: sourceMatch.activePlayerId || null,
      firstPlayerId: sourceMatch.firstPlayerId || null,
      winnerId: sourceMatch.winnerId || null,
      winnerReason: sourceMatch.winnerReason || null
    },

    viewer: {
      playerId: resolvedViewerPlayerId,
      isActivePlayer: Boolean(
        resolvedViewerPlayerId &&
        sourceMatch.activePlayerId === resolvedViewerPlayerId
      )
    },

    player: viewer,
    opponent,

    battle: sourceMatch.battle || null,
    burstOpportunity: sourceMatch.burstOpportunity || null,
    pendingEffectDecision: sourceMatch.pendingEffectDecision || null,

    timing: {
      turnNumber: normalizeNumber(sourceMatch.turnNumber, 1),
      phase: sourceMatch.phase || "start",
      activePlayerId: sourceMatch.activePlayerId || null,
      turnClock: roomState?.turnClock || null
    },

    actions: normalizedActions,
    interactionHints,

    privacy: {
      opponentHandIdentityHidden: true,
      opponentDeckIdentityHidden: true,
      opponentSetBurstIdentityHidden: true,
      opponentSetMirageIdentityHidden: true
    }
  };
}

export default createArenaRedesignViewModel;
