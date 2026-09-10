import { findPhysicalCard, getDatabaseCard, getCurrentLevel } from "./selectors.js";
import { updateFieldCard, removeFieldCard } from "./zones.js";
import { appendLog } from "./utils.js";

function minimumBraveCores(card) {
  const levels = (card?.levels || [])
    .map((level) => Number(level.cores))
    .filter(Number.isFinite);
  return levels.length ? Math.min(...levels) : 1;
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value == null || value === "") return [];
  return [value];
}

function sameText(a, b) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function hasFamily(hostCard, family) {
  return (hostCard?.families || []).some((candidate) => sameText(candidate, family));
}

function hasColor(hostCard, color) {
  return (hostCard?.colors || []).some((candidate) => sameText(candidate, color));
}

function normalizeTypedCondition(condition) {
  const type = String(condition?.type || "").replace(/[\s_-]+/g, "").toLowerCase();
  const value = condition?.value ?? condition?.amount ?? condition?.cost ?? condition?.family ?? condition?.color ?? condition?.cardType;

  if (!type) return null;

  if (["family", "familyis", "requiresfamily"].includes(type)) {
    return { families: normalizeList(value) };
  }
  if (["color", "colour", "requirescolor", "requirescolour"].includes(type)) {
    return { colors: normalizeList(value) };
  }
  if (["cardtype", "typeis", "targettype"].includes(type)) {
    return { cardTypes: normalizeList(value) };
  }
  if (["costatleast", "mincost", "costminimum", "costormore"].includes(type)) {
    return { minCost: Number(value) };
  }
  if (["costatmost", "maxcost", "costmaximum", "costorless"].includes(type)) {
    return { maxCost: Number(value) };
  }
  if (["costexactly", "costequals", "exactcost"].includes(type)) {
    return { minCost: Number(value), maxCost: Number(value) };
  }
  if (["spirit", "ultimate"].includes(type)) {
    return { cardTypes: [type] };
  }

  return null;
}

