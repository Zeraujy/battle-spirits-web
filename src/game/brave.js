import { findPhysicalCard, getDatabaseCard, getCurrentLevel } from "./selectors.js";
import { updateFieldCard, removeFieldCard, addFieldCard } from "./zones.js";
import { appendLog } from "./utils.js";

function minimumBraveCores(card) {
  const levels = (card?.levels || []).map((l) => Number(l.cores)).filter(Number.isFinite);
  return levels.length ? Math.min(...levels) : 1;
}

function hostAlreadyCombined(match, hostId) {
  return Object.values(match.players).some((p) => (p.field?.other || []).some((c) => c.combinedWith === hostId));
}

export function conditionMatches(card, hostCard, options = {}) {
  const condition = card?.braveCondition;
  if (!condition) return options.confirmCondition === true;
  if (typeof condition === "string") return options.confirmCondition === true;
  if (condition.cardTypes && !condition.cardTypes.includes(hostCard.cardType)) return false;
  if (condition.colors && !condition.colors.some((c) => hostCard.colors?.includes(c))) return false;
  if (condition.minCost != null && Number(hostCard.cost || 0) < Number(condition.minCost)) return false;
  if (condition.maxCost != null && Number(hostCard.cost || 0) > Number(condition.maxCost)) return false;
  if (condition.families && !condition.families.some((f) => hostCard.families?.includes(f))) return false;
  return true;
}

export function combineBrave(match, playerId, braveInstanceId, hostInstanceId, cardIndex, options = {}) {
  if (match.phase !== "main" || match.activePlayerId !== playerId || match.battle) return { ok: false, error: "Combine/Brave é feito no Main Step." };
  const braveCtx = findPhysicalCard(match, braveInstanceId);
  const hostCtx = findPhysicalCard(match, hostInstanceId);
  if (!braveCtx || !hostCtx || braveCtx.playerId !== playerId || hostCtx.playerId !== playerId) return { ok: false, error: "Brave ou alvo não encontrado." };
  if (braveCtx.zone !== "other" || hostCtx.zone !== "spirits") return { ok: false, error: "O Brave precisa estar em Spirit State e o alvo precisa estar no campo." };
  const braveCard = getDatabaseCard(cardIndex, braveCtx.card);
  const hostCard = getDatabaseCard(cardIndex, hostCtx.card);
  if (braveCard?.cardType !== "brave") return { ok: false, error: "A carta escolhida não é um Brave." };
  if (!["spirit", "ultimate"].includes(hostCard?.cardType)) return { ok: false, error: "Este alvo não é um Spirit/Ultimate compatível." };
  if (hostAlreadyCombined(match, hostInstanceId)) return { ok: false, error: "Este alvo já possui um Brave combinado." };
  if (!conditionMatches(braveCard, hostCard, options)) return { ok: false, error: "A condição de combinação do Brave não foi confirmada/cumprida." };

  let player = match.players[playerId];
  const regular = Number(braveCtx.card.cores?.regular || 0);
  const hasSoul = Boolean(braveCtx.card.cores?.soul);
  const exhausted = Boolean(braveCtx.card.exhausted || hostCtx.card.exhausted);
  player = updateFieldCard(player, hostInstanceId, (c) => ({
    ...c,
    exhausted,
    cores: {
      regular: Number(c.cores?.regular || 0) + regular,
      soul: Boolean(c.cores?.soul || hasSoul)
    }
  }));
  player = updateFieldCard(player, braveInstanceId, (c) => ({
    ...c,
    exhausted,
    combinedWith: hostInstanceId,
    cores: { regular: 0, soul: false }
  }));
  if (hasSoul) player = { ...player, soulCore: { zone: "card", instanceId: hostInstanceId } };
  let next = { ...match, players: { ...match.players, [playerId]: player } };
  return { ok: true, match: appendLog(next, `${braveCard.namePT || braveCard.nameEN || braveCard.id} foi combinado.`, "action") };
}

