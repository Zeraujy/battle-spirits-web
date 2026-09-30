import { FIELD_ZONES } from "./constants.js";
import { normalizeCard } from "./cardAdapter.js";
import {
  applyContinuousCollectionModifiers,
  getContinuousNumericModifier,
  getEffectBPBonus
} from "./effectEngine/modifierResolver.js";

export function findPhysicalCard(match, instanceId) {
  for (const [playerId, player] of Object.entries(match.players || {})) {
    const handIndex = player.hand.findIndex((c) => c.instanceId === instanceId);
    if (handIndex >= 0) return { playerId, zone: "hand", index: handIndex, card: player.hand[handIndex] };
    const trashIndex = player.trash.findIndex((c) => c.instanceId === instanceId);
    if (trashIndex >= 0) return { playerId, zone: "trash", index: trashIndex, card: player.trash[trashIndex] };
    const revealedIndex = (player.revealed || []).findIndex((c) => c.instanceId === instanceId);
    if (revealedIndex >= 0) return { playerId, zone: "revealed", index: revealedIndex, card: player.revealed[revealedIndex] };
    for (const zone of FIELD_ZONES) {
      const index = (player.field?.[zone] || []).findIndex((c) => c.instanceId === instanceId);
      if (index >= 0) return { playerId, zone, index, card: player.field[zone][index] };
    }
    if (player.burst?.instanceId === instanceId) return { playerId, zone: "burst", index: 0, card: player.burst };
  }
  return null;
}

export function getDatabaseCard(cardIndex, physicalCard) {
  return cardIndex.get(physicalCard?.cardId) ?? null;
}

export function getCurrentLevel(card, physicalCard) {
  const printed = [...(card?.levels || [])].sort((a, b) => Number(a.level || 0) - Number(b.level || 0));
  const forced = (physicalCard?.effectModifiers || []).filter((m) => m?.type === "forcedLevel").at(-1);
  if (forced) {
    if (forced.maxLevel === true) return printed.at(-1) ?? null;
    const exact = printed.find((level) => Number(level.level || 0) === Number(forced.level || 0));
    if (exact) return exact;
  }
  const total = Number(physicalCard?.cores?.regular || 0) + (physicalCard?.cores?.soul ? 1 : 0);
  const levels = printed.filter((l) => Number(l.cores) <= total);
  return levels.at(-1) ?? null;
}

export function getBaseBP(card, physicalCard) {
  return Number(getCurrentLevel(card, physicalCard)?.bp || 0);
}

export function getBraveAttachment(match, hostInstanceId) {
  for (const player of Object.values(match.players || {})) {
    for (const physical of player.field?.other || []) {
      if (physical.cardType === "brave" && physical.combinedWith === hostInstanceId) return physical;
    }
  }
  return null;
}

export function getEffectiveBP(match, cardIndex, physicalCard) {
  const card = getDatabaseCard(cardIndex, physicalCard);
  let bp = getBaseBP(card, physicalCard) + Number(physicalCard.temporaryBP || 0) + getEffectBPBonus(physicalCard) + getContinuousNumericModifier(match, cardIndex, physicalCard, "bp");
  const brave = getBraveAttachment(match, physicalCard.instanceId);
  if (brave) {
    const braveCard = getDatabaseCard(cardIndex, brave);
    bp += Number(braveCard?.braveBP || braveCard?.bpPlus || 0);
  }
  return Math.max(0, bp);
}

export function getEffectiveSymbols(match, cardIndex, physicalCard) {
  const card = getDatabaseCard(cardIndex, physicalCard);
  const symbols = [...(card?.symbols || [])];
  const brave = getBraveAttachment(match, physicalCard.instanceId);
  if (brave) {
    const braveCard = getDatabaseCard(cardIndex, brave);
    symbols.push(...(braveCard?.symbols || []));
  }
  return applyContinuousCollectionModifiers(match, cardIndex, physicalCard, "symbols", symbols.filter(Boolean));
}

export function getEffectiveCost(match, cardIndex, physicalCard) {
  const card = getDatabaseCard(cardIndex, physicalCard);
  let cost = Number(card?.cost || 0);
  const override = getContinuousNumericModifier(match, cardIndex, physicalCard, "printedCostOverride");
  if (override > 0) cost = override;
  const brave = getBraveAttachment(match, physicalCard?.instanceId);
  if (brave) {
    const braveCard = getDatabaseCard(cardIndex, brave);
    cost += Number(braveCard?.cost || 0);
  }
  return Math.max(0, cost + getContinuousNumericModifier(match, cardIndex, physicalCard, "cost"));
}

export function getEffectiveColors(match, cardIndex, physicalCard) {
  const card = getDatabaseCard(cardIndex, physicalCard);
  const values = [...(card?.colors || [])];
  const brave = getBraveAttachment(match, physicalCard?.instanceId);
  if (brave) {
    const braveCard = getDatabaseCard(cardIndex, brave);
    values.push(...(braveCard?.colors || []));
  }
  return applyContinuousCollectionModifiers(match, cardIndex, physicalCard, "colors", [...new Set(values.filter(Boolean))]);
}

export function getEffectiveFamilies(match, cardIndex, physicalCard) {
  const card = getDatabaseCard(cardIndex, physicalCard);
  // Regra oficial de Brave: ao combinar, BP+, Cost, cor e símbolo são
  // adicionados ao alvo, mas o nome e a Família do alvo não mudam.
  return [...new Set((card?.families || []).filter(Boolean))];
}

export function fieldCards(player) {
  return [
    ...(player.field?.spirits || []),
    ...(player.field?.nexuses || []),
    ...(player.field?.other || [])
  ];
}

export function getFieldSymbols(match, playerId, cardIndex) {
  const counts = {};
  const player = match.players[playerId];
  for (const physical of fieldCards(player)) {
    if (physical.pendingDestruction || physical.combinedWith) continue;
    for (const symbol of getEffectiveSymbols(match, cardIndex, physical)) counts[symbol] = (counts[symbol] || 0) + 1;
  }
  return counts;
}


export function isCoreLockedNexus(card) {
  if (card?.cardType !== "nexus") return false;
  const text = [...(card.families || []), ...(card.subtypes || [])].join(" ").toLowerCase();
  return text.includes("grandwalker") || text.includes("grandstone") || text.includes("創界神") || text.includes("創界石");
}

export function isBattleCapable(card) {
  return ["spirit", "ultimate", "brave"].includes(normalizeCard(card).cardType);
}
