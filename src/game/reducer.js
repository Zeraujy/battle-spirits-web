import { advancePhase, mulligan } from "./turn.js";
import { summonFromHand, deployNexus } from "./summon.js";
import { moveCore } from "./cores.js";
import { combineBrave, separateBrave, exchangeBrave, enforceBraveConditions } from "./brave.js";
import { declareAttack, passFlash, declareBlock, declineBlock, resolveBattle, registerFlashUsed } from "./battle.js";
import { useMagic, setBurst, setMirage, activateBurst, manualAction } from "./effects.js";
import { beginManualPlay, confirmManualPlay, cancelManualPlay } from "./manualPlay.js";
import { beginManualCost, confirmManualCost, cancelManualCost } from "./manualCost.js";
import { resolveEffectDecision } from "./effectEngine/effectEngine.js";
import { finalizeUltimateTriggerAfterDecision, resolveUltimateTriggerStage } from "./specialRules.js";

function finishResult(result, cardIndex, actionType) {
  if (!result?.ok || !result.match) return result;

  let next = result.match;

  if (actionType === "RESOLVE_EFFECT_DECISION") {
    next = finalizeUltimateTriggerAfterDecision(next);
  }

  const braveCheck = enforceBraveConditions(next, cardIndex);
  next = braveCheck.match;

  return {
    ...result,
    match: next
  };
}

export function applyGameAction(match, action, actorId, cardIndex) {
  if (!match || !action?.type) return { ok: false, error: "Ação inválida." };
  if (match.winnerId && action.type !== "MANUAL") return { ok: false, error: "A partida já terminou." };
  if (match.pendingManualPlay && !["MOVE_CORE", "CONFIRM_MANUAL_PLAY", "CANCEL_MANUAL_PLAY", "MANUAL"].includes(action.type)) {
    return { ok: false, error: "Conclua ou cancele a jogada pendente primeiro." };
  }
  if (match.pendingManualCost && !["MOVE_CORE", "CONFIRM_MANUAL_COST", "CANCEL_MANUAL_COST"].includes(action.type)) {
    return { ok: false, error: "Conclua ou cancele o pagamento pendente primeiro." };
  }
  if (match.pendingEffectDecision && action.type !== "RESOLVE_EFFECT_DECISION") {
    return { ok: false, error: "Resolva a decisão de efeito pendente antes de continuar." };
  }
  if (
    match.battle?.stage === "ultimateTrigger" &&
    !match.pendingEffectDecision &&
    !["RESOLVE_ULTIMATE_TRIGGER", "MANUAL"].includes(action.type)
  ) {
    return { ok: false, error: "Resolva o Ultimate Trigger antes de continuar a batalha." };
  }

  let result;

  switch (action.type) {
    case "ADVANCE_PHASE": result = advancePhase(match, actorId); break;
    case "MULLIGAN": result = mulligan(match, actorId); break;
    case "BEGIN_MANUAL_PLAY": result = beginManualPlay(match, actorId, action.instanceId, cardIndex, action.options || {}); break;
    case "BEGIN_MANUAL_COST": result = beginManualCost(match, actorId, action.instanceId, cardIndex, action.options || {}); break;
    case "CONFIRM_MANUAL_COST": result = confirmManualCost(match, actorId, cardIndex); break;
    case "CANCEL_MANUAL_COST": result = cancelManualCost(match, actorId); break;
    case "CONFIRM_MANUAL_PLAY": result = confirmManualPlay(match, actorId, cardIndex); break;
    case "CANCEL_MANUAL_PLAY": result = cancelManualPlay(match, actorId, cardIndex); break;
    case "SUMMON": result = summonFromHand(match, actorId, action.instanceId, cardIndex, action.options || {}); break;
    case "DEPLOY_NEXUS": result = deployNexus(match, actorId, action.instanceId, cardIndex, action.options || {}); break;
    case "MOVE_CORE": result = moveCore(match, actorId, action.move, cardIndex); break;
    case "COMBINE_BRAVE": result = combineBrave(match, actorId, action.braveInstanceId, action.hostInstanceId, cardIndex, action.options || {}); break;
    case "SEPARATE_BRAVE": result = separateBrave(match, actorId, action.braveInstanceId, cardIndex, action.options || {}); break;
    case "EXCHANGE_BRAVE": result = exchangeBrave(match, actorId, action.braveInstanceId, action.hostInstanceId, cardIndex, action.options || {}); break;
    case "DECLARE_ATTACK": result = declareAttack(match, actorId, action.instanceId, cardIndex); break;
    case "RESOLVE_ULTIMATE_TRIGGER": result = resolveUltimateTriggerStage(match, actorId, cardIndex); break;
    case "PASS_FLASH": result = passFlash(match, actorId); break;
    case "FLASH_USED": result = registerFlashUsed(match, actorId); break;
    case "DECLARE_BLOCK": result = declareBlock(match, actorId, action.instanceId, cardIndex); break;
    case "DECLINE_BLOCK": result = declineBlock(match, actorId, cardIndex); break;
    case "RESOLVE_BATTLE": result = resolveBattle(match, actorId, cardIndex); break;
    case "USE_MAGIC": result = useMagic(match, actorId, action.instanceId, cardIndex, action.options || {}); break;
    case "SET_BURST": result = setBurst(match, actorId, action.instanceId, cardIndex); break;
    case "SET_MIRAGE": result = setMirage(match, actorId, action.instanceId, cardIndex, action.options || {}); break;
    case "ACTIVATE_BURST": result = activateBurst(match, actorId, cardIndex, action.options || {}); break;
    case "RESOLVE_EFFECT_DECISION": result = resolveEffectDecision(match, actorId, action.payload || {}, cardIndex); break;
    case "MANUAL": result = manualAction(match, actorId, action.payload || {}, cardIndex); break;
    default: return { ok: false, error: `Ação desconhecida: ${action.type}` };
  }

  return finishResult(result, cardIndex, action.type);
}
