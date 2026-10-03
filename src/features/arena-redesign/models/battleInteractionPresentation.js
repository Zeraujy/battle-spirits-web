function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

function fieldCards(player) {
  const field = player?.zones?.field || {};
  return [
    ...arrayOrEmpty(field.spirits),
    ...arrayOrEmpty(field.nexuses),
    ...arrayOrEmpty(field.other)
  ];
}

function findVisibleCard(viewModel, instanceId) {
  if (!instanceId) return null;

  for (const [side, player] of [["player", viewModel?.player], ["opponent", viewModel?.opponent]]) {
    const physical = fieldCards(player).find((card) => card?.instanceId === instanceId);
    if (physical) {
      return {
        side,
        playerId: player?.id || null,
        physical
      };
    }
  }

  return null;
}

export function getBattleStageLabel(stage) {
  const labels = {
    attack: "Attack declared",
    attackDeclared: "Attack declared",
    ultimateTrigger: "Attack trigger",
    flash1: "Flash timing",
    block: "Choose blocker",
    flash2: "Flash timing",
    resolve: "Battle resolution"
  };

  return labels[stage] || (stage ? String(stage) : "Battle");
}

export function createBattleInteractionPresentation(viewModel) {
  const battle = viewModel?.battle || null;
  if (!battle?.attackerInstanceId) return null;

  const attacker = findVisibleCard(viewModel, battle.attackerInstanceId);
  const blocker = findVisibleCard(viewModel, battle.blockerInstanceId);
  const viewerPlayerId = viewModel?.viewer?.playerId || null;
  const defenderPlayerId = battle.defenderPlayerId || null;
  const priorityPlayerId = battle.flash?.priorityPlayerId || null;

  return {
    active: true,
    stage: battle.stage || null,
    stageLabel: getBattleStageLabel(battle.stage),
    attacker,
    blocker,
    directAttack: !battle.blockerInstanceId,
    attackerPlayerId: battle.attackerPlayerId || attacker?.playerId || null,
    defenderPlayerId,
    priorityPlayerId,
    viewerHasPriority: Boolean(priorityPlayerId && viewerPlayerId && priorityPlayerId === viewerPlayerId),
    viewerIsDefender: Boolean(defenderPlayerId && viewerPlayerId && defenderPlayerId === viewerPlayerId)
  };
}

export default createBattleInteractionPresentation;
