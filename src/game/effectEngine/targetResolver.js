// Compatibility facade. New code should import targetingEngine.js directly.
export {
  TargetOwner,
  TargetState,
  TargetZone,
  collectFieldTargets,
  collectTargets,
  collectTrashTargets,
  normalizeTargetSelector,
  resolveActionTargets,
  targetMatchesSelector
} from "./targetingEngine.js";
