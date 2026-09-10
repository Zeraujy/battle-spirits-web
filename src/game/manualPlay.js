import { calculateReduction } from "./cost.js";
import { checkSummoningCondition } from "./specialRules.js";
import { conditionMatches } from "./brave.js";
import { findPhysicalCard, getDatabaseCard } from "./selectors.js";
import { addFieldCard, removeFieldCard, removeHandCard } from "./zones.js";
import { appendLog } from "./utils.js";
import { resolveCardEvent } from "./effectEngine/effectEngine.js";

function minimumCores(card) {
  if (card?.cardType === "nexus") return 0;
  const reqs = (card?.levels || []).map((l)=>Number(l.cores)).filter(Number.isFinite);
  return reqs.length ? Math.min(...reqs) : (["spirit","ultimate","brave"].includes(card?.cardType) ? 1 : 0);
}

export function beginManualPlay(match, playerId, instanceId, cardIndex, options = {}) {
  if (match.pendingManualPlay) return { ok:false, error:"Conclua ou cancele a jogada pendente antes de jogar outra carta." };
  if (match.phase !== "main" || match.activePlayerId !== playerId || match.battle) return { ok:false, error:"Cartas são jogadas manualmente durante o seu Main Step." };
  const ctx = findPhysicalCard(match, instanceId);
  if (!ctx || ctx.playerId !== playerId || ctx.zone !== "hand") return { ok:false, error:"Carta não encontrada na mão." };
  const card = getDatabaseCard(cardIndex, ctx.card);
  if (!["spirit","ultimate","brave","nexus"].includes(card?.cardType)) return { ok:false, error:"Arraste Spirit, Ultimate, Brave ou Nexus para o campo. Magic usa sua ação própria." };
  if (card.cardType === "ultimate") {
    const cond = checkSummoningCondition(match, playerId, card, cardIndex, { ...options, confirmSummonCondition:true });
    if (!cond.ok) return cond;
  }
  let directHost = null;
  const directHostId = card.cardType === "brave" ? options.directCombineHostInstanceId : null;
  if (directHostId) {
    const hostCtx = findPhysicalCard(match, directHostId);
    if (!hostCtx || hostCtx.playerId !== playerId || hostCtx.zone !== "spirits") return { ok:false, error:"Alvo de Direct Combine inválido." };
    const hostCard = getDatabaseCard(cardIndex, hostCtx.card);
    if (!["spirit","ultimate"].includes(hostCard?.cardType)) return { ok:false, error:"O alvo não pode receber este Brave." };
    if ((match.players[playerId].field.other || []).some((b)=>b.combinedWith===directHostId)) return { ok:false, error:"O alvo já possui um Brave combinado." };
    if (!conditionMatches(card, hostCard, { ...options, confirmCondition:true })) return { ok:false, error:"A condição de combinação do Brave não foi cumprida." };
    directHost = hostCtx;
  }
  const cost = calculateReduction(match, playerId, card, cardIndex);
  let player = match.players[playerId];
  const removed = removeHandCard(player, instanceId);
  if (!removed.card) return { ok:false, error:"Não foi possível retirar a carta da mão." };
  const zone = card.cardType === "nexus" ? "nexuses" : (card.cardType === "brave" ? "other" : "spirits");
  const physical = { ...removed.card, cardType:card.cardType, exhausted:Boolean(directHost?.card?.exhausted), cores:{ regular:0, soul:false }, combinedWith:directHostId || null, flags:{ ...(removed.card.flags||{}), pendingManualPlay:true } };
  player = addFieldCard(removed.player, zone, physical);
  let next = {
    ...match,
    players:{ ...match.players, [playerId]:player },
    pendingManualPlay:{
      playerId,
      instanceId,
      cardId:card.id,
      cardType:card.cardType,
      payableCost:cost.payable,
      printedCost:cost.printed,
      reductionApplied:cost.applied,
      paidRegular:0,
      paidSoul:false,
      minimumCores:directHostId ? 0 : minimumCores(card),
      directCombineHostInstanceId:directHostId || null
    }
  };
  next = appendLog(next, `${player.name} colocou ${card.namePT || card.nameEN || card.id}${directHostId ? " em Direct Combine" : " no campo"} e iniciou o pagamento manual.`, "action");
  return { ok:true, match:next };
}

