import { uid } from "../utils.js";

function triggerLabel(dispatch = {}, cardIndex) {
  const card = dispatch.sourceCard || (dispatch.sourceCardId ? cardIndex?.get?.(dispatch.sourceCardId) : null);
  const name = card?.namePT || card?.nameEN || card?.id || dispatch.sourceCardId || dispatch.sourceInstanceId || "Effect";
  return `${name} — ${dispatch.event || "trigger"}`;
}

function normalizeDispatch(dispatch = {}, index = 0, cardIndex) {
  const controllerId = dispatch.sourcePlayerId || dispatch.context?.sourcePlayerId || null;
  return {
    id: `trigger-${index + 1}-${dispatch.sourceInstanceId || controllerId || "event"}`,
    controllerId,
    event: dispatch.event || null,
    sourceInstanceId: dispatch.sourceInstanceId || null,
    sourceCardId: dispatch.sourceCardId || dispatch.sourceCard?.id || dispatch.context?.sourceCard?.id || null,
    label: triggerLabel(dispatch, cardIndex),
    dispatch
  };
}

function controllerRank(controllerId, activePlayerId) {
  if (!controllerId) return 2;
  return controllerId === activePlayerId ? 0 : 1;
}

export function buildTriggerBatch(match, dispatches = [], cardIndex) {
  const triggers = dispatches.filter(Boolean).map((dispatch, index) => normalizeDispatch(dispatch, index, cardIndex));
  const controllerOrder = [...new Set(triggers.map((trigger) => trigger.controllerId))]
    .sort((a, b) => controllerRank(a, match?.activePlayerId) - controllerRank(b, match?.activePlayerId));
  const groups = controllerOrder.map((controllerId) => ({
    controllerId,
    triggerIds: triggers.filter((trigger) => trigger.controllerId === controllerId).map((trigger) => trigger.id)
  }));
  return {
    id: uid("trigger-batch"),
    event: triggers[0]?.event || null,
    activePlayerId: match?.activePlayerId || null,
    triggers,
    groups,
    resolvedGroups: [],
    createdTurn: Number(match?.turnNumber || 0),
    createdPhase: match?.phase || null
  };
}

export function nextAmbiguousTriggerGroup(batch) {
  if (!batch) return null;
  const resolved = new Set(batch.resolvedGroups || []);
  return (batch.groups || []).find((group) => !resolved.has(group.controllerId) && group.triggerIds.length > 1) || null;
}

export function triggerOrderDecision(batch, group) {
  if (!batch || !group || !group.controllerId) return null;
  const candidates = group.triggerIds.map((triggerId) => {
    const trigger = batch.triggers.find((entry) => entry.id === triggerId);
    return {
      triggerId,
      instanceId: triggerId,
      cardId: trigger?.sourceCardId || null,
      sourceInstanceId: trigger?.sourceInstanceId || null,
      event: trigger?.event || batch.event,
      labelPT: trigger?.label || triggerId,
      labelEN: trigger?.label || triggerId
    };
  });
  return {
    id: uid("effect-decision"),
    kind: "chooseTriggerOrder",
    playerId: group.controllerId,
    candidates,
    minimum: candidates.length,
    maximum: candidates.length,
    titlePT: "Ordem dos gatilhos",
    titleEN: "Trigger Order",
    instructionPT: "Organize os gatilhos simultâneos na ordem em que devem resolver.",
    instructionEN: "Arrange the simultaneous triggers in the order they should resolve."
  };
}

export function applyTriggerGroupOrder(batch, controllerId, orderedTriggerIds = []) {
  if (!batch) return batch;
  const group = (batch.groups || []).find((entry) => entry.controllerId === controllerId);
  if (!group) return batch;
  const allowed = group.triggerIds.map(String);
  const ordered = orderedTriggerIds.map(String);
  if (ordered.length !== allowed.length || new Set(ordered).size !== allowed.length || ordered.some((id) => !allowed.includes(id))) {
    return null;
  }
  const groups = (batch.groups || []).map((entry) => entry.controllerId === controllerId ? { ...entry, triggerIds: ordered } : entry);
  return { ...batch, groups, resolvedGroups: [...new Set([...(batch.resolvedGroups || []), controllerId])] };
}

export function resolveAutomaticTriggerGroups(batch) {
  if (!batch) return batch;
  const resolvedGroups = [...new Set([...(batch.resolvedGroups || []), ...(batch.groups || []).filter((group) => group.triggerIds.length <= 1).map((group) => group.controllerId)])];
  return { ...batch, resolvedGroups };
}

export function orderedTriggerDispatches(batch) {
  if (!batch) return [];
  const triggerMap = new Map((batch.triggers || []).map((trigger) => [trigger.id, trigger]));
  const ordered = [];
  for (const group of batch.groups || []) {
    for (const triggerId of group.triggerIds || []) {
      const trigger = triggerMap.get(triggerId);
      if (trigger?.dispatch) ordered.push(trigger.dispatch);
    }
  }
  return ordered;
}
