import { calculateReduction, autoBuildPayment } from "./cost.js";
import { payCoreCost } from "./cores.js";
import { findPhysicalCard, getDatabaseCard } from "./selectors.js";
import { removeHandCard, removeFieldCard, updateFieldCard, addFieldCard } from "./zones.js";
import { appendLog, otherPlayerId } from "./utils.js";

function effectAtTiming(card, timing) {
  return (card?.effects || []).find((effect) => effect.timing === timing || effect.type === timing) || null;
}

export function canUseMagic(match, playerId, instanceId, cardIndex, mode = "main") {
  const ctx = findPhysicalCard(match, instanceId);
  if (!ctx || ctx.playerId !== playerId || ctx.zone !== "hand") return false;
  const card = getDatabaseCard(cardIndex, ctx.card);
  if (card?.cardType !== "magic") return false;
  if (mode === "main") return match.phase === "main" && match.activePlayerId === playerId && !match.battle;
  if (mode === "flash") {
    if (match.phase === "main" && match.activePlayerId === playerId && !match.battle) return true;
    return Boolean(match.battle?.flash?.priorityPlayerId === playerId);
  }
  return false;
}

function resolveSimpleOperations(match, sourcePlayerId, operations = [], cardIndex) {
  let next = match;
  const notes = [];
  for (const op of operations) {
    const playerId = op.player === "opponent" ? otherPlayerId(next, sourcePlayerId) : (op.playerId || sourcePlayerId);
    const player = next.players[playerId];
    if (!player) continue;
    if (op.type === "draw") {
      let deck = [...player.deck];
      let hand = [...player.hand];
      const count = Math.max(0, Number(op.count || 1));
      for (let i = 0; i < count && deck.length; i += 1) hand.push(deck.shift());
      next = { ...next, players: { ...next.players, [playerId]: { ...player, deck, hand } } };
    } else if (op.type === "reserveCoreFromVoid") {
      next = { ...next, players: { ...next.players, [playerId]: { ...player, reserve: player.reserve + Number(op.count || 1) } } };
    } else if (op.type === "temporaryBP" && op.instanceId) {
      const updated = updateFieldCard(player, op.instanceId, (c) => ({ ...c, temporaryBP: Number(c.temporaryBP || 0) + Number(op.amount || 0) }));
      next = { ...next, players: { ...next.players, [playerId]: updated } };
    } else if (op.type === "refresh" && op.instanceId) {
      const updated = updateFieldCard(player, op.instanceId, (c) => ({ ...c, exhausted: false }));
      next = { ...next, players: { ...next.players, [playerId]: updated } };
    } else if (op.type === "exhaust" && op.instanceId) {
      const updated = updateFieldCard(player, op.instanceId, (c) => ({ ...c, exhausted: true }));
      next = { ...next, players: { ...next.players, [playerId]: updated } };
    } else {
      notes.push(`Operação manual necessária: ${op.type || "desconhecida"}`);
    }
  }
  return { match: next, notes };
}

export function useMagic(match, playerId, instanceId, cardIndex, { mode = "main", payment, prepaid = false } = {}) {
  if (!canUseMagic(match, playerId, instanceId, cardIndex, mode)) return { ok: false, error: "Esta Magic não pode ser usada nesse timing." };
  const ctx = findPhysicalCard(match, instanceId);
  const card = getDatabaseCard(cardIndex, ctx.card);
  const cost = calculateReduction(match, playerId, card, cardIndex);
  let paid = { ok:true, match };
  if (!prepaid) {
    const chosen = payment ?? autoBuildPayment(match, playerId, cost.payable, cardIndex);
    if (!chosen && cost.payable > 0) return { ok: false, error: "Cores insuficientes para a Magic." };
    paid = payCoreCost(match, playerId, chosen || [], cost.payable, cardIndex);
    if (!paid.ok) return paid;
  }
  let player = paid.match.players[playerId];
  const removed = removeHandCard(player, instanceId);
  const effect = mode === "main" ? effectAtTiming(card, "main") : effectAtTiming(card, "flash");
  let next = { ...paid.match, players: { ...paid.match.players, [playerId]: removed.player } };
  const ops = effect?.operations || effect?.actions || [];
  const resolved = resolveSimpleOperations(next, playerId, ops, cardIndex);
  next = resolved.match;
  player = next.players[playerId];
  player = { ...player, trash: [...player.trash, { ...removed.card, cores: { regular: 0, soul: false } }] };
  next = { ...next, players: { ...next.players, [playerId]: player } };
  next = appendLog(next, `${player.name} usou ${card.namePT || card.nameEN || card.id} (${mode}).`, "effect");
  if (mode === "flash" && next.battle?.flash) {
    next = {
      ...next,
      battle: {
        ...next.battle,
        flash: {
          ...next.battle.flash,
          consecutivePasses: 0,
          priorityPlayerId: otherPlayerId(next, playerId)
        }
      }
    };
  }
  return { ok: true, match: next, manualResolutionNeeded: !ops.length || resolved.notes.length > 0, notes: resolved.notes };
}

