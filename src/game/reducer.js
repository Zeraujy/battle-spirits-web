import { advancePhase, mulligan } from "./turn.js";
import { summonFromHand, deployNexus } from "./summon.js";
import { moveCore } from "./cores.js";
import { combineBrave, separateBrave, exchangeBrave } from "./brave.js";
import { declareAttack, passFlash, declareBlock, declineBlock, resolveBattle, registerFlashUsed } from "./battle.js";
import { useMagic, setBurst, setMirage, activateBurst, manualAction } from "./effects.js";
import { beginManualPlay, confirmManualPlay, cancelManualPlay } from "./manualPlay.js";
import { beginManualCost, confirmManualCost, cancelManualCost } from "./manualCost.js";
import { resolveEffectDecision } from "./effectEngine/effectEngine.js";

export function applyGameAction(match, action, actorId, cardIndex) {
  if (!match || !action?.type) return { ok: false, error: "Ação inválida." };
  if (match.winnerId && action.type !== "MANUAL") return { ok: false, error: "A partida já terminou." };
  if (match.pendingManualPlay && !["MOVE_CORE","CONFIRM_MANUAL_PLAY","CANCEL_MANUAL_PLAY","MANUAL"].includes(action.type)) return { ok:false, error:"Conclua ou cancele a jogada pendente primeiro." };
  if (match.pendingManualCost && !["MOVE_CORE","CONFIRM_MANUAL_COST","CANCEL_MANUAL_COST"].includes(action.type)) return { ok:false, error:"Conclua ou cancele o pagamento pendente primeiro." };
  if (match.pendingEffectDecision && action.type !== "RESOLVE_EFFECT_DECISION") return { ok:false, error:"Resolva a decisão de efeito pendente antes de continuar." };

  switch (action.type) {
    case "ADVANCE_PHASE": return advancePhase(match, actorId);
    case "MULLIGAN": return mulligan(match, actorId);
    case "BEGIN_MANUAL_PLAY": return beginManualPlay(match, actorId, action.instanceId, cardIndex, action.options || {});
    case "BEGIN_MANUAL_COST": return beginManualCost(match, actorId, action.instanceId, cardIndex, action.options || {});
    case "CONFIRM_MANUAL_COST": return confirmManualCost(match, actorId, cardIndex);
    case "CANCEL_MANUAL_COST": return cancelManualCost(match, actorId);
    case "CONFIRM_MANUAL_PLAY": return confirmManualPlay(match, actorId, cardIndex);
    case "CANCEL_MANUAL_PLAY": return cancelManualPlay(match, actorId, cardIndex);
    case "SUMMON": return summonFromHand(match, actorId, action.instanceId, cardIndex, action.options || {});
    case "DEPLOY_NEXUS": return deployNexus(match, actorId, action.instanceId, cardIndex, action.options || {});
    case "MOVE_CORE": return moveCore(match, actorId, action.move, cardIndex);
    case "COMBINE_BRAVE": return combineBrave(match, actorId, action.braveInstanceId, action.hostInstanceId, cardIndex, action.options || {});
    case "SEPARATE_BRAVE": return separateBrave(match, actorId, action.braveInstanceId, cardIndex);
    case "EXCHANGE_BRAVE": return exchangeBrave(match, actorId, action.braveInstanceId, action.hostInstanceId, cardIndex, action.options || {});
    case "DECLARE_ATTACK": return declareAttack(match, actorId, action.instanceId, cardIndex);
    case "PASS_FLASH": return passFlash(match, actorId);
    case "FLASH_USED": return registerFlashUsed(match, actorId);
    case "DECLARE_BLOCK": return declareBlock(match, actorId, action.instanceId, cardIndex);
    case "DECLINE_BLOCK": return declineBlock(match, actorId);
    case "RESOLVE_BATTLE": return resolveBattle(match, actorId, cardIndex);
    case "USE_MAGIC": return useMagic(match, actorId, action.instanceId, cardIndex, action.options || {});
    case "SET_BURST": return setBurst(match, actorId, action.instanceId, cardIndex);
    case "SET_MIRAGE": return setMirage(match, actorId, action.instanceId, cardIndex, action.options || {});
    case "ACTIVATE_BURST": return activateBurst(match, actorId, cardIndex, action.options || {});
    case "RESOLVE_EFFECT_DECISION": return resolveEffectDecision(match, actorId, action.payload || {}, cardIndex);
    case "MANUAL": return manualAction(match, actorId, action.payload || {}, cardIndex);
    default: return { ok: false, error: `Ação desconhecida: ${action.type}` };
  }
}