export function exchangeBrave(match, playerId, braveInstanceId, newHostInstanceId, cardIndex, options = {}) {
  if (match.phase !== "main" || match.activePlayerId !== playerId || match.battle) return { ok: false, error: "Troca de Brave é feita no Main Step." };
  const braveCtx = findPhysicalCard(match, braveInstanceId);
  const newHostCtx = findPhysicalCard(match, newHostInstanceId);
  if (!braveCtx || braveCtx.playerId !== playerId || braveCtx.zone !== "other" || !braveCtx.card.combinedWith) return { ok: false, error: "Brave combinado não encontrado." };
  if (!newHostCtx || newHostCtx.playerId !== playerId || newHostCtx.zone !== "spirits") return { ok: false, error: "Novo alvo não encontrado." };
  if (newHostInstanceId === braveCtx.card.combinedWith) return { ok: false, error: "O Brave já está combinado com esse alvo." };
  if (hostAlreadyCombined(match, newHostInstanceId)) return { ok: false, error: "O novo alvo já possui um Brave combinado." };
  const braveCard = getDatabaseCard(cardIndex, braveCtx.card);
  const newHostCard = getDatabaseCard(cardIndex, newHostCtx.card);
  if (!conditionMatches(braveCard, newHostCard, options)) return { ok: false, error: "A condição de combinação não foi cumprida." };
  const oldHostCtx = findPhysicalCard(match, braveCtx.card.combinedWith);
  const inheritedExhausted = Boolean(braveCtx.card.exhausted || oldHostCtx?.card?.exhausted || newHostCtx.card.exhausted);
  let player = match.players[playerId];
  player = updateFieldCard(player, newHostInstanceId, (c) => ({ ...c, exhausted: inheritedExhausted }));
  player = updateFieldCard(player, braveInstanceId, (c) => ({ ...c, combinedWith: newHostInstanceId, exhausted: inheritedExhausted }));
  return { ok: true, match: appendLog({ ...match, players: { ...match.players, [playerId]: player } }, `${braveCard.namePT || braveCard.nameEN || braveCard.id} trocou de alvo combinado.`, "action") };
}

export function separateBrave(match, playerId, braveInstanceId, cardIndex) {
  if (match.phase !== "main" || match.activePlayerId !== playerId || match.battle) return { ok: false, error: "A separação de Brave é feita no Main Step." };
  const braveCtx = findPhysicalCard(match, braveInstanceId);
  if (!braveCtx || braveCtx.playerId !== playerId || braveCtx.zone !== "other" || !braveCtx.card.combinedWith) return { ok: false, error: "Brave combinado não encontrado." };
  const braveCard = getDatabaseCard(cardIndex, braveCtx.card);
  const hostId = braveCtx.card.combinedWith;
  const hostCtx = findPhysicalCard(match, hostId);
  if (!hostCtx) return { ok: false, error: "Alvo combinado não encontrado." };
  const min = minimumBraveCores(braveCard);
  let player = match.players[playerId];
  let needed = min;
  let braveRegular = 0;
  let braveSoul = false;

  const hostRegular = Number(hostCtx.card.cores?.regular || 0);
  const useHost = Math.min(hostRegular, needed);
  if (useHost) {
    player = updateFieldCard(player, hostId, (c) => ({ ...c, cores: { ...c.cores, regular: Number(c.cores?.regular || 0) - useHost } }));
    braveRegular += useHost;
    needed -= useHost;
  }
  if (needed > 0 && player.reserve > 0) {
    const useReserve = Math.min(player.reserve, needed);
    player = { ...player, reserve: player.reserve - useReserve };
    braveRegular += useReserve;
    needed -= useReserve;
  }
  if (needed > 0 && player.soulCore?.zone === "reserve") {
    braveSoul = true;
    player = { ...player, soulCore: { zone: "card", instanceId: braveInstanceId } };
    needed -= 1;
  }
  if (needed > 0) {
    const removed = removeFieldCard(player, braveInstanceId);
    player = { ...removed.player, trash: [...removed.player.trash, { ...removed.card, combinedWith: null, cores: { regular: 0, soul: false } }] };
    return { ok: true, match: appendLog({ ...match, players: { ...match.players, [playerId]: player } }, "O Brave foi separado sem Cores suficientes para Lv1 e foi ao Trash.", "rules") };
  }

  player = updateFieldCard(player, braveInstanceId, (c) => ({
    ...c,
    combinedWith: null,
    cores: { regular: braveRegular, soul: braveSoul },
    exhausted: Boolean(c.exhausted || hostCtx.card.exhausted)
  }));
  const next = { ...match, players: { ...match.players, [playerId]: player } };
  return { ok: true, match: appendLog(next, `${braveCard.namePT || braveCard.nameEN || braveCard.id} foi separado.`, "action") };
}

export function getCombinedStats(match, cardIndex, hostPhysical) {
  const hostCard = getDatabaseCard(cardIndex, hostPhysical);
  const brave = Object.values(match.players).flatMap((p) => p.field?.other || []).find((b) => b.combinedWith === hostPhysical.instanceId);
  if (!brave) return { cost: hostCard?.cost || 0, colors: hostCard?.colors || [], symbols: hostCard?.symbols || [], bpBonus: 0 };
  const braveCard = getDatabaseCard(cardIndex, brave);
  return {
    cost: Number(hostCard?.cost || 0) + Number(braveCard?.cost || 0),
    colors: [...new Set([...(hostCard?.colors || []), ...(braveCard?.colors || [])])],
    symbols: [...(hostCard?.symbols || []), ...(braveCard?.symbols || [])],
    bpBonus: Number(braveCard?.braveBP || braveCard?.bpPlus || 0),
    hostLevel: getCurrentLevel(hostCard, hostPhysical)
  };
}