function structuredConditionResult(condition, hostCard) {
  if (!condition || typeof condition !== "object") {
    return { known: false, matches: false, reason: "Condição de Combine não estruturada." };
  }

  if (Array.isArray(condition)) {
    const children = condition.map((item) => structuredConditionResult(item, hostCard));
    if (children.some((child) => !child.known)) {
      return { known: false, matches: false, reason: "Parte da condição de Combine não está estruturada." };
    }
    const failed = children.find((child) => !child.matches);
    return failed || { known: true, matches: true, reason: null };
  }

  if (Array.isArray(condition.all) || Array.isArray(condition.and)) {
    const list = condition.all || condition.and;
    const children = list.map((item) => structuredConditionResult(item, hostCard));
    if (children.some((child) => !child.known)) {
      return { known: false, matches: false, reason: "Parte da condição de Combine não está estruturada." };
    }
    const failed = children.find((child) => !child.matches);
    return failed || { known: true, matches: true, reason: null };
  }

  if (Array.isArray(condition.any) || Array.isArray(condition.or)) {
    const list = condition.any || condition.or;
    const children = list.map((item) => structuredConditionResult(item, hostCard));
    if (children.some((child) => child.known && child.matches)) {
      return { known: true, matches: true, reason: null };
    }
    if (children.every((child) => !child.known)) {
      return { known: false, matches: false, reason: "Condição alternativa de Combine não estruturada." };
    }
    return { known: true, matches: false, reason: "O alvo não cumpre nenhuma das condições alternativas do Brave." };
  }

  if (condition.not) {
    const child = structuredConditionResult(condition.not, hostCard);
    if (!child.known) return child;
    return child.matches
      ? { known: true, matches: false, reason: "O alvo possui uma característica proibida pela condição de Combine." }
      : { known: true, matches: true, reason: null };
  }

  const typed = normalizeTypedCondition(condition);
  const normalized = typed ? { ...condition, ...typed, type: undefined, value: undefined } : condition;

  const cardTypes = normalizeList(normalized.cardTypes ?? normalized.cardType);
  if (cardTypes.length && !cardTypes.some((type) => sameText(type, hostCard?.cardType))) {
    return { known: true, matches: false, reason: `Este Brave exige ${cardTypes.join(" / ")}.` };
  }

  const colors = normalizeList(normalized.colors ?? normalized.color);
  if (colors.length && !colors.some((color) => hasColor(hostCard, color))) {
    return { known: true, matches: false, reason: `A cor do alvo não cumpre a condição do Brave (${colors.join(" / ")}).` };
  }

  const families = normalizeList(normalized.families ?? normalized.family);
  if (families.length && !families.some((family) => hasFamily(hostCard, family))) {
    return { known: true, matches: false, reason: `O alvo precisa pertencer à família ${families.join(" / ")}.` };
  }

  const minCost = normalized.minCost ?? normalized.minimumCost ?? normalized.costAtLeast;
  const maxCost = normalized.maxCost ?? normalized.maximumCost ?? normalized.costAtMost;
  const exactCost = normalized.exactCost ?? normalized.costEquals;
  const cost = Number(hostCard?.cost || 0);

  if (exactCost != null && cost !== Number(exactCost)) {
    return { known: true, matches: false, reason: `O alvo precisa ter Cost ${Number(exactCost)}.` };
  }
  if (minCost != null && Number.isFinite(Number(minCost)) && cost < Number(minCost)) {
    return { known: true, matches: false, reason: `O alvo precisa ter Cost ${Number(minCost)} ou maior.` };
  }
  if (maxCost != null && Number.isFinite(Number(maxCost)) && cost > Number(maxCost)) {
    return { known: true, matches: false, reason: `O alvo precisa ter Cost ${Number(maxCost)} ou menor.` };
  }

  const recognizedKeys = [
    "cardTypes", "cardType", "colors", "color", "families", "family",
    "minCost", "minimumCost", "costAtLeast", "maxCost", "maximumCost", "costAtMost",
    "exactCost", "costEquals", "type", "value", "all", "and", "any", "or", "not"
  ];
  const hasRecognized = recognizedKeys.some((key) => condition[key] != null) || Boolean(typed);
  if (!hasRecognized) {
    return { known: false, matches: false, reason: "Condição de Combine não estruturada." };
  }

  return { known: true, matches: true, reason: null };
}

export function evaluateBraveCondition(card, hostCard, options = {}) {
  if (!card || card.cardType !== "brave") {
    return { matches: false, manual: false, reason: "A carta escolhida não é um Brave." };
  }
  if (!hostCard || !["spirit", "ultimate"].includes(hostCard.cardType)) {
    return { matches: false, manual: false, reason: "O alvo precisa ser um Spirit ou Ultimate compatível." };
  }

  const condition = card.braveCondition;
  if (!condition) {
    return options.confirmCondition === true
      ? { matches: true, manual: true, reason: null }
      : { matches: false, manual: true, reason: "A condição de Combine precisa ser confirmada manualmente." };
  }
  if (typeof condition === "string") {
    return options.confirmCondition === true
      ? { matches: true, manual: true, reason: null }
      : { matches: false, manual: true, reason: condition };
  }

  const result = structuredConditionResult(condition, hostCard);
  if (!result.known) {
    return options.confirmCondition === true
      ? { matches: true, manual: true, reason: null }
      : { matches: false, manual: true, reason: result.reason };
  }
  return { matches: result.matches, manual: false, reason: result.reason };
}

export function conditionMatches(card, hostCard, options = {}) {
  return evaluateBraveCondition(card, hostCard, options).matches;
}

function hostAlreadyCombined(match, hostId, ignoreBraveInstanceId = null) {
  return Object.values(match.players || {}).some((player) =>
    (player.field?.other || []).some((physical) =>
      physical.instanceId !== ignoreBraveInstanceId && physical.combinedWith === hostId
    )
  );
}

