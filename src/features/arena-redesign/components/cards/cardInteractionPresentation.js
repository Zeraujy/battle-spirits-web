function includesInstance(collection, instanceId) {
  if (!instanceId) return false;
  if (collection instanceof Set) return collection.has(instanceId);
  if (Array.isArray(collection)) return collection.includes(instanceId);
  return false;
}

function labelsFor(interaction, instanceId) {
  const labels = interaction?.actionLabelsByInstanceId?.[instanceId];
  return Array.isArray(labels) ? labels : [];
}

function typesFor(interaction, instanceId) {
  const types = interaction?.actionTypesByInstanceId?.[instanceId];
  return Array.isArray(types) ? types : [];
}

export function getHandCardInteractionState(instanceId, interaction = null) {
  const playableFilter = interaction?.playableHandInstanceIds;
  const hasPlayableFilter = playableFilter instanceof Set || Array.isArray(playableFilter);
  const targetingActive = Boolean(interaction?.targeting?.active || interaction?.targetingActive);
  const targetable = includesInstance(
    interaction?.targetableInstanceIds || interaction?.targetableHandInstanceIds,
    instanceId
  );
  const selectedTarget = includesInstance(interaction?.selectedTargetInstanceIds, instanceId);
  const playable = !hasPlayableFilter || includesInstance(playableFilter, instanceId);
  const selected = interaction?.selectedHandInstanceId === instanceId;
  const actionTypes = typesFor(interaction, instanceId);
  const actionLabels = labelsFor(interaction, instanceId);
  const unavailable = targetingActive
    ? !targetable && !selectedTarget
    : hasPlayableFilter && !playable;

  return {
    playable,
    unavailable,
    selected,
    targetingActive,
    targetable,
    selectedTarget,
    actionTypes,
    actionLabels,
    primaryActionType: targetable ? "TARGET" : actionTypes[0] || null,
    primaryActionLabel: targetable ? "Target" : actionLabels[0] || null
  };
}

export function getFieldCardInteractionState(instanceId, interaction = null) {
  const targetingActive = Boolean(interaction?.targeting?.active || interaction?.targetingActive);
  const targetable = includesInstance(
    interaction?.targetableInstanceIds || interaction?.targetableFieldInstanceIds,
    instanceId
  );
  const selectedTarget = includesInstance(interaction?.selectedTargetInstanceIds, instanceId);
  const actionable = includesInstance(
    interaction?.actionableFieldInstanceIds || interaction?.fieldActionableInstanceIds,
    instanceId
  );
  const explicitlyUnavailable = includesInstance(interaction?.disabledFieldInstanceIds, instanceId);
  const unavailable = explicitlyUnavailable || (targetingActive && !targetable && !selectedTarget);
  const actionTypes = typesFor(interaction, instanceId);
  const actionLabels = labelsFor(interaction, instanceId);

  return {
    targetingActive,
    targetable,
    selectedTarget,
    actionable,
    unavailable,
    actionTypes,
    actionLabels,
    primaryActionType: targetable ? "TARGET" : actionTypes[0] || null,
    primaryActionLabel: targetable ? "Target" : actionLabels[0] || null
  };
}

export function getInteractionFeedbackLabel(state) {
  if (!state) return null;
  if (state.selectedTarget) return "Selected";
  if (state.targetable) return "Target";
  if (state.unavailable) return "Unavailable";
  if (state.primaryActionLabel) return state.primaryActionLabel;
  if (state.actionable) return "Available";
  if (state.playable) return state.primaryActionType || "Playable";
  return null;
}
