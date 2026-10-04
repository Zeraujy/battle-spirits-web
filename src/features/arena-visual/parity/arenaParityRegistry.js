export const ARENA_PARITY_STATUS = Object.freeze({
  LEGACY_ONLY: "LEGACY_ONLY",
  BRIDGED: "BRIDGED",
  VISUALIZED: "VISUALIZED",
  INTERACTIVE: "INTERACTIVE",
  QA_PASSED: "QA_PASSED"
});

export const ARENA_PARITY_REGISTRY = Object.freeze([
  { id: "match-lifecycle", label: "Match Lifecycle", phase: 1, status: ARENA_PARITY_STATUS.QA_PASSED },
  { id: "end-game-screen", label: "End Game Screen", phase: 1, status: ARENA_PARITY_STATUS.QA_PASSED },
  { id: "exit-routing", label: "Exit Routing", phase: 1, status: ARENA_PARITY_STATUS.QA_PASSED },
  { id: "surrender", label: "Surrender", phase: 1, status: ARENA_PARITY_STATUS.QA_PASSED },
  { id: "ultimate-trigger", label: "Ultimate Trigger", phase: 2, status: ARENA_PARITY_STATUS.QA_PASSED },
  { id: "trigger-counter", label: "Trigger Counter", phase: 2, status: ARENA_PARITY_STATUS.QA_PASSED },
  { id: "critical-hit", label: "Critical Hit", phase: 2, status: ARENA_PARITY_STATUS.QA_PASSED },
  { id: "xu-trigger", label: "XU Trigger", phase: 2, status: ARENA_PARITY_STATUS.QA_PASSED },
  { id: "effect-decisions", label: "Effect Decisions", phase: 3, status: ARENA_PARITY_STATUS.QA_PASSED },
  { id: "target-selection", label: "Target Selection", phase: 3, status: ARENA_PARITY_STATUS.QA_PASSED },
  { id: "multiple-target-selection", label: "Multiple Target Selection", phase: 3, status: ARENA_PARITY_STATUS.QA_PASSED },
  { id: "option-decisions", label: "Option Decisions", phase: 3, status: ARENA_PARITY_STATUS.QA_PASSED },
  { id: "effect-order", label: "Effect Order", phase: 3, status: ARENA_PARITY_STATUS.QA_PASSED },
  { id: "trigger-order", label: "Trigger Order", phase: 3, status: ARENA_PARITY_STATUS.QA_PASSED },
  { id: "core-distribution", label: "Core Distribution", phase: 3, status: ARENA_PARITY_STATUS.QA_PASSED },

  { id: "complete-battle-timing", label: "Complete Battle Timing", phase: 4, status: ARENA_PARITY_STATUS.QA_PASSED },
  { id: "magic-high-speed-field-flash", label: "Magic / High Speed / Field Flash", phase: 5, status: ARENA_PARITY_STATUS.QA_PASSED },
  { id: "brave-complete", label: "Complete Brave Lifecycle", phase: 5, status: ARENA_PARITY_STATUS.QA_PASSED },
  { id: "burst-complete", label: "Complete Burst Lifecycle", phase: 5, status: ARENA_PARITY_STATUS.QA_PASSED },
  { id: "mirage", label: "Mirage", phase: 5, status: ARENA_PARITY_STATUS.QA_PASSED },
  { id: "opening-setup", label: "Opening Setup", phase: 6, status: ARENA_PARITY_STATUS.QA_PASSED },
  { id: "mulligan", label: "Mulligan", phase: 6, status: ARENA_PARITY_STATUS.QA_PASSED },
  { id: "turn-authority-status", label: "Turn / Authority Status", phase: 6, status: ARENA_PARITY_STATUS.QA_PASSED },
  { id: "online-reconnect", label: "Online Reconnect", phase: 7, status: ARENA_PARITY_STATUS.QA_PASSED },
  { id: "turn-clock", label: "Turn Clock", phase: 7, status: ARENA_PARITY_STATUS.QA_PASSED },
  { id: "legacy-feedback-layers", label: "Legacy Feedback Layers", phase: 8, status: ARENA_PARITY_STATUS.QA_PASSED },
  { id: "manual-tools", label: "Manual Tools", phase: 9, status: ARENA_PARITY_STATUS.QA_PASSED },
  { id: "post-match-social", label: "Post Match Social", phase: 10, status: ARENA_PARITY_STATUS.QA_PASSED },
  { id: "rules-state-coverage", label: "Rules State Coverage", phase: 11, status: ARENA_PARITY_STATUS.QA_PASSED },
  { id: "scenario-matrix", label: "Legacy vs New Scenario Matrix", phase: 12, status: ARENA_PARITY_STATUS.LEGACY_ONLY },
  { id: "production-release-qa", label: "Production Release QA", phase: 13, status: ARENA_PARITY_STATUS.LEGACY_ONLY },
  { id: "legacy-retirement", label: "Legacy Arena Retirement", phase: 14, status: ARENA_PARITY_STATUS.LEGACY_ONLY }
]);

export function getArenaParityEntry(id) {
  return ARENA_PARITY_REGISTRY.find((entry) => entry.id === id) || null;
}

export function getArenaParityPhase(phase) {
  return ARENA_PARITY_REGISTRY.filter((entry) => entry.phase === Number(phase));
}
