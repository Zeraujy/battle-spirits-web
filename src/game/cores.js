import { getDatabaseCard, getCurrentLevel, isCoreLockedNexus } from "./selectors.js";
import { findPhysicalCard } from "./selectors.js";
import { removeFieldCard, updateFieldCard } from "./zones.js";
import { appendLog } from "./utils.js";

function minRequired(card) {
  if (!card) return 0;
  if (card.cardType === "nexus") return 0;
  if (!["spirit", "ultimate", "brave"].includes(card.cardType)) return 0;
  const reqs = (card.levels || []).map((l) => Number(l.cores)).filter(Number.isFinite);
  if (!reqs.length) return card.cardType === "ultimate" ? 1 : 1;
  return Math.min(...reqs);
}

function totalCores(physical) {
  return Number(physical.cores?.regular || 0) + (physical.cores?.soul ? 1 : 0);
}

export function checkDepletion(match, playerId, instanceId, cardIndex) {
  const player = match.players[playerId];
  const ctx = findPhysicalCard(match, instanceId);
  if (!ctx || ctx.playerId !== playerId || !["spirits", "other"].includes(ctx.zone)) return match;
  const card = getDatabaseCard(cardIndex, ctx.card);
  if (!["spirit", "ultimate", "brave"].includes(card?.cardType)) return match;
  if (ctx.card.combinedWith) return match;
  const min = minRequired(card);
  if (totalCores(ctx.card) >= min) return match;

  const removed = removeFieldCard(player, instanceId);
  if (!removed.card) return match;
  let nextPlayer = removed.player;
  nextPlayer = {
    ...nextPlayer,
    reserve: nextPlayer.reserve + Number(removed.card.cores?.regular || 0),
    trash: [...nextPlayer.trash, { ...removed.card, cores: { regular: 0, soul: false }, exhausted: false }]
  };
  if (removed.card.cores?.soul) {
    nextPlayer.soulCore = { zone: "reserve", instanceId: null };
  }
  let next = { ...match, players: { ...match.players, [playerId]: nextPlayer } };
  return appendLog(next, `${card?.namePT || card?.nameEN || card?.id || "Carta"} sofreu Depletion e foi ao Trash.`, "rules");
}

function takeSoulFromPlayer(player, source, instanceId) {
  if (source === "reserve") {
    if (player.soulCore?.zone !== "reserve") return { ok: false, player };
    return { ok: true, player: { ...player, soulCore: { zone: "trash", instanceId: null } } };
  }
  if (source === "card") {
    if (player.soulCore?.zone !== "card" || player.soulCore?.instanceId !== instanceId) return { ok: false, player };
    let next = updateFieldCard(player, instanceId, (c) => ({ ...c, cores: { ...c.cores, soul: false } }));
    next = { ...next, soulCore: { zone: "trash", instanceId: null } };
    return { ok: true, player: next };
  }
  return { ok: false, player };
}

export function payCoreCost(match, playerId, payment, amount, cardIndex) {
  let player = match.players[playerId];
  let paid = 0;
  const touched = new Set();
  for (const line of payment || []) {
    const regular = Number(line.regular || 0);
    if (regular < 0) return { ok: false, error: "Pagamento de Core inválido." };
    if (line.source === "reserve") {
      if (player.reserve < regular) return { ok: false, error: "Reserve insuficiente para o pagamento escolhido." };
      player = { ...player, reserve: player.reserve - regular, trashCores: player.trashCores + regular };
      paid += regular;
      if (line.soul) {
        const result = takeSoulFromPlayer(player, "reserve");
        if (!result.ok) return { ok: false, error: "Soul Core não está na Reserve." };
        player = result.player;
        paid += 1;
      }
    } else if (line.source === "card") {
      const instanceId = line.instanceId;
      const ctx = findPhysicalCard({ ...match, players: { ...match.players, [playerId]: player } }, instanceId);
      if (!ctx || ctx.playerId !== playerId || !["spirits", "nexuses", "other"].includes(ctx.zone)) return { ok: false, error: "Fonte de Core no campo inválida." };
      const sourceCard = getDatabaseCard(cardIndex, ctx.card);
      if (isCoreLockedNexus(sourceCard)) return { ok: false, error: "Cores de Grandwalker/Grandstone Nexus não podem pagar custos desta forma." };
      if (Number(ctx.card.cores?.regular || 0) < regular) return { ok: false, error: "A carta não possui Cores regulares suficientes." };
      player = updateFieldCard(player, instanceId, (c) => ({
        ...c,
        cores: { ...c.cores, regular: Number(c.cores?.regular || 0) - regular }
      }));
      player = { ...player, trashCores: player.trashCores + regular };
      paid += regular;
      touched.add(instanceId);
      if (line.soul) {
        const result = takeSoulFromPlayer(player, "card", instanceId);
        if (!result.ok) return { ok: false, error: "Soul Core não está nessa carta." };
        player = result.player;
        paid += 1;
      }
    }
  }
  if (paid !== amount) return { ok: false, error: `Pagamento incorreto: esperado ${amount}, recebido ${paid}.` };
  let next = { ...match, players: { ...match.players, [playerId]: player } };
  for (const id of touched) next = checkDepletion(next, playerId, id, cardIndex);
  return { ok: true, match: next };
}

