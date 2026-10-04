const TARGET_KINDS = new Set([
  "selectTarget",
  "selectMultipleTargets",
  "selectTrashTarget",
  "chooseCardsFromHand"
]);

const CHOICE_KINDS = new Set([
  "chooseOption",
  "chooseYesNo",
  "chooseOrder",
  "chooseTriggerOrder",
  "chooseCoreDistribution"
]);

const BURST_ACTION_TYPES = new Set(["ACTIVATE_BURST", "PASS_BURST"]);
const FLASH_ACTION_TYPES = new Set(["PASS_FLASH", "USE_MAGIC", "USE_HIGH_SPEED", "ACTIVATE_FIELD_FLASH"]);

function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

function safeText(value, fallback = "") {
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

function safeAction(action) {
  return {
    id: action?.id || action?.type || null,
    type: action?.type || null,
    label: safeText(action?.label, action?.type || "Action"),
    category: action?.category || null,
    instanceId: action?.instanceId || null,
    payload: action?.payload ?? null
  };
}

function actionsOfType(actions, types) {
  return arrayOrEmpty(actions)
    .filter((action) => action && !action.disabled && types.has(action.type))
    .map(safeAction);
}

function decisionTitle(decision) {
  return safeText(decision?.title, "Effect Resolution");
}

function decisionInstruction(decision) {
  if (decision?.instruction) return decision.instruction;
  switch (decision?.kind) {
    case "selectTarget": return "Select a valid target.";
    case "selectMultipleTargets": return "Select the required targets.";
    case "selectTrashTarget": return "Select a valid card from Trash.";
    case "chooseCardsFromHand": return "Choose the required card or cards from Hand.";
    case "chooseOption": return "Choose one option to continue.";
    case "chooseYesNo": return "Choose Yes or No to continue.";
    case "chooseOrder": return "Choose the resolution order.";
    case "chooseTriggerOrder": return "Choose the trigger resolution order.";
    case "chooseCoreDistribution": return "Choose how the Cores are distributed.";
    default: return "Resolve the current effect decision.";
  }
}

function selectedIds(presentationData) {
  return [...new Set(arrayOrEmpty(presentationData?.selectedTargetInstanceIds).filter(Boolean))];
}

export function createEffectResolutionPresentation(viewModel, presentationData = {}) {
  const viewerPlayerId = viewModel?.viewer?.playerId || null;
  const decision = viewModel?.pendingEffectDecision || null;
  const burst = viewModel?.burstOpportunity || null;
  const battle = viewModel?.battle || null;
  const actions = arrayOrEmpty(viewModel?.actions);
  const selectedTargetInstanceIds = selectedIds(presentationData);
  const viewerOwnsDecision = Boolean(decision && (!decision.playerId || decision.playerId === viewerPlayerId));
  const flashStage = battle?.stage === "flash1" || battle?.stage === "flash2" ? battle.stage : null;
  const flashPriorityPlayerId = battle?.flash?.priorityPlayerId || null;

  return {
    burst: {
      active: Boolean(burst),
      viewerOwnsWindow: Boolean(burst && burst.playerId === viewerPlayerId),
      event: burst?.event || null,
      amount: Number(burst?.amount || 0),
      cause: burst?.cause || null,
      actions: actionsOfType(actions, BURST_ACTION_TYPES)
    },
    flash: {
      active: Boolean(flashStage),
      stage: flashStage,
      label: flashStage === "flash1" ? "Flash Timing 1" : flashStage === "flash2" ? "Flash Timing 2" : null,
      priorityPlayerId: flashPriorityPlayerId,
      viewerHasPriority: Boolean(flashStage && viewerPlayerId && flashPriorityPlayerId === viewerPlayerId),
      actions: actionsOfType(actions, FLASH_ACTION_TYPES)
    },
    effect: {
      active: Boolean(decision),
      id: decision?.id || null,
      kind: decision?.kind || null,
      playerId: decision?.playerId || null,
      viewerOwnsDecision,
      title: decisionTitle(decision),
      instruction: decisionInstruction(decision)
    },
    targetSelection: {
      active: Boolean(decision && viewerOwnsDecision && TARGET_KINDS.has(decision.kind)),
      kind: decision?.kind || null,
      minimum: Number(decision?.minimum || 0),
      maximum: Number(decision?.maximum || 0),
      allowZero: Boolean(decision?.allowZero),
      candidateInstanceIds: arrayOrEmpty(decision?.candidates).map((candidate) => candidate?.instanceId).filter(Boolean),
      selectedTargetInstanceIds,
      selectedCount: selectedTargetInstanceIds.length,
      title: decisionTitle(decision),
      instruction: decisionInstruction(decision)
    },
    choice: {
      active: Boolean(decision && viewerOwnsDecision && CHOICE_KINDS.has(decision.kind)),
      kind: decision?.kind || null,
      title: decisionTitle(decision),
      instruction: decisionInstruction(decision),
      options: arrayOrEmpty(decision?.options).map((option) => ({ id: option?.id || null, label: safeText(option?.label, "Option") })),
      candidates: arrayOrEmpty(decision?.candidates),
      totalCores: decision?.totalCores == null ? null : Number(decision.totalCores),
      actions: actions.filter((action) => action?.type === "RESOLVE_EFFECT_DECISION" && !action?.disabled).map(safeAction)
    }
  };
}

export default createEffectResolutionPresentation;
