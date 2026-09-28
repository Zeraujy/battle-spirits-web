import { getBraveAttachment } from "../selectors.js";
import { dispatchEffectEvent } from "./triggerDispatcher.js";

export function dispatchBraveInheritedEvent(match, { event, playerId, hostInstanceId, context = {} }, cardIndex) {
  const brave = getBraveAttachment(match, hostInstanceId);
  if (!brave) return { match, triggered: 0, automatic: 0, manualResolutionNeeded: false, notes: [] };
  return dispatchEffectEvent(match, {
    event,
    sourcePlayerId: playerId,
    sourceInstanceId: brave.instanceId,
    context: { ...context, isCombined: true, combinedHostInstanceId: hostInstanceId, inheritedFromBrave: true }
  }, cardIndex);
}
