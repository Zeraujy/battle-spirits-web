const PHASES = [
  { id: "start", label: "Start Step" },
  { id: "core", label: "Core Step" },
  { id: "draw", label: "Draw Step" },
  { id: "refresh", label: "Refresh Step" },
  { id: "main", label: "Main Step" },
  { id: "attack", label: "Attack Step" },
  { id: "end", label: "End Step" }
];

const GLOBAL_ACTION_LABELS = Object.freeze({
  ADVANCE_PHASE: "Next Phase",
  PASS_FLASH: "Pass",
  DECLINE_BLOCK: "No Block",
  RESOLVE_BATTLE: "Resolve Battle",
  CONFIRM_MANUAL_PLAY: "Confirm",
  CONFIRM_MANUAL_COST: "Confirm",
  CANCEL_MANUAL_PLAY: "Cancel",
  CANCEL_MANUAL_COST: "Cancel",
  MULLIGAN: "Mulligan"
});

function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

function safeText(value, fallback = "") {
  if (typeof value === "string") return value.trim();
  if (value == null) return fallback;
  return String(value).trim();
}

function phaseIndex(phase) {
  return Math.max(0, PHASES.findIndex((entry) => entry.id === phase));
}

function normalizeFeedEntry(entry, index) {
  if (!entry || typeof entry !== "object") {
    return {
      id: `entry-${index}`,
      text: safeText(entry, "Activity"),
      meta: ""
    };
  }

  return {
    id: safeText(entry.id, `entry-${index}`),
    text: safeText(entry.text || entry.label || entry.message, "Activity"),
    meta: safeText(entry.meta || entry.time || entry.kind, "")
  };
}

function normalizeChatMessage(entry, index) {
  if (!entry || typeof entry !== "object") {
    return {
      id: `chat-${index}`,
      author: "Player",
      text: safeText(entry),
      own: false
    };
  }

  return {
    id: safeText(entry.id, `chat-${index}`),
    author: safeText(entry.author || entry.name, "Player"),
    text: safeText(entry.text || entry.message, ""),
    own: Boolean(entry.own)
  };
}

function globalActions(actions) {
  return arrayOrEmpty(actions)
    .filter((action) => action && !action.disabled && GLOBAL_ACTION_LABELS[action.type])
    .slice(0, 4)
    .map((action) => ({
      id: action.id || action.type,
      type: action.type,
      label: GLOBAL_ACTION_LABELS[action.type],
      category: action.category || null,
      payload: action.payload ?? null
    }));
}

export function createUtilityPanelPresentation(viewModel, presentationData = {}) {
  const phase = viewModel?.timing?.phase || viewModel?.match?.phase || "start";
  const currentIndex = phaseIndex(phase);
  const activePlayerId = viewModel?.timing?.activePlayerId || viewModel?.match?.activePlayerId || null;
  const viewerPlayerId = viewModel?.viewer?.playerId || null;
  const activePlayerName = activePlayerId === viewModel?.player?.id
    ? viewModel?.player?.name || viewModel?.player?.username || "You"
    : activePlayerId === viewModel?.opponent?.id
      ? viewModel?.opponent?.name || viewModel?.opponent?.username || "Opponent"
      : null;

  return {
    turn: {
      number: Number(viewModel?.timing?.turnNumber || viewModel?.match?.turnNumber || 1),
      phase,
      phaseLabel: PHASES[currentIndex]?.label || safeText(phase, "Phase"),
      activePlayerId,
      activePlayerName,
      viewerIsActivePlayer: Boolean(viewerPlayerId && activePlayerId === viewerPlayerId),
      turnClock: viewModel?.timing?.turnClock || null
    },
    phases: PHASES.map((entry, index) => ({
      ...entry,
      state: index < currentIndex ? "complete" : index === currentIndex ? "current" : "upcoming"
    })),
    primaryActions: globalActions(viewModel?.actions),
    recentActions: arrayOrEmpty(presentationData?.recentActions).slice(-5).reverse().map(normalizeFeedEntry),
    gameLog: arrayOrEmpty(presentationData?.gameLog).slice(-12).reverse().map(normalizeFeedEntry),
    chatMessages: arrayOrEmpty(presentationData?.chatMessages).slice(-12).map(normalizeChatMessage),
    chatEnabled: presentationData?.chatEnabled !== false
  };
}

export default createUtilityPanelPresentation;
