import { calculateReduction } from "./cost.js";
import { canUseMagic, useMagic, setMirage } from "./effects.js";
import { findPhysicalCard, getDatabaseCard } from "./selectors.js";
import { appendLog } from "./utils.js";

function hasMirage(card) {
  return Boolean(card?.mirage) || (card?.effects || []).some((e) => e.type === "mirage" || e.timing === "mirage" || String(e.title?.en || "").toLowerCase().includes("mirage"));
}

export function beginManualCost(match, playerId, instanceId, cardIndex, options = {}) {
  if (match.pendingManualPlay || match.pendingManualCost) return { ok:false, error:"Conclua ou cancele o pagamento pendente primeiro." };
  const kind = options.kind || "magic";
  const ctx = findPhysicalCard(match, instanceId);
  if (!ctx || ctx.playerId !== playerId || ctx.zone !== "hand") return { ok:false, error:"Carta não encontrada na mão." };
  const card = getDatabaseCard(cardIndex, ctx.card);
  let costCard = card;
  if (kind === "magic") {
    const mode = options.mode || "main";
    if (!canUseMagic(match, playerId, instanceId, cardIndex, mode)) return { ok:false, error:"Esta Magic não pode ser usada nesse timing." };
  } else if (kind === "mirage") {
    if (match.phase !== "main" || match.activePlayerId !== playerId || match.battle) return { ok:false, error:"Mirage é setada no seu Main Step." };
    if (match.players[playerId].turnFlags?.mirageSet) return { ok:false, error:"Você só pode realizar a ação de Set Mirage uma vez por turno." };
    if (!hasMirage(card)) return { ok:false, error:"A carta não possui Mirage identificada no database." };
    costCard = { ...card, cost:Number(card.mirage?.cost ?? card.cost ?? 0), reduction:card.mirage?.reduction ?? card.reduction ?? [] };
  } else return { ok:false, error:"Tipo de pagamento manual desconhecido." };
  const cost = calculateReduction(match, playerId, costCard, cardIndex);
  const pendingManualCost = {
    playerId, instanceId, cardId:card.id, kind,
    mode:options.mode || "main",
    payableCost:cost.payable, printedCost:cost.printed, reductionApplied:cost.applied,
    paidRegular:0, paidSoul:false
  };
  const next = appendLog({ ...match, pendingManualCost }, `${match.players[playerId].name} iniciou pagamento manual de ${card.namePT || card.nameEN || card.id}.`, "action");
  return { ok:true, match:next };
}

export function confirmManualCost(match, playerId, cardIndex) {
  const pending = match.pendingManualCost;
  if (!pending || pending.playerId !== playerId) return { ok:false, error:"Não existe pagamento pendente para este jogador." };
  const paid = Number(pending.paidRegular||0) + (pending.paidSoul ? 1 : 0);
  if (paid !== Number(pending.payableCost||0)) return { ok:false, error:`Pagamento incompleto: ${paid}/${pending.payableCost} Cores no Core Trash.` };
  const base = { ...match, pendingManualCost:null };
  if (pending.kind === "magic") return useMagic(base, playerId, pending.instanceId, cardIndex, { mode:pending.mode, prepaid:true });
  if (pending.kind === "mirage") return setMirage(base, playerId, pending.instanceId, cardIndex, { prepaid:true });
  return { ok:false, error:"Pagamento pendente inválido." };
}

export function cancelManualCost(match, playerId) {
  const pending = match.pendingManualCost;
  if (!pending || pending.playerId !== playerId) return { ok:false, error:"Não existe pagamento pendente." };
  const player = match.players[playerId];
  const paidRegular = Number(pending.paidRegular||0);
  const nextPlayer = {
    ...player,
    reserve:player.reserve + paidRegular,
    trashCores:Math.max(0, player.trashCores - paidRegular),
    soulCore:pending.paidSoul ? { zone:"reserve", instanceId:null } : player.soulCore
  };
  return { ok:true, match:{ ...match, players:{ ...match.players, [playerId]:nextPlayer }, pendingManualCost:null } };
}
