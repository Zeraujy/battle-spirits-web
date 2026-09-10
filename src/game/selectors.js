import { FIELD_ZONES } from "./constants.js";
import { normalizeCard } from "./cardAdapter.js";
import { getEffectBPBonus } from "./effectEngine/modifierResolver.js";

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
  const total = Number(physicalCard?.cores?.regular || 0) + (physicalCard?.cores?.soul ? 1 : 0);
  const levels = (card?.levels || []).filter((l) => Number(l.cores) <= total).sort((a, b) => a.level - b.level);
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
  let bp = getBaseBP(card, physicalCard) + Number(physicalCard.temporaryBP || 0) + getEffectBPBonus(physicalCard);
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
  return symbols.filter(Boolean);
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
    const card = getDatabaseCard(cardIndex, physical);
    for (const symbol of card?.symbols || []) counts[symbol] = (counts[symbol] || 0) + 1;
    if (card?.cardType !== "brave") {
      const brave = getBraveAttachment(match, physical.instanceId);
      if (brave) {
        const braveCard = getDatabaseCard(cardIndex, brave);
        for (const symbol of braveCard?.symbols || []) counts[symbol] = (counts[symbol] || 0) + 1;
      }
    }
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