export function moveCore(match, playerId, { from, to, coreType = "regular" }, cardIndex) {
  const playPending = match.pendingManualPlay?.playerId === playerId ? { ...match.pendingManualPlay } : null;
  const costPending = match.pendingManualCost?.playerId === playerId ? { ...match.pendingManualCost } : null;
  const pending = playPending || costPending;
  const freeMainMove = match.phase === "main" && match.activePlayerId === playerId && !match.battle;
  const paymentMove = Boolean(costPending) && (
    (to.zone === "trash" && ["reserve", "card"].includes(from.zone)) ||
    (from.zone === "trash" && to.zone === "reserve")
  );
  if (!freeMainMove && !paymentMove) {
    return { ok: false, error: "Este movimento de Core não é permitido neste timing." };
  }

  let player = match.players[playerId];
  const isSoul = coreType === "soul";

  const removeFrom = () => {
    if (from.zone === "reserve") {
      if (isSoul) {
        if (player.soulCore?.zone !== "reserve") return false;
        player = { ...player, soulCore: { zone: "moving", instanceId: null } };
      } else {
        if (player.reserve <= 0) return false;
        player = { ...player, reserve: player.reserve - 1 };
      }
      return true;
    }
    if (from.zone === "trash") {
      if (!pending) return false;
      if (isSoul) {
        if (!pending.paidSoul || player.soulCore?.zone !== "trash") return false;
        pending.paidSoul = false;
        player = { ...player, soulCore: { zone: "moving", instanceId: null } };
      } else {
        if (pending.paidRegular <= 0 || player.trashCores <= 0) return false;
        pending.paidRegular -= 1;
        player = { ...player, trashCores: player.trashCores - 1 };
      }
      return true;
    }
    if (from.zone === "card") {
      const ctx = findPhysicalCard({ ...match, players: { ...match.players, [playerId]: player } }, from.instanceId);
      if (!ctx || ctx.playerId !== playerId) return false;
      if (isCoreLockedNexus(getDatabaseCard(cardIndex, ctx.card))) return false;
      if (isSoul) {
        if (player.soulCore?.zone !== "card" || player.soulCore.instanceId !== from.instanceId) return false;
        player = updateFieldCard(player, from.instanceId, (c) => ({ ...c, cores: { ...c.cores, soul: false } }));
        player = { ...player, soulCore: { zone: "moving", instanceId: null } };
      } else {
        if (Number(ctx.card.cores?.regular || 0) <= 0) return false;
        player = updateFieldCard(player, from.instanceId, (c) => ({ ...c, cores: { ...c.cores, regular: Number(c.cores?.regular || 0) - 1 } }));
      }
      return true;
    }
    return false;
  };

  if (!removeFrom()) return { ok: false, error: "Core de origem não encontrado ou movimento não permitido." };

  if (to.zone === "reserve") {
    if (isSoul) player = { ...player, soulCore: { zone: "reserve", instanceId: null } };
    else player = { ...player, reserve: player.reserve + 1 };
  } else if (to.zone === "trash") {
    if (isSoul) {
      if (pending && pending.paidSoul) return { ok:false, error:"O Soul Core já foi contado neste pagamento." };
      player = { ...player, soulCore: { zone: "trash", instanceId: null } };
      if (pending) pending.paidSoul = true;
    } else {
      player = { ...player, trashCores: player.trashCores + 1 };
      if (pending) pending.paidRegular += 1;
    }
  } else if (to.zone === "card") {
    const ctx = findPhysicalCard({ ...match, players: { ...match.players, [playerId]: player } }, to.instanceId);
    if (!ctx || ctx.playerId !== playerId || !["spirits", "nexuses", "other"].includes(ctx.zone)) return { ok: false, error: "Destino de Core inválido." };
    if (isCoreLockedNexus(getDatabaseCard(cardIndex, ctx.card))) return { ok: false, error: "Grandwalker/Grandstone Nexus só recebem Cores por efeitos próprios, como Oracle." };
    player = updateFieldCard(player, to.instanceId, (c) => ({
      ...c,
      cores: { ...c.cores, regular: Number(c.cores?.regular || 0) + (isSoul ? 0 : 1), soul: isSoul ? true : c.cores?.soul }
    }));
    if (isSoul) player = { ...player, soulCore: { zone: "card", instanceId: to.instanceId } };
  } else {
    return { ok: false, error: "Destino de Core inválido." };
  }

  let next = {
    ...match,
    players: { ...match.players, [playerId]: player },
    pendingManualPlay: playPending ? pending : match.pendingManualPlay,
    pendingManualCost: costPending ? pending : match.pendingManualCost
  };
  if (from.zone === "card" && from.instanceId !== match.pendingManualPlay?.instanceId) next = checkDepletion(next, playerId, from.instanceId, cardIndex);
  return { ok: true, match: next };
}

export function getLevelSummary(card, physical) {
  const level = getCurrentLevel(card, physical);
  return level ? { level: level.level, bp: level.bp } : null;
}
