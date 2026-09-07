import { calculateReduction, autoBuildPayment } from "./cost.js";
import { payCoreCost, checkDepletion } from "./cores.js";
import { findPhysicalCard, getDatabaseCard } from "./selectors.js";
import { addFieldCard, removeHandCard, updateFieldCard } from "./zones.js";
import { appendLog } from "./utils.js";
import { conditionMatches } from "./brave.js";
import { checkSummoningCondition } from "./specialRules.js";

function minimumCores(card) {
  if (card.cardType === "nexus") return 0;
  const reqs = (card.levels || []).map((l) => Number(l.cores)).filter(Number.isFinite);
  if (!reqs.length) return ["spirit", "ultimate", "brave"].includes(card.cardType) ? 1 : 0;
  return Math.min(...reqs);
}

function takePlacementCores(match, playerId, amount, cardIndex) {
  let player = match.players[playerId];
  let remaining = amount;
  let regular = 0;
  let soul = false;
  const touched = new Set();

  const reserveUse = Math.min(player.reserve, remaining);
  player = { ...player, reserve: player.reserve - reserveUse };
  regular += reserveUse;
  remaining -= reserveUse;
  if (remaining > 0 && player.soulCore?.zone === "reserve") {
    soul = true;
    player = { ...player, soulCore: { zone: "moving", instanceId: null } };
    remaining -= 1;
  }
  if (remaining > 0) {
    for (const zone of ["spirits", "nexuses", "other"]) {
      for (const physical of player.field[zone]) {
        if (remaining <= 0) break;
        const usable = Number(physical.cores?.regular || 0);
        if (!usable) continue;
        const use = Math.min(remaining, usable);
        player = updateFieldCard(player, physical.instanceId, (c) => ({
          ...c,
          cores: { ...c.cores, regular: Number(c.cores?.regular || 0) - use }
        }));
        regular += use;
        remaining -= use;
        touched.add(physical.instanceId);
      }
    }
  }
  if (remaining > 0) return { ok: false, error: "Não há Cores suficientes para manter o Lv mínimo da carta invocada." };
  let next = { ...match, players: { ...match.players, [playerId]: player } };
  for (const id of touched) next = checkDepletion(next, playerId, id, cardIndex);
  return { ok: true, match: next, cores: { regular, soul } };
}

