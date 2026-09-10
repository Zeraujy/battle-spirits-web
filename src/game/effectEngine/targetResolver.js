import { fieldCards, getBraveAttachment, getDatabaseCard, getEffectiveBP } from "../selectors.js";
import { otherPlayerId } from "../utils.js";

function normalizeOwner(owner) {
  const value = String(owner || "self").toLowerCase();
  if (["opponent", "enemy", "other"].includes(value)) return "opponent";
  if (["any", "either", "both"].includes(value)) return "any";
  return "self";
}

function resolveOwnerPlayerIds(match, sourcePlayerId, selector = {}) {
  const owner = normalizeOwner(selector.owner ?? selector.controller ?? selector.player ?? selector.side);
  if (owner === "opponent") return [otherPlayerId(match, sourcePlayerId)].filter(Boolean);
  if (owner === "any") return Object.keys(match.players || {});
  return [sourcePlayerId].filter(Boolean);
}

function candidateMatches(match, cardIndex, candidate, selector = {}, context = {}) {
  const { physical, card, playerId, zone } = candidate;
  if (!physical || !card) return false;
  if (selector.excludeSource && physical.instanceId === context.sourceInstanceId) return false;
  if (selector.instanceId && physical.instanceId !== selector.instanceId) return false;

  const zones = selector.zones || (selector.zone ? [selector.zone] : null);
  if (zones && !zones.includes(zone)) return false;
  if (selector.cardType && card.cardType !== selector.cardType) return false;
  if (selector.cardTypes && !selector.cardTypes.includes(card.cardType)) return false;
  if (selector.color && !(card.colors || []).includes(selector.color)) return false;
  if (selector.colors && !selector.colors.some((color) => (card.colors || []).includes(color))) return false;
  if (selector.family && !(card.families || []).includes(selector.family)) return false;
  if (selector.families && !selector.families.some((family) => (card.families || []).includes(family))) return false;
  if (selector.minimumCost != null && Number(card.cost || 0) < Number(selector.minimumCost)) return false;
  if (selector.maximumCost != null && Number(card.cost || 0) > Number(selector.maximumCost)) return false;
  if (selector.minCost != null && Number(card.cost || 0) < Number(selector.minCost)) return false;
  if (selector.maxCost != null && Number(card.cost || 0) > Number(selector.maxCost)) return false;

  if (["spirits", "nexuses", "other"].includes(zone)) {
    const bp = getEffectiveBP(match, cardIndex, physical);
    if (selector.minimumBP != null && bp < Number(selector.minimumBP)) return false;
    if (selector.maximumBP != null && bp > Number(selector.maximumBP)) return false;
    if (selector.minBP != null && bp < Number(selector.minBP)) return false;
    if (selector.maxBP != null && bp > Number(selector.maxBP)) return false;
    if (selector.exhausted === true && !physical.exhausted) return false;
    if (selector.refreshed === true && physical.exhausted) return false;
    if (selector.notCombinedWithBrave === true && getBraveAttachment(match, physical.instanceId)) return false;
  }

  if (selector.playerId && selector.playerId !== playerId) return false;
  return true;
}

export function collectFieldTargets(match, cardIndex, selector = {}, context = {}) {
  const candidates = [];
  for (const playerId of resolveOwnerPlayerIds(match, context.sourcePlayerId, selector)) {
    const player = match.players?.[playerId];
    if (!player) continue;
    for (const physical of fieldCards(player)) {
      if (physical.combinedWith && selector.includeCombined !== true) continue;
      let zone = "spirits";
      if ((player.field?.nexuses || []).some((card) => card.instanceId === physical.instanceId)) zone = "nexuses";
      else if ((player.field?.other || []).some((card) => card.instanceId === physical.instanceId)) zone = "other";
      const candidate = { playerId, zone, physical, card: getDatabaseCard(cardIndex, physical) };
      if (candidateMatches(match, cardIndex, candidate, selector, context)) candidates.push(candidate);
    }
  }
  return candidates;
}