export function setBurst(match, playerId, instanceId, cardIndex) {
  if (match.phase !== "main" || match.activePlayerId !== playerId || match.battle) return { ok: false, error: "Burst é setado no seu Main Step." };
  const player = match.players[playerId];
  if (player.turnFlags?.burstSet) return { ok: false, error: "Você só pode realizar a ação de Set Burst uma vez por turno." };
  const ctx = findPhysicalCard(match, instanceId);
  if (!ctx || ctx.playerId !== playerId || ctx.zone !== "hand") return { ok: false, error: "Carta não encontrada na mão." };
  const card = getDatabaseCard(cardIndex, ctx.card);
  const hasBurst = card?.subtypes?.includes("burst") || (card?.effects || []).some((e) => e.type === "burst" || String(e.timing || "").toLowerCase().includes("burst") || String(e.title?.en || "").toLowerCase().includes("burst"));
  if (!hasBurst) return { ok: false, error: "A carta não possui Burst identificada no database." };
  const removed = removeHandCard(player, instanceId);
  let nextPlayer = removed.player;
  if (player.burst) nextPlayer = { ...nextPlayer, trash: [...nextPlayer.trash, { ...player.burst, faceDown: false }] };
  nextPlayer = {
    ...nextPlayer,
    burst: { ...removed.card, faceDown: true },
    turnFlags: { ...(nextPlayer.turnFlags || {}), burstSet: true }
  };
  return { ok: true, match: appendLog({ ...match, players: { ...match.players, [playerId]: nextPlayer } }, `${player.name} setou uma Burst.`, "action") };
}

function hasMirage(card) {
  return Boolean(card?.mirage) || (card?.effects || []).some((e) => e.type === "mirage" || e.timing === "mirage" || String(e.title?.en || "").toLowerCase().includes("mirage"));
}

export function setMirage(match, playerId, instanceId, cardIndex, { payment, prepaid = false } = {}) {
  if (match.phase !== "main" || match.activePlayerId !== playerId || match.battle) return { ok: false, error: "Mirage é setada no seu Main Step." };
  const player = match.players[playerId];
  if (player.turnFlags?.mirageSet) return { ok: false, error: "Você só pode realizar a ação de Set Mirage uma vez por turno." };
  const ctx = findPhysicalCard(match, instanceId);
  if (!ctx || ctx.playerId !== playerId || ctx.zone !== "hand") return { ok: false, error: "Carta não encontrada na mão." };
  const card = getDatabaseCard(cardIndex, ctx.card);
  if (!hasMirage(card)) return { ok: false, error: "A carta não possui Mirage identificada no database." };
  const mirageCard = { ...card, cost: Number(card.mirage?.cost ?? card.cost ?? 0), reduction: card.mirage?.reduction ?? card.reduction ?? [] };
  const cost = calculateReduction(match, playerId, mirageCard, cardIndex);
  let paid = { ok:true, match };
  if (!prepaid) {
    const chosen = payment ?? autoBuildPayment(match, playerId, cost.payable, cardIndex);
    if (!chosen && cost.payable > 0) return { ok: false, error: "Cores insuficientes para o custo de Mirage." };
    paid = payCoreCost(match, playerId, chosen || [], cost.payable, cardIndex);
    if (!paid.ok) return paid;
  }
  let paidPlayer = paid.match.players[playerId];
  const removed = removeHandCard(paidPlayer, instanceId);
  paidPlayer = removed.player;
  if (paidPlayer.mirage) paidPlayer = { ...paidPlayer, hand: [...paidPlayer.hand, { ...paidPlayer.mirage, faceUp: false }] };
  paidPlayer = {
    ...paidPlayer,
    mirage: { ...removed.card, faceUp: true },
    turnFlags: { ...(paidPlayer.turnFlags || {}), mirageSet: true }
  };
  return { ok: true, match: appendLog({ ...paid.match, players: { ...paid.match.players, [playerId]: paidPlayer } }, `${player.name} setou uma Mirage.`, "action") };
}

export function activateBurst(match, playerId, cardIndex, { confirmCondition = false } = {}) {
  const player = match.players[playerId];
  if (!player?.burst) return { ok: false, error: "Nenhuma Burst setada." };
  if (!confirmCondition) return { ok: false, error: "Confirme que a condição oficial da Burst foi cumprida." };
  const physical = player.burst;
  const card = getDatabaseCard(cardIndex, physical);
  const effect = (card?.effects || []).find((e) => e.type === "burst") || null;
  const resolved = resolveSimpleOperations(match, playerId, effect?.operations || [], cardIndex);
  const nextPlayer = { ...resolved.match.players[playerId], burst: null, trash: [...resolved.match.players[playerId].trash, { ...physical, faceDown: false }] };
  const next = appendLog({ ...resolved.match, players: { ...resolved.match.players, [playerId]: nextPlayer } }, `${player.name} ativou ${card?.namePT || card?.nameEN || card?.id || "Burst"}.`, "effect");
  return { ok: true, match: next, manualResolutionNeeded: !(effect?.operations?.length) };
}