export function getLegalBraveHosts(match, playerId, braveInstanceId, cardIndex, options = {}) {
  const braveCtx = findPhysicalCard(match, braveInstanceId);
  if (!braveCtx || braveCtx.playerId !== playerId) return [];
  const braveCard = getDatabaseCard(cardIndex, braveCtx.card);
  if (braveCard?.cardType !== "brave") return [];

  const currentHostId = braveCtx.card.combinedWith || null;
  const hosts = match.players?.[playerId]?.field?.spirits || [];

  return hosts
    .filter((physical) => physical.instanceId !== currentHostId)
    .filter((physical) => !hostAlreadyCombined(match, physical.instanceId, braveInstanceId))
    .map((physical) => {
      const card = getDatabaseCard(cardIndex, physical);
      const evaluation = evaluateBraveCondition(braveCard, card, {
        confirmCondition: options.confirmManual === true
      });
      return {
        physical,
        card,
        matches: evaluation.matches,
        manual: evaluation.manual,
        reason: evaluation.reason
      };
    })
    .filter((entry) => entry.matches || (options.includeManual === true && entry.manual));
}

export function getBraveSeparationPreview(match, playerId, braveInstanceId, cardIndex) {
  const braveCtx = findPhysicalCard(match, braveInstanceId);
  if (!braveCtx || braveCtx.playerId !== playerId || !braveCtx.card.combinedWith) return null;
  const braveCard = getDatabaseCard(cardIndex, braveCtx.card);
  const hostCtx = findPhysicalCard(match, braveCtx.card.combinedWith);
  if (!braveCard || !hostCtx) return null;

  const minimum = minimumBraveCores(braveCard);
  const hostRegular = Number(hostCtx.card.cores?.regular || 0);
  const reserve = Number(match.players?.[playerId]?.reserve || 0);
  const soulOnHost = Boolean(
    hostCtx.card.cores?.soul &&
    match.players?.[playerId]?.soulCore?.zone === "card" &&
    match.players?.[playerId]?.soulCore?.instanceId === hostCtx.card.instanceId
  );
  const soulInReserve = match.players?.[playerId]?.soulCore?.zone === "reserve";
  const soulAvailable = soulOnHost || soulInReserve;
  const available = hostRegular + reserve + (soulAvailable ? 1 : 0);

  return {
    minimum,
    hostRegular,
    reserve,
    soulAvailable,
    soulOnHost,
    soulInReserve,
    available,
    survives: available >= minimum,
    braveName: braveCard.namePT || braveCard.nameEN || braveCard.id,
    hostName: getDatabaseCard(cardIndex, hostCtx.card)?.namePT || getDatabaseCard(cardIndex, hostCtx.card)?.nameEN || hostCtx.card.cardId
  };
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
  if (hostAlreadyCombined(match, hostInstanceId, braveInstanceId)) return { ok: false, error: "Este alvo já possui um Brave combinado." };

  const evaluation = evaluateBraveCondition(braveCard, hostCard, options);
  if (!evaluation.matches) return { ok: false, error: evaluation.reason || "A condição de combinação do Brave não foi cumprida." };

  let player = match.players[playerId];
  const regular = Number(braveCtx.card.cores?.regular || 0);
  const hasSoul = Boolean(braveCtx.card.cores?.soul);
  const exhausted = Boolean(braveCtx.card.exhausted || hostCtx.card.exhausted);
  player = updateFieldCard(player, hostInstanceId, (physical) => ({
    ...physical,
    exhausted,
    cores: {
      regular: Number(physical.cores?.regular || 0) + regular,
      soul: Boolean(physical.cores?.soul || hasSoul)
    }
  }));
  player = updateFieldCard(player, braveInstanceId, (physical) => ({
    ...physical,
    exhausted,
    combinedWith: hostInstanceId,
    cores: { regular: 0, soul: false }
  }));
  if (hasSoul) player = { ...player, soulCore: { zone: "card", instanceId: hostInstanceId } };

  let next = { ...match, players: { ...match.players, [playerId]: player } };
  const manualNote = evaluation.manual ? " (condição confirmada manualmente)" : "";
  next = appendLog(next, `${braveCard.namePT || braveCard.nameEN || braveCard.id} foi combinado${manualNote}.`, "action");
  return { ok: true, match: next };
}