export function collectTrashTargets(match, cardIndex, selector = {}, context = {}) {
  const candidates = [];
  for (const playerId of resolveOwnerPlayerIds(match, context.sourcePlayerId, selector)) {
    const player = match.players?.[playerId];
    if (!player) continue;
    for (const physical of player.trash || []) {
      const candidate = { playerId, zone: "trash", physical, card: getDatabaseCard(cardIndex, physical) };
      if (candidateMatches(match, cardIndex, candidate, selector, context)) candidates.push(candidate);
    }
  }
  return candidates;
}

function sourceTarget(context) {
  if (!context.sourcePhysical) return null;
  return {
    playerId: context.sourcePlayerId,
    zone: context.sourceZone || null,
    physical: context.sourcePhysical,
    card: context.sourceCard
  };
}

export function resolveActionTargets(match, action = {}, cardIndex, context = {}) {
  const directId = action.instanceId ?? action.targetInstanceId;
  if (directId) {
    const all = [
      ...collectFieldTargets(match, cardIndex, { instanceId: directId, owner: "any", includeCombined: true }, context),
      ...collectTrashTargets(match, cardIndex, { instanceId: directId, owner: "any" }, context)
    ];
    return all.length ? { status: "resolved", targets: [all[0]] } : { status: "none", targets: [] };
  }

  const rawTarget = action.target ?? action.selector ?? action.targets ?? null;
  const rawTargetString = typeof rawTarget === "string" ? rawTarget.toLowerCase() : "";
  if (["self", "source"].includes(rawTargetString)) {
    const source = sourceTarget(context);
    return source ? { status: "resolved", targets: [source] } : { status: "none", targets: [] };
  }
  if (["selected", "selection"].includes(rawTargetString)) {
    const selected = context.selectedTargets || [];
    return selected.length ? { status: "resolved", targets: selected } : { status: "manual", targets: [], reason: "Nenhum alvo selecionado está disponível." };
  }

  if (!rawTarget && context.selectionResolved === true) {
    return { status: "resolved", targets: context.selectedTargets || [] };
  }
  if (!rawTarget && context.selectedTargets?.length) return { status: "resolved", targets: context.selectedTargets };
  if (!rawTarget && context.sourcePhysical) {
    const source = sourceTarget(context);
    return source ? { status: "resolved", targets: [source] } : { status: "none", targets: [] };
  }

  const selector = typeof rawTarget === "object" && rawTarget
    ? rawTarget
    : (typeof action.selector === "object" && action.selector ? action.selector : {});
  const selectionType = String(action.type || "");
  const candidates = selectionType === "selectTrashTarget"
    ? collectTrashTargets(match, cardIndex, selector, context)
    : collectFieldTargets(match, cardIndex, selector, context);

  if (selectionType === "selectMultipleTargets") {
    if (!candidates.length && action.allowZero) return { status: "resolved", targets: [] };
    return {
      status: "manual",
      targets: candidates,
      requested: Number(action.maxTargets ?? candidates.length),
      minimum: action.allowZero ? 0 : 1,
      reason: "Escolha manual de múltiplos alvos necessária."
    };
  }

  const selectAll = action.all === true || selector.all === true || [
    "destroyAllMatching",
    "refreshAllMatching",
    "exhaustAllMatching",
    "returnAllMatchingToHand"
  ].includes(selectionType);
  if (selectAll) return { status: "resolved", targets: candidates };

  const minimum = Math.max(0, Number(action.minTargets ?? selector.minCount ?? selector.minimum ?? (action.allowZero ? 0 : 1)));
  const requested = Math.max(minimum, Number(action.targetCount ?? action.selectCount ?? action.maxTargets ?? selector.count ?? selector.maxCount ?? 1));
  if (candidates.length === 0) return minimum === 0 ? { status: "resolved", targets: [] } : { status: "none", targets: [] };
  if (candidates.length === requested) return { status: "resolved", targets: candidates };
  if (requested === 1 && candidates.length === 1) return { status: "resolved", targets: candidates };
  return { status: "manual", targets: candidates, requested, minimum, reason: `Escolha manual de ${requested} alvo(s) necessária.` };
}