export function manualAction(match, actorId, payload, cardIndex) {
  if (!match.players[actorId]) return { ok: false, error: "Jogador inválido." };
  const { type } = payload;
  let next = match;
  if (type === "draw") {
    const targetId = payload.playerId || actorId;
    const player = next.players[targetId];
    const count = Math.max(1, Number(payload.count || 1));
    const deck = [...player.deck];
    const hand = [...player.hand];
    for (let i = 0; i < count && deck.length; i += 1) hand.push(deck.shift());
    next = { ...next, players: { ...next.players, [targetId]: { ...player, deck, hand } } };
  } else if (type === "adjustLife") {
    const targetId = payload.playerId || actorId;
    const player = next.players[targetId];
    const delta = Number(payload.delta || 0);
    const life = Math.max(0, player.life + delta);
    const reserve = delta < 0 ? player.reserve + Math.min(-delta, player.life) : player.reserve;
    next = { ...next, players: { ...next.players, [targetId]: { ...player, life, reserve } } };
    if (life <= 0) next = { ...next, winnerId: otherPlayerId(next, targetId), winnerReason: "life" };
  } else if (type === "temporaryBP") {
    const ctx = findPhysicalCard(next, payload.instanceId);
    if (!ctx) return { ok: false, error: "Carta não encontrada." };
    const player = updateFieldCard(next.players[ctx.playerId], payload.instanceId, (c) => ({ ...c, temporaryBP: Number(c.temporaryBP || 0) + Number(payload.amount || 0) }));
    next = { ...next, players: { ...next.players, [ctx.playerId]: player } };
  } else if (["refresh", "exhaust"].includes(type)) {
    const ctx = findPhysicalCard(next, payload.instanceId);
    if (!ctx) return { ok: false, error: "Carta não encontrada." };
    const player = updateFieldCard(next.players[ctx.playerId], payload.instanceId, (c) => ({ ...c, exhausted: type === "exhaust" }));
    next = { ...next, players: { ...next.players, [ctx.playerId]: player } };
  } else if (["destroy", "returnHand"].includes(type)) {
    const ctx = findPhysicalCard(next, payload.instanceId);
    if (!ctx || !["spirits", "nexuses", "other"].includes(ctx.zone)) return { ok: false, error: "Carta de campo não encontrada." };
    const removed = removeFieldCard(next.players[ctx.playerId], payload.instanceId);
    const regular = Number(removed.card.cores?.regular || 0);
    let player = { ...removed.player, reserve: removed.player.reserve + regular };
    if (removed.card.cores?.soul) player.soulCore = { zone: "reserve", instanceId: null };
    const clean = { ...removed.card, cores: { regular: 0, soul: false }, exhausted: false, combinedWith: null };
    if (type === "destroy") player = { ...player, trash: [...player.trash, clean] };
    else player = { ...player, hand: [...player.hand, clean] };
    next = { ...next, players: { ...next.players, [ctx.playerId]: player } };
  } else if (type === "topDeckToTrash") {
    const targetId = payload.playerId || actorId;
    const player = next.players[targetId];
    if (!player.deck.length) return { ok: false, error: "Deck vazio." };
    const deck = [...player.deck];
    const card = deck.shift();
    next = { ...next, players: { ...next.players, [targetId]: { ...player, deck, trash: [...player.trash, card] } } };
  } else if (type === "voidToReserve") {
    const targetId = payload.playerId || actorId;
    const player = next.players[targetId];
    next = { ...next, players: { ...next.players, [targetId]: { ...player, reserve: Number(player.reserve || 0) + 1 } } };
  } else if (type === "revealTop") {
    const targetId = payload.playerId || actorId;
    const player = next.players[targetId];
    if (!player.deck.length) return { ok:false, error:"Deck vazio." };
    const deck = [...player.deck];
    const card = deck.shift();
    next = { ...next, players: { ...next.players, [targetId]: { ...player, deck, revealed:[...(player.revealed||[]), card] } } };
  } else if (["revealedToHand","revealedToTop","revealedToBottom"].includes(type)) {
    const targetId = payload.playerId || actorId;
    const player = next.players[targetId];
    const revealed = [...(player.revealed || [])];
    const index = revealed.findIndex((c)=>c.instanceId === payload.instanceId);
    if (index < 0) return { ok:false, error:"Carta revelada não encontrada." };
    const [card] = revealed.splice(index,1);
    const clean = { ...card };
    if (type === "revealedToHand") next = { ...next, players:{...next.players,[targetId]:{...player,revealed,hand:[...player.hand,clean]}}};
    if (type === "revealedToTop") next = { ...next, players:{...next.players,[targetId]:{...player,revealed,deck:[clean,...player.deck]}}};
    if (type === "revealedToBottom") next = { ...next, players:{...next.players,[targetId]:{...player,revealed,deck:[...player.deck,clean]}}};
  } else {
    return { ok: false, error: "Ação manual não reconhecida." };
  }
  return { ok: true, match: appendLog(next, `Resolução manual: ${type}.`, "manual") };
}