export function confirmManualPlay(match, playerId, cardIndex) {
  const pending = match.pendingManualPlay;
  if (!pending || pending.playerId !== playerId) return { ok:false, error:"Não existe jogada manual pendente para este jogador." };
  const ctx = findPhysicalCard(match, pending.instanceId);
  const card = getDatabaseCard(cardIndex, ctx?.card);
  if (!ctx || !card) return { ok:false, error:"A carta pendente não está mais no campo." };
  const paid = Number(pending.paidRegular||0) + (pending.paidSoul ? 1 : 0);
  if (paid !== Number(pending.payableCost||0)) return { ok:false, error:`Pagamento incompleto: ${paid}/${pending.payableCost} Cores no Core Trash.` };
  const onCard = Number(ctx.card.cores?.regular||0) + (ctx.card.cores?.soul ? 1 : 0);
  if (onCard < Number(pending.minimumCores||0)) return { ok:false, error:`Coloque pelo menos ${pending.minimumCores} Core(s) na carta para manter o Lv mínimo.` };
  const player = match.players[playerId];
  const updateZone = (list=[]) => list.map((c)=>c.instanceId===pending.instanceId ? { ...c, flags:{ ...(c.flags||{}), pendingManualPlay:false } } : c);
  const nextPlayer = { ...player, field:{ spirits:updateZone(player.field.spirits), nexuses:updateZone(player.field.nexuses), other:updateZone(player.field.other) } };
  let next = { ...match, players:{ ...match.players, [playerId]:nextPlayer }, pendingManualPlay:null };
  next = appendLog(next, `${player.name} confirmou ${card.namePT || card.nameEN || card.id}.`, "action");
  const event = card.cardType === "nexus" ? "whenDeployed" : "whenSummoned";
  const engine = resolveCardEvent(next, { event, sourcePlayerId: playerId, sourceInstanceId: pending.instanceId }, cardIndex);
  next = engine.match;
  return { ok:true, match:next, manualResolutionNeeded: engine.manualResolutionNeeded, notes: engine.notes };
}

export function cancelManualPlay(match, playerId, cardIndex) {
  const pending = match.pendingManualPlay;
  if (!pending || pending.playerId !== playerId) return { ok:false, error:"Não existe jogada pendente." };
  let player = match.players[playerId];
  const removed = removeFieldCard(player, pending.instanceId);
  if (!removed.card) return { ok:false, error:"Carta pendente não encontrada." };
  const regularOnCard = Number(removed.card.cores?.regular||0);
  const hadSoulOnCard = Boolean(removed.card.cores?.soul);
  const paidRegular = Number(pending.paidRegular||0);
  player = {
    ...removed.player,
    reserve:removed.player.reserve + regularOnCard + paidRegular,
    trashCores:Math.max(0, removed.player.trashCores - paidRegular),
    hand:[...removed.player.hand, { ...removed.card, cores:{regular:0,soul:false}, flags:{ ...(removed.card.flags||{}), pendingManualPlay:false } }]
  };
  if (pending.paidSoul || hadSoulOnCard) player.soulCore = { zone:"reserve", instanceId:null };
  const card = getDatabaseCard(cardIndex, removed.card);
  let next = { ...match, players:{ ...match.players, [playerId]:player }, pendingManualPlay:null };
  next = appendLog(next, `${player.name} cancelou a jogada de ${card?.namePT || card?.nameEN || card?.id || "carta"}.`, "action");
  return { ok:true, match:next };
}
