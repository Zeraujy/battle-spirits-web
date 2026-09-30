import { getFieldSymbols, fieldCards, getDatabaseCard, isCoreLockedNexus } from "./selectors.js";
import { getContinuousCardCollectionModifier, getContinuousCardNumericModifier } from "./effectEngine/modifierResolver.js";

export function calculateReduction(match, playerId, card, cardIndex) {
  const field = { ...getFieldSymbols(match, playerId, cardIndex) };
  const bonusReductionSymbols = getContinuousCardCollectionModifier(match, card, playerId, "summonReductionSymbols", []);
  for (const symbol of bonusReductionSymbols) field[symbol] = Number(field[symbol] || 0) + 1;
  const dynamicReduction = card?.dynamicReduction || null;
  let dynamicExtraReductions = [];
  if (dynamicReduction?.extraSymbolsPerFieldMatch?.selector && dynamicReduction.extraSymbolsPerFieldMatch.symbol) {
    const rule = dynamicReduction.extraSymbolsPerFieldMatch;
    const matches = fieldCards(match.players[playerId]).filter((physical) => {
      if (physical.pendingDestruction || physical.combinedWith) return false;
      const db = getDatabaseCard(cardIndex, physical);
      const selector = rule.selector || {};
      const types = selector.cardTypes || (selector.cardType ? [selector.cardType] : []);
      if (types.length && !types.includes(db?.cardType)) return false;
      const families = selector.families || (selector.family ? [selector.family] : []);
      if (families.length && !families.some((family) => (db?.families || []).includes(family))) return false;
      return true;
    }).length;
    dynamicExtraReductions = Array.from({ length: matches * Math.max(1, Number(rule.perMatch || 1)) }, () => rule.symbol);
  }
  if (dynamicReduction?.includeTrashSymbols === true || getContinuousCardNumericModifier(match, card, playerId, "useTrashSymbolsForReduction") > 0) {
    for (const physical of match.players?.[playerId]?.trash || []) {
      const db = getDatabaseCard(cardIndex, physical);
      for (const symbol of db?.symbols || []) field[symbol] = Number(field[symbol] || 0) + 1;
    }
  }
  const ignoreReduction = getContinuousCardNumericModifier(match, card, playerId, "ignoreReductionSymbols") > 0;
  const reductions = ignoreReduction ? [] : [...(card?.reduction || []), ...dynamicExtraReductions];
  let applied = 0;
  const used = {};
  for (const reduction of reductions) {
    if (reduction === "all" || reduction === "rainbow" || reduction === "six") {
      const possible = Object.entries(field).find(([color, count]) => color && (used[color] || 0) < count);
      if (possible) {
        used[possible[0]] = (used[possible[0]] || 0) + 1;
        applied += 1;
      }
      continue;
    }
    const available = Number(field[reduction] || 0) - Number(used[reduction] || 0);
    if (available > 0) {
      used[reduction] = (used[reduction] || 0) + 1;
      applied += 1;
    }
  }
  const printed = Number(card?.cost || 0);
  const printedOverride = getContinuousCardNumericModifier(match, card, playerId, "printedCostOverride");
  const costModifier = getContinuousCardNumericModifier(match, card, playerId, "cost");
  const effectiveBase = printedOverride > 0 ? printedOverride : printed;
  const effectivePrinted = Math.max(0, effectiveBase + Number(costModifier || 0));
  return { printed, effectivePrinted, applied, payable: Math.max(0, effectivePrinted - applied), fieldSymbols: field };
}

export function getSpendableCoreSources(match, playerId, cardIndex, { preserveMinimum = true } = {}) {
  const player = match.players[playerId];
  const sources = [];
  if (player.reserve > 0) sources.push({ type: "reserve", regular: player.reserve, soul: player.soulCore?.zone === "reserve" });
  for (const physical of fieldCards(player)) {
    if (physical.combinedWith) continue;
    const db = getDatabaseCard(cardIndex, physical);
    if (isCoreLockedNexus(db)) continue;
    const total = Number(physical.cores?.regular || 0) + (physical.cores?.soul ? 1 : 0);
    const requirements = (db?.levels || []).map((l) => Number(l.cores)).filter(Number.isFinite);
    const min = ["spirit", "ultimate", "brave"].includes(db?.cardType)
      ? (requirements.length ? Math.min(...requirements) : 1)
      : 0;
    const safeRegular = Math.max(0, Number(physical.cores?.regular || 0) - (preserveMinimum ? Math.max(0, min - (physical.cores?.soul ? 1 : 0)) : 0));
    const soulSpendable = Boolean(physical.cores?.soul) && (!preserveMinimum || total - 1 >= min);
    if (safeRegular > 0 || soulSpendable) {
      sources.push({ type: "card", instanceId: physical.instanceId, regular: safeRegular, soul: soulSpendable });
    }
  }
  return sources;
}

export function autoBuildPayment(match, playerId, amount, cardIndex) {
  let remaining = amount;
  const payment = [];
  const safe = getSpendableCoreSources(match, playerId, cardIndex, { preserveMinimum: true });
  const reserve = safe.find((s) => s.type === "reserve");
  if (reserve) {
    const use = Math.min(remaining, reserve.regular);
    if (use) payment.push({ source: "reserve", regular: use, soul: false });
    remaining -= use;
    if (remaining > 0 && reserve.soul) {
      payment.push({ source: "reserve", regular: 0, soul: true });
      remaining -= 1;
    }
  }
  for (const source of safe.filter((s) => s.type === "card")) {
    if (remaining <= 0) break;
    const use = Math.min(remaining, source.regular);
    if (use) payment.push({ source: "card", instanceId: source.instanceId, regular: use, soul: false });
    remaining -= use;
    if (remaining > 0 && source.soul) {
      payment.push({ source: "card", instanceId: source.instanceId, regular: 0, soul: true });
      remaining -= 1;
    }
  }
  return remaining <= 0 ? payment : null;
}