export function exchangeBrave(match, playerId, braveInstanceId, newHostInstanceId, cardIndex, options = {}) {
  if (match.phase !== "main" || match.activePlayerId !== playerId || match.battle) return { ok: false, error: "Troca de Brave é feita no Main Step." };
  const braveCtx = findPhysicalCard(match, braveInstanceId);
  const newHostCtx = findPhysicalCard(match, newHostInstanceId);
  if (!braveCtx || braveCtx.playerId !== playerId || braveCtx.zone !== "other" || !braveCtx.card.combinedWith) return { ok: false, error: "Brave combinado não encontrado." };
  if (!newHostCtx || newHostCtx.playerId !== playerId || newHostCtx.zone !== "spirits") return { ok: false, error: "Novo alvo não encontrado." };
  if (newHostInstanceId === braveCtx.card.combinedWith) return { ok: false, error: "O Brave já está combinado com esse alvo." };
  if (hostAlreadyCombined(match, newHostInstanceId, braveInstanceId)) return { ok: false, error: "O novo alvo já possui um Brave combinado." };

  const braveCard = getDatabaseCard(cardIndex, braveCtx.card);
  const newHostCard = getDatabaseCard(cardIndex, newHostCtx.card);
  const evaluation = evaluateBraveCondition(braveCard, newHostCard, options);
  if (!evaluation.matches) return { ok: false, error: evaluation.reason || "A condição de combinação não foi cumprida." };

  const oldHostCtx = findPhysicalCard(match, braveCtx.card.combinedWith);
  const inheritedExhausted = Boolean(braveCtx.card.exhausted || oldHostCtx?.card?.exhausted || newHostCtx.card.exhausted);
  let player = match.players[playerId];
  player = updateFieldCard(player, newHostInstanceId, (physical) => ({ ...physical, exhausted: inheritedExhausted }));
  player = updateFieldCard(player, braveInstanceId, (physical) => ({ ...physical, combinedWith: newHostInstanceId, exhausted: inheritedExhausted }));
  return { ok: true, match: appendLog({ ...match, players: { ...match.players, [playerId]: player } }, `${braveCard.namePT || braveCard.nameEN || braveCard.id} trocou de alvo combinado.`, "action") };
}