export function summonFromHand(match, playerId, instanceId, cardIndex, options = {}) {
  if (match.phase !== "main" || match.activePlayerId !== playerId || match.battle) return { ok: false, error: "Invocações normais são feitas no seu Main Step." };
  const ctx = findPhysicalCard(match, instanceId);
  if (!ctx || ctx.playerId !== playerId || ctx.zone !== "hand") return { ok: false, error: "Carta não encontrada na mão." };
  const card = getDatabaseCard(cardIndex, ctx.card);
  if (!["spirit", "ultimate", "brave"].includes(card?.cardType)) return { ok: false, error: "Esta carta não é invocável por esta ação." };

  const summonCondition = checkSummoningCondition(match, playerId, card, cardIndex, options);
  if (!summonCondition.ok) return summonCondition;

  const directHostId = card.cardType === "brave" ? options.directCombineHostInstanceId : null;
  let directHost = null;
  if (directHostId) {
    const hostCtx = findPhysicalCard(match, directHostId);
    if (!hostCtx || hostCtx.playerId !== playerId || hostCtx.zone !== "spirits") return { ok: false, error: "Alvo de Direct Combine inválido." };
    const hostCard = getDatabaseCard(cardIndex, hostCtx.card);
    if (!["spirit", "ultimate"].includes(hostCard?.cardType)) return { ok: false, error: "O alvo não pode receber este Brave." };
    const alreadyCombined = (match.players[playerId].field.other || []).some((b) => b.combinedWith === directHostId);
    if (alreadyCombined) return { ok: false, error: "O alvo já possui um Brave combinado." };
    if (!conditionMatches(card, hostCard, options)) return { ok: false, error: "A condição de combinação do Brave não foi cumprida." };
    directHost = hostCtx;
  }

  const cost = calculateReduction(match, playerId, card, cardIndex);
  const payment = options.payment ?? autoBuildPayment(match, playerId, cost.payable, cardIndex);
  if (!payment && cost.payable > 0) return { ok: false, error: "Cores insuficientes para pagar o custo sem Depletion automática. Use pagamento avançado/manual." };
  const paid = payCoreCost(match, playerId, payment || [], cost.payable, cardIndex);
  if (!paid.ok) return paid;

  const afterPayCtx = findPhysicalCard(paid.match, instanceId);
  if (!afterPayCtx || afterPayCtx.zone !== "hand") return { ok: false, error: "A carta deixou a mão durante o pagamento." };
  if (directHost) {
    let player = paid.match.players[playerId];
    const removed = removeHandCard(player, instanceId);
    player = removed.player;
    const hostAfterPay = findPhysicalCard(paid.match, directHostId);
    if (!hostAfterPay || hostAfterPay.playerId !== playerId || hostAfterPay.zone !== "spirits") return { ok: false, error: "O alvo do Direct Combine deixou o campo durante o pagamento." };
    const physical = {
      ...removed.card,
      cardType: "brave",
      exhausted: Boolean(hostAfterPay?.card?.exhausted),
      cores: { regular: 0, soul: false },
      combinedWith: directHostId
    };
    player = addFieldCard(player, "other", physical);
    const next = appendLog({ ...paid.match, players: { ...paid.match.players, [playerId]: player } }, `${player.name} invocou ${card.namePT || card.nameEN || card.id} em Direct Combine.`, "action");
    return { ok: true, match: next, manualResolutionNeeded: (card.effects || []).some((e) => ["whenSummoned", "onSummon"].includes(e.timing) && !(e.operations?.length)) };
  }

  const min = minimumCores(card);
  const placed = takePlacementCores(paid.match, playerId, Number(options.coresToPlace ?? min), cardIndex);
  if (!placed.ok) return placed;

  let player = placed.match.players[playerId];
  const removed = removeHandCard(player, instanceId);
  player = removed.player;
  let physical = {
    ...removed.card,
    cardType: card.cardType,
    exhausted: false,
    cores: placed.cores,
    combinedWith: null
  };
  if (placed.cores.soul) player = { ...player, soulCore: { zone: "card", instanceId: physical.instanceId } };
  const zone = card.cardType === "brave" ? "other" : "spirits";
  player = addFieldCard(player, zone, physical);
  let next = { ...placed.match, players: { ...placed.match.players, [playerId]: player } };
  next = appendLog(next, `${player.name} invocou ${card.namePT || card.nameEN || card.id}.`, "action");
  return { ok: true, match: next, manualResolutionNeeded: (card.effects || []).some((e) => ["whenSummoned", "onSummon"].includes(e.timing) && !(e.operations?.length)) };
}

export function deployNexus(match, playerId, instanceId, cardIndex, options = {}) {
  if (match.phase !== "main" || match.activePlayerId !== playerId || match.battle) return { ok: false, error: "Nexus são colocados no seu Main Step." };
  const ctx = findPhysicalCard(match, instanceId);
  if (!ctx || ctx.playerId !== playerId || ctx.zone !== "hand") return { ok: false, error: "Carta não encontrada na mão." };
  const card = getDatabaseCard(cardIndex, ctx.card);
  if (card?.cardType !== "nexus") return { ok: false, error: "A carta não é um Nexus." };
  const cost = calculateReduction(match, playerId, card, cardIndex);
  const payment = options.payment ?? autoBuildPayment(match, playerId, cost.payable, cardIndex);
  if (!payment && cost.payable > 0) return { ok: false, error: "Cores insuficientes para o custo." };
  const paid = payCoreCost(match, playerId, payment || [], cost.payable, cardIndex);
  if (!paid.ok) return paid;
  let player = paid.match.players[playerId];
  const removed = removeHandCard(player, instanceId);
  player = addFieldCard(removed.player, "nexuses", { ...removed.card, cardType: "nexus", cores: { regular: 0, soul: false } });
  let next = { ...paid.match, players: { ...paid.match.players, [playerId]: player } };
  next = appendLog(next, `${player.name} colocou ${card.namePT || card.nameEN || card.id}.`, "action");
  return { ok: true, match: next };
}
