import { applyGameAction } from "./reducer.js";
import { getDatabaseCard } from "./selectors.js";
import { legalAttackers, legalBlockers } from "./battle.js";
import { getLegalBraveHosts } from "./brave.js";
import { getTriggerCounterCards } from "./specialRules.js";

function actionKey(action) {
  return JSON.stringify(action);
}

function pushUnique(list, seen, action, label = null, category = null) {
  const key = actionKey(action);
  if (seen.has(key)) return;
  seen.add(key);
  list.push({ action, label, category });
}

function candidateActions(match, playerId, cardIndex) {
  const list = [];
  const seen = new Set();
  const player = match.players?.[playerId];
  if (!player || match.winnerId) return list;

  if (match.pendingEffectDecision) {
    const pending = match.pendingEffectDecision;
    if (pending.playerId !== playerId) return list;

    if (pending.kind === "chooseOption") {
      for (const [index, option] of (pending.action?.options || []).entries()) {
        const optionId = String(option.id ?? index);
        pushUnique(
          list,
          seen,
          { type: "RESOLVE_EFFECT_DECISION", payload: { optionId } },
          option.labelPT || option.labelEN || optionId,
          "decision"
        );
      }
      return list;
    }

    const ids = (pending.candidates || []).map((candidate) => String(candidate.instanceId));
    const minimum = Math.max(0, Number(pending.minimum || 0));
    const maximum = Math.max(minimum, Math.min(ids.length, Number(pending.maximum || 1)));
    const selections = [];
    const limit = 64;

    function visit(start, size, selected) {
      if (selections.length >= limit) return;
      if (selected.length === size) {
        selections.push([...selected]);
        return;
      }
      for (let i = start; i < ids.length && selections.length < limit; i += 1) {
        selected.push(ids[i]);
        visit(i + 1, size, selected);
        selected.pop();
      }
    }

    for (let size = minimum; size <= maximum && selections.length < limit; size += 1) {
      visit(0, size, []);
    }

    for (const selectedInstanceIds of selections) {
      pushUnique(
        list,
        seen,
        { type: "RESOLVE_EFFECT_DECISION", payload: { selectedInstanceIds } },
        `Escolher ${selectedInstanceIds.length} alvo(s)`,
        "decision"
      );
    }
    return list;
  }

  if (match.burstOpportunity) {
    if (match.burstOpportunity.playerId === playerId) {
      pushUnique(list, seen, { type: "ACTIVATE_BURST" }, "Ativar Burst", "burst");
      pushUnique(list, seen, { type: "PASS_BURST" }, "Passar Burst", "burst");
    }
    return list;
  }

  if (match.pendingManualPlay) {
    if (match.pendingManualPlay.playerId === playerId) {
      pushUnique(list, seen, { type: "CONFIRM_MANUAL_PLAY" }, "Confirmar jogada", "pending");
      pushUnique(list, seen, { type: "CANCEL_MANUAL_PLAY" }, "Cancelar jogada", "pending");
    }
    return list;
  }

  if (match.pendingManualCost) {
    if (match.pendingManualCost.playerId === playerId) {
      pushUnique(list, seen, { type: "CONFIRM_MANUAL_COST" }, "Confirmar custo", "pending");
      pushUnique(list, seen, { type: "CANCEL_MANUAL_COST" }, "Cancelar custo", "pending");
    }
    return list;
  }

  if (match.battle?.stage === "ultimateTrigger") {
    if (match.battle.attackerPlayerId === playerId || match.battle.defenderPlayerId === playerId) {
      pushUnique(list, seen, { type: "RESOLVE_ULTIMATE_TRIGGER" }, "Resolver Ultimate Trigger", "battle");
      pushUnique(list, seen, { type: "PASS_TRIGGER_COUNTER" }, "Passar Trigger Counter", "battle");
      for (const physical of getTriggerCounterCards(match, playerId, cardIndex) || []) {
        pushUnique(list, seen, { type: "USE_TRIGGER_COUNTER", instanceId: physical.instanceId }, "Usar Trigger Counter", "battle");
      }
    }
    return list;
  }

  if (match.battle) {
    const battle = match.battle;
    if (["flash1", "flash2"].includes(battle.stage) && battle.flash?.priorityPlayerId === playerId) {
      pushUnique(list, seen, { type: "PASS_FLASH" }, "Passar Flash", "battle");
      for (const physical of player.hand || []) {
        const card = getDatabaseCard(cardIndex, physical);
        if (card?.cardType === "magic") {
          pushUnique(list, seen, { type: "USE_MAGIC", instanceId: physical.instanceId, options: { mode: "flash" } }, card.namePT || card.nameEN || card.id, "magic");
        }
      }
    }
    if (battle.stage === "block" && battle.defenderPlayerId === playerId) {
      for (const physical of legalBlockers(match, cardIndex)) {
        pushUnique(list, seen, { type: "DECLARE_BLOCK", instanceId: physical.instanceId }, "Bloquear", "battle");
      }
      pushUnique(list, seen, { type: "DECLINE_BLOCK" }, "Não bloquear", "battle");
    }
    if (battle.stage === "resolve" && battle.attackerPlayerId === playerId) {
      pushUnique(list, seen, { type: "RESOLVE_BATTLE" }, "Resolver batalha", "battle");
    }
    return list;
  }

  if (playerId === match.activePlayerId) {
    pushUnique(list, seen, { type: "ADVANCE_PHASE" }, "Avançar fase", "phase");
  }

  if (match.turnNumber === 1 && match.phase === "start" && !player.mulliganUsed) {
    pushUnique(list, seen, { type: "MULLIGAN" }, "Mulligan", "setup");
  }

  if (match.phase === "main" && match.activePlayerId === playerId) {
    for (const physical of player.hand || []) {
      const card = getDatabaseCard(cardIndex, physical);
      if (["spirit", "ultimate", "brave"].includes(card?.cardType)) {
        pushUnique(list, seen, { type: "SUMMON", instanceId: physical.instanceId }, card.namePT || card.nameEN || card.id, "summon");
        if (card.cardType === "brave") {
          for (const host of player.field?.spirits || []) {
            pushUnique(list, seen, { type: "SUMMON", instanceId: physical.instanceId, options: { directCombineHostInstanceId: host.instanceId } }, `Direct Combine: ${card.namePT || card.nameEN || card.id}`, "brave");
          }
        }
      }
      if (card?.cardType === "nexus") {
        pushUnique(list, seen, { type: "DEPLOY_NEXUS", instanceId: physical.instanceId }, card.namePT || card.nameEN || card.id, "nexus");
      }
      if (card?.cardType === "magic") {
        pushUnique(list, seen, { type: "USE_MAGIC", instanceId: physical.instanceId, options: { mode: "main" } }, card.namePT || card.nameEN || card.id, "magic");
      }
      pushUnique(list, seen, { type: "SET_BURST", instanceId: physical.instanceId }, "Set Burst", "burst");
      pushUnique(list, seen, { type: "SET_MIRAGE", instanceId: physical.instanceId }, "Set Mirage", "mirage");
    }

    for (const brave of player.field?.other || []) {
      const db = getDatabaseCard(cardIndex, brave);
      if (db?.cardType !== "brave") continue;
      const hosts = getLegalBraveHosts(match, playerId, brave.instanceId, cardIndex);
      if (brave.combinedWith) {
        pushUnique(list, seen, { type: "SEPARATE_BRAVE", braveInstanceId: brave.instanceId }, "Separar Brave", "brave");
        for (const host of hosts) {
          pushUnique(list, seen, { type: "EXCHANGE_BRAVE", braveInstanceId: brave.instanceId, hostInstanceId: host.physical.instanceId }, "Trocar Brave", "brave");
        }
      } else {
        for (const host of hosts) {
          pushUnique(list, seen, { type: "COMBINE_BRAVE", braveInstanceId: brave.instanceId, hostInstanceId: host.physical.instanceId }, "Combinar Brave", "brave");
        }
      }
    }
  }

  if (match.phase === "attack" && match.activePlayerId === playerId) {
    for (const physical of legalAttackers(match, playerId, cardIndex)) {
      pushUnique(list, seen, { type: "DECLARE_ATTACK", instanceId: physical.instanceId }, "Atacar", "battle");
    }
  }

  return list;
}

export function getLegalActions(match, playerId, cardIndex) {
  const candidates = candidateActions(match, playerId, cardIndex);
  const legal = [];
  for (const candidate of candidates) {
    const result = applyGameAction(match, candidate.action, playerId, cardIndex);
    if (result.ok) {
      legal.push({
        ...candidate,
        type: candidate.action.type,
        actorId: playerId
      });
    }
  }
  return legal;
}

export function canPerformAction(match, playerId, action, cardIndex) {
  const result = applyGameAction(match, action, playerId, cardIndex);
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
