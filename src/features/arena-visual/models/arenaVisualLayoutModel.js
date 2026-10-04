const DEFAULT_ZONE_STATE = Object.freeze({ count: 0, visible: true, cards: [] });

function normalizeCard(card, index) {
  if (!card || typeof card !== "object") return { id: `card-${index}` };
  return {
    id: card.id || card.instanceId || `card-${index}`,
    instanceId: card.instanceId || card.id || null,
    name: card.name || card.cardName || "Card",
    image: card.image || card.imagePath || card.artwork || null,
    hidden: card.hidden === true,
    exhausted: card.exhausted === true,
    level: Number.isFinite(card.level) ? card.level : null,
    bp: Number.isFinite(card.bp) ? card.bp : null,
    coreCount: Number.isFinite(card.coreCount) ? Math.max(0, card.coreCount) : 0,
    soulCoreCount: Number.isFinite(card.soulCoreCount) ? Math.max(0, card.soulCoreCount) : 0,
    cardType: card.cardType || card.type || null,
    type: card.type || card.cardType || null,
    cost: Number.isFinite(card.cost) ? card.cost : null,
    description: card.description || card.text || card.effectText || null,
    effectText: typeof card.effectText === "string" ? card.effectText : (card.effectText?.en || card.effectText?.ptBR || card.description || card.text || null),
    effects: Array.isArray(card.effects) ? card.effects : [],
    color: card.color || card.primaryColor || null,
    colors: Array.isArray(card.colors) ? card.colors : (card.color ? [card.color] : []),
    keywords: Array.isArray(card.keywords) ? card.keywords : [],
    rulesText: card.rulesText || card.cardText || card.effectText || card.description || card.text || null,
    rarity: card.rarity || null,
    playable: card.playable == null ? null : Boolean(card.playable),
    playabilityRelevant: Boolean(card.playabilityRelevant),
    canAttack: Boolean(card.canAttack),
    canBlock: Boolean(card.canBlock),
    combinedWith: card.combinedWith || null,
    attachedBrave: card.attachedBrave ? normalizeCard(card.attachedBrave, `${index}-brave`) : null
  };
}

function normalizeZone(zone) {
  if (zone == null) return DEFAULT_ZONE_STATE;
  if (Array.isArray(zone)) {
    return { count: zone.length, visible: true, cards: zone.map(normalizeCard) };
  }
  const cards = Array.isArray(zone.cards) ? zone.cards.map(normalizeCard) : [];
  return {
    count: Number.isFinite(zone.count) ? Math.max(0, zone.count) : cards.length,
    visible: zone.visible !== false,
    cards,
    coreCount: Number.isFinite(zone.coreCount) ? Math.max(0, zone.coreCount) : undefined,
    soulCoreCount: Number.isFinite(zone.soulCoreCount) ? Math.max(0, zone.soulCoreCount) : 0,
    playerId: zone.playerId || null
  };
}

function normalizeSide(side = {}) {
  return {
    hand: normalizeZone(side.hand),
    battlefield: normalizeZone(side.battlefield || side.field),
    life: normalizeZone(side.life),
    burst: normalizeZone(side.burst),
    mirage: normalizeZone(side.mirage),
    reserve: normalizeZone(side.reserve),
    deck: normalizeZone(side.deck),
    trash: normalizeZone(side.trash),
    coreTrash: normalizeZone(side.coreTrash),
    void: normalizeZone(side.void)
  };
}

export function createArenaVisualLayoutModel(viewModel = {}) {
  return {
    player: normalizeSide(viewModel.player),
    opponent: normalizeSide(viewModel.opponent),
    playmatId: viewModel.playmatId || "default",
    interaction: {
      viewerPlayerId: viewModel.interaction?.viewerPlayerId || null,
      opponentPlayerId: viewModel.interaction?.opponentPlayerId || null,
      canMoveCores: Boolean(viewModel.interaction?.canMoveCores),
      canControlActor: Boolean(viewModel.interaction?.canControlActor)
    },
    utility: {
      currentPhase: viewModel.currentPhase || viewModel.utility?.currentPhase || "main",
      turnNumber: Number.isFinite(viewModel.turnNumber) ? viewModel.turnNumber : (viewModel.utility?.turnNumber || 1),
      activePlayerName: viewModel.activePlayerName || viewModel.utility?.activePlayerName || "",
      priorityLabel: viewModel.priorityLabel || viewModel.utility?.priorityLabel || "",
      actions: Array.isArray(viewModel.availableActions) ? viewModel.availableActions : (Array.isArray(viewModel.utility?.actions) ? viewModel.utility.actions : []),
      logEntries: Array.isArray(viewModel.logEntries) ? viewModel.logEntries : (Array.isArray(viewModel.utility?.logEntries) ? viewModel.utility.logEntries : []),
      chatMessages: Array.isArray(viewModel.chatMessages) ? viewModel.chatMessages : (Array.isArray(viewModel.utility?.chatMessages) ? viewModel.utility.chatMessages : []),
      pendingAction: viewModel.pendingAction || viewModel.utility?.pendingAction || null,
      battle: viewModel.battle || viewModel.utility?.battle || null,
      burstOpportunity: viewModel.burstOpportunity || viewModel.utility?.burstOpportunity || null,
      ultimateTrigger: viewModel.ultimateTrigger || viewModel.utility?.ultimateTrigger || null,
      effectDecision: viewModel.effectDecision || viewModel.utility?.effectDecision || null,
      setup: viewModel.setup || viewModel.utility?.setup || null,
      authority: viewModel.authority || viewModel.utility?.authority || null,
      online: viewModel.online || viewModel.utility?.online || null,
      manual: viewModel.manual || viewModel.utility?.manual || null,
      showAdvanceStep: viewModel.showAdvanceStep ?? viewModel.utility?.showAdvanceStep ?? true,
      canAdvanceStep: viewModel.canAdvanceStep ?? viewModel.utility?.canAdvanceStep ?? false,
      advanceStepLabel: viewModel.advanceStepLabel || viewModel.utility?.advanceStepLabel || "Avançar",
      advanceStepAction: viewModel.advanceStepAction || viewModel.utility?.advanceStepAction || null
    }
  };
}