export function separateBrave(match, playerId, braveInstanceId, cardIndex, options = {}) {
  if (!options.forced && (match.phase !== "main" || match.activePlayerId !== playerId || match.battle)) return { ok: false, error: "A separação de Brave é feita no Main Step." };
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
    player = updateFieldCard(player, hostId, (physical) => ({
      ...physical,
      cores: { ...physical.cores, regular: Number(physical.cores?.regular || 0) - useHost }
    }));
    braveRegular += useHost;
    needed -= useHost;
  }

  if (needed > 0 && Number(player.reserve || 0) > 0) {
    const useReserve = Math.min(Number(player.reserve || 0), needed);
    player = { ...player, reserve: Number(player.reserve || 0) - useReserve };
    braveRegular += useReserve;
    needed -= useReserve;
  }

  if (needed > 0) {
    const currentHost = findPhysicalCard({ ...match, players: { ...match.players, [playerId]: player } }, hostId);
    const soulIsOnHost = Boolean(
      currentHost?.card?.cores?.soul &&
      player.soulCore?.zone === "card" &&
      player.soulCore?.instanceId === hostId
    );

    if (soulIsOnHost) {
      player = updateFieldCard(player, hostId, (physical) => ({
        ...physical,
        cores: { ...physical.cores, soul: false }
      }));
      braveSoul = true;
      player = { ...player, soulCore: { zone: "card", instanceId: braveInstanceId } };
      needed -= 1;
    } else if (player.soulCore?.zone === "reserve") {
      braveSoul = true;
      player = { ...player, soulCore: { zone: "card", instanceId: braveInstanceId } };
      needed -= 1;
    }
  }

  if (needed > 0) {
    const removed = removeFieldCard(player, braveInstanceId);
    player = {
      ...removed.player,
      trash: [
        ...removed.player.trash,
        {
          ...removed.card,
          combinedWith: null,
          cores: { regular: 0, soul: false },
          flags: { ...(removed.card.flags || {}), braveSeparatedWithoutLevel: true }
        }
      ]
    };
    const reason = options.forced
      ? "O Brave deixou de cumprir a condição de Combine e, sem Cores para manter LV1, foi ao Trash."
      : "O Brave foi separado sem Cores suficientes para LV1 e foi ao Trash.";
    return { ok: true, match: appendLog({ ...match, players: { ...match.players, [playerId]: player } }, reason, "rules") };
  }

  player = updateFieldCard(player, braveInstanceId, (physical) => ({
    ...physical,
    combinedWith: null,
    cores: { regular: braveRegular, soul: braveSoul },
    exhausted: Boolean(physical.exhausted || hostCtx.card.exhausted)
  }));
  const next = { ...match, players: { ...match.players, [playerId]: player } };
  const text = options.forced
    ? `${braveCard.namePT || braveCard.nameEN || braveCard.id} foi separado automaticamente porque a condição de Combine deixou de ser válida.`
    : `${braveCard.namePT || braveCard.nameEN || braveCard.id} foi separado.`;
  return { ok: true, match: appendLog(next, text, options.forced ? "rules" : "action") };
}

export function enforceBraveConditions(match, cardIndex) {
  let next = match;
  let changed = false;

  for (const [playerId, player] of Object.entries(match.players || {})) {
    const combined = (player.field?.other || []).filter((physical) => physical.combinedWith);
    for (const bravePhysical of combined) {
      const currentBraveCtx = findPhysicalCard(next, bravePhysical.instanceId);
      if (!currentBraveCtx?.card?.combinedWith) continue;
      const hostCtx = findPhysicalCard(next, currentBraveCtx.card.combinedWith);
      const braveCard = getDatabaseCard(cardIndex, currentBraveCtx.card);
      const hostCard = hostCtx ? getDatabaseCard(cardIndex, hostCtx.card) : null;
      if (!hostCtx || !hostCard) continue;

      const evaluation = evaluateBraveCondition(braveCard, hostCard);
      if (evaluation.manual || evaluation.matches) continue;

      const separated = separateBrave(next, playerId, currentBraveCtx.card.instanceId, cardIndex, { forced: true });
      if (separated.ok) {
        next = separated.match;
        changed = true;
      }
    }
  }

  return { match: next, changed };
}

export function getCombinedStats(match, cardIndex, hostPhysical) {
  const hostCard = getDatabaseCard(cardIndex, hostPhysical);
  const brave = Object.values(match.players || {})
    .flatMap((player) => player.field?.other || [])
    .find((physical) => physical.combinedWith === hostPhysical.instanceId);

  if (!brave) {
    return {
      cost: Number(hostCard?.cost || 0),
      colors: hostCard?.colors || [],
      families: hostCard?.families || [],
      symbols: hostCard?.symbols || [],
      bpBonus: 0,
      brave: null,
      braveCard: null,
      hostLevel: getCurrentLevel(hostCard, hostPhysical)
    };
  }

  const braveCard = getDatabaseCard(cardIndex, brave);
  return {
    cost: Number(hostCard?.cost || 0) + Number(braveCard?.cost || 0),
    colors: [...new Set([...(hostCard?.colors || []), ...(braveCard?.colors || [])])],
    families: [...new Set(hostCard?.families || [])],
    symbols: [...(hostCard?.symbols || []), ...(braveCard?.symbols || [])],
    bpBonus: Number(braveCard?.braveBP || braveCard?.bpPlus || 0),
    brave,
    braveCard,
    hostLevel: getCurrentLevel(hostCard, hostPhysical)
  };
}
