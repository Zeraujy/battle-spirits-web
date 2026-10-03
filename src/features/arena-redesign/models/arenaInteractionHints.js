const HAND_ACTION_TYPES = new Set([
  "SUMMON",
  "DEPLOY_NEXUS",
  "USE_MAGIC",
  "USE_HIGH_SPEED",
  "SET_BURST",
  "SET_MIRAGE"
]);

const FIELD_ACTION_TYPES = new Set([
  "ACTIVATE_FIELD_FLASH",
  "DECLARE_ATTACK",
  "DECLARE_BLOCK",
  "COMBINE_BRAVE",
  "EXCHANGE_BRAVE",
  "SEPARATE_BRAVE",
  "MOVE_CORE"
]);

const TARGET_DECISION_KINDS = new Set([
  "selectTarget",
  "selectMultipleTargets",
  "selectTrashTarget",
  "chooseCardsFromHand",
  "chooseOrder",
  "chooseCoreDistribution"
]);

function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.length))];
}

function actionInstanceIds(action) {
  const ids = [
    action?.instanceId,
    action?.braveInstanceId,
    action?.hostInstanceId,
    action?.move?.to?.instanceId,
    action?.move?.from?.instanceId
  ];
  return uniqueStrings(ids);
}

function buildActionTypesByInstanceId(actions) {
  const map = {};
  for (const action of actions) {
    for (const instanceId of actionInstanceIds(action)) {
      if (!map[instanceId]) map[instanceId] = [];
      if (action.type && !map[instanceId].includes(action.type)) {
        map[instanceId].push(action.type);
      }
    }
  }
  return map;
}

function buildActionLabelsByInstanceId(actions) {
  const map = {};
  for (const action of actions) {
    if (!action.label) continue;
    for (const instanceId of actionInstanceIds(action)) {
      if (!map[instanceId]) map[instanceId] = [];
      if (!map[instanceId].includes(action.label)) map[instanceId].push(action.label);
    }
  }
  return map;
}

export function createArenaInteractionHints({
  actions = [],
  pendingEffectDecision = null,
  viewerPlayerId = null
} = {}) {
  const list = arrayOrEmpty(actions).filter((action) => !action?.disabled);
  const actionTypesByInstanceId = buildActionTypesByInstanceId(list);
  const actionLabelsByInstanceId = buildActionLabelsByInstanceId(list);

  const playableHandInstanceIds = uniqueStrings(
    list
      .filter((action) => HAND_ACTION_TYPES.has(action?.type))
      .flatMap(actionInstanceIds)
  );

  const actionableFieldInstanceIds = uniqueStrings(
    list
      .filter((action) => FIELD_ACTION_TYPES.has(action?.type))
      .flatMap(actionInstanceIds)
  );

  const pending = pendingEffectDecision && typeof pendingEffectDecision === "object"
    ? pendingEffectDecision
    : null;
  const viewerOwnsDecision = Boolean(
    pending && (!pending.playerId || !viewerPlayerId || pending.playerId === viewerPlayerId)
  );
  const targetingActive = Boolean(
    viewerOwnsDecision && TARGET_DECISION_KINDS.has(String(pending?.kind || ""))
  );
  const targetableInstanceIds = targetingActive
    ? uniqueStrings(arrayOrEmpty(pending?.candidates).map((candidate) => candidate?.instanceId))
    : [];

  return {
    playableHandInstanceIds,
    actionableFieldInstanceIds,
    targetableInstanceIds,
    actionTypesByInstanceId,
    actionLabelsByInstanceId,
    targeting: {
      active: targetingActive,
      kind: targetingActive ? pending.kind : null,
      minimum: targetingActive ? Number(pending.minimum ?? 1) : 0,
      maximum: targetingActive ? Number(pending.maximum ?? 1) : 0,
      allowZero: targetingActive ? Boolean(pending.allowZero) : false,
      title: targetingActive ? (pending.titlePT || pending.titleEN || null) : null,
      instruction: targetingActive ? (pending.instructionPT || pending.instructionEN || null) : null
    }
  };
}

export default createArenaInteractionHints;
