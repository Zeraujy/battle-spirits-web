import {
  ARENA_ACTION_CATEGORY_VALUES,
  ARENA_BATTLE_STAGE_VALUES,
  ARENA_CONNECTION_STATE_VALUES,
  ARENA_PHASE_VALUES,
  ARENA_ZONE_VALUES
} from "./constants.js";

function issue(path, message) {
  return { path, message };
}

export function validateArenaPresentationContract(contract) {
  const issues = [];
  if (!contract || typeof contract !== "object") {
    return { ok: false, issues: [issue("$", "Arena presentation contract must be an object.")] };
  }

  if (contract.version !== 1) issues.push(issue("version", "Unsupported Arena presentation contract version."));
  if (!contract.player?.id) issues.push(issue("player.id", "Player id is required."));
  if (!contract.opponent?.id) issues.push(issue("opponent.id", "Opponent id is required."));
  if (contract.player?.id && contract.player.id === contract.opponent?.id) {
    issues.push(issue("opponent.id", "Player and opponent ids must be different."));
  }
  if (!ARENA_PHASE_VALUES.includes(contract.timing?.phase)) {
    issues.push(issue("timing.phase", "Unknown Battle Spirits phase."));
  }
  if (contract.timing?.battleStage != null && !ARENA_BATTLE_STAGE_VALUES.includes(contract.timing.battleStage)) {
    issues.push(issue("timing.battleStage", "Unknown battle stage."));
  }

  for (const [index, zone] of (contract.zones || []).entries()) {
    if (!ARENA_ZONE_VALUES.includes(zone?.zone)) issues.push(issue(`zones[${index}].zone`, "Unknown Arena zone."));
    if (zone?.playerId == null) issues.push(issue(`zones[${index}].playerId`, "Zone player id is required."));
  }

  for (const [index, action] of (contract.availableActions || []).entries()) {
    if (!action?.type) issues.push(issue(`availableActions[${index}].type`, "Action type is required."));
    if (!ARENA_ACTION_CATEGORY_VALUES.includes(action?.category)) issues.push(issue(`availableActions[${index}].category`, "Unknown action category."));
  }

  for (const [name, player] of [["player", contract.player], ["opponent", contract.opponent]]) {
    if (!ARENA_CONNECTION_STATE_VALUES.includes(player?.connectionState)) {
      issues.push(issue(`${name}.connectionState`, "Unknown connection state."));
    }
  }

  return { ok: issues.length === 0, issues };
}
