import { applyGameAction } from "./reducer.js";
import { getLegalActions } from "./legalActions.js";
import {
  findPhysicalCard,
  getCurrentLevel,
  getDatabaseCard,
  getEffectiveBP,
  getEffectiveSymbols,
  isCoreLockedNexus
} from "./selectors.js";
import { calculateReduction } from "./cost.js";
import { getBurstActivationEvent, isBurstCard } from "./burstRules.js";
import { otherPlayerId } from "./utils.js";

const DIFFICULTIES = new Set(["easy", "normal", "hard"]);
const PROGRESS_ACTIONS = new Set([
  "ADVANCE_PHASE",
  "PASS_FLASH",
  "DECLINE_BLOCK",
  "RESOLVE_BATTLE",
  "RESOLVE_ULTIMATE_TRIGGER",
  "PASS_TRIGGER_COUNTER",
  "PASS_BURST",
  "CONFIRM_MANUAL_PLAY",
  "CONFIRM_MANUAL_COST"
]);
const LOOP_SENSITIVE_ACTIONS = new Set([
  "COMBINE_BRAVE",
  "SEPARATE_BRAVE",
  "EXCHANGE_BRAVE",
  "SET_MIRAGE",
  "MOVE_CORE"
]);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function numeric(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function minimumCoresForCard(card) {
  if (!card || card.cardType === "nexus" || card.cardType === "magic") return 0;
  if (!["spirit", "ultimate", "brave"].includes(card.cardType)) return 0;
  const requirements = (card.levels || [])
    .map((level) => Number(level.cores))
    .filter(Number.isFinite);
  return requirements.length ? Math.min(...requirements) : 1;
}

function physicalCoreCount(physical) {
  return Number(physical?.cores?.regular || 0) + (physical?.cores?.soul ? 1 : 0);
}

function activeLevelEffectCount(card, levelNumber) {
  if (!card || !levelNumber) return 0;
  return (card.effects || []).filter((effect) => {
    if (!Array.isArray(effect?.levels) || !effect.levels.length) return false;
    return effect.levels.map(Number).includes(Number(levelNumber));
  }).length;
}

function nextPrintedLevel(card, physical) {
  const current = getCurrentLevel(card, physical);
  const total = physicalCoreCount(physical);
  return (card?.levels || [])
    .filter((level) => Number(level.level || 0) > Number(current?.level || 0) && Number(level.cores) > total)
    .sort((a, b) => Number(a.cores) - Number(b.cores))[0] || null;
}

function levelProgressBonus(card, physical) {
  const current = getCurrentLevel(card, physical);
  const next = nextPrintedLevel(card, physical);
  if (!current || !next) return 0;
  const invested = Math.max(0, physicalCoreCount(physical) - Number(current.cores || 0));
  if (!invested) return 0;
  // A small value for Cores already committed toward the next threshold keeps
  // multi-Core level-up plans coherent without treating partial levels as BP.
  return invested * 2.4;
}

function levelSafeFlexibleCores(match, playerId, cardIndex) {
  const player = match.players?.[playerId];
  if (!player) return 0;

  let total = Number(player.reserve || 0) + (player.soulCore?.zone === "reserve" ? 1 : 0);
  for (const physical of fieldCards(player)) {
    if (physical.combinedWith || physical.pendingDestruction) continue;
    const card = getDatabaseCard(cardIndex, physical);
    if (!card || isCoreLockedNexus(card)) continue;
    const current = getCurrentLevel(card, physical);
    const required = Number(current?.cores ?? minimumCoresForCard(card));
    const soul = physical.cores?.soul ? 1 : 0;
    const regular = Number(physical.cores?.regular || 0);
    const regularNeeded = Math.max(0, required - soul);
    total += Math.max(0, regular - regularNeeded);
    if (physical.cores?.soul && physicalCoreCount(physical) - 1 >= required) total += 1;
  }
  return total;
}

function mainPlayResourceNeed(match, playerId, physical, cardIndex) {
  const card = getDatabaseCard(cardIndex, physical);
  if (!card) return Infinity;
  if (!["spirit", "ultimate", "brave", "nexus", "magic"].includes(card.cardType)) return Infinity;
  const cost = calculateReduction(match, playerId, card, cardIndex);
  return cost.payable + minimumCoresForCard(card);
}

function resourceOutlookScore(match, playerId, cardIndex) {
  const player = match.players?.[playerId];
  if (!player) return 0;

  const flexible = levelSafeFlexibleCores(match, playerId, cardIndex);
  let playable = 0;
  let appliedReductions = 0;
  let freePlays = 0;

  for (const physical of player.hand || []) {
    const card = getDatabaseCard(cardIndex, physical);
    if (!card) continue;
    if (["spirit", "ultimate", "brave", "nexus", "magic"].includes(card.cardType)) {
      const cost = calculateReduction(match, playerId, card, cardIndex);
      appliedReductions += Number(cost.applied || 0);
      const need = cost.payable + minimumCoresForCard(card);
      if (need <= flexible) playable += 1;
      if (cost.printed > 0 && cost.payable === 0) freePlays += 1;
    }
  }

  let score = Math.min(playable, 5) * 6.5;
  score += Math.min(appliedReductions, 8) * 2.2;
  score += Math.min(freePlays, 3) * 3.5;
  if (player.soulCore?.zone === "reserve") score += 5;
  if (match.phase === "main" && match.activePlayerId === playerId && (player.hand?.length || 0) && flexible === 0) score -= 8;
  return score;
}

function unlockedLevelEffectDelta(card, beforePhysical, afterPhysical) {
  const beforeLevel = Number(getCurrentLevel(card, beforePhysical)?.level || 0);
  const afterLevel = Number(getCurrentLevel(card, afterPhysical)?.level || 0);
  if (afterLevel <= beforeLevel) return 0;
  return Math.max(0, activeLevelEffectCount(card, afterLevel) - activeLevelEffectCount(card, beforeLevel));
}

function safeRandom(random) {
  try {
    const value = Number(random?.());
    return Number.isFinite(value) ? clamp(value, 0, 0.999999) : 0.5;
  } catch {
    return 0.5;
  }
}

function hashText(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function deterministicDecisionRandom(match, playerId) {
  if (match?.randomSeed == null) return Math.random;

  let state = hashText([
    match.randomSeed,
    playerId,
    match.turnNumber,
    match.phase,
    match.actionLog?.length || 0,
    match.battle?.stage || "",
    match.pendingEffectDecision?.id || "",
    match.burstOpportunity?.id || ""
  ].join("|")) || 0x9e3779b9;

  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

export function getMatchActor(match) {
  if (!match || match.winnerId) return null;

  if (match.pendingEffectDecision?.playerId) {
    return match.pendingEffectDecision.playerId;
  }

  if (match.burstOpportunity?.playerId) {
    return match.burstOpportunity.playerId;
  }

  if (match.battle?.stage === "ultimateTrigger" && match.battle?.ultimateTrigger) {
    const trigger = match.battle.ultimateTrigger;
    if (trigger.status === "counterWindow" && trigger.counterPlayerId) {
      return trigger.counterPlayerId;
    }
    if (trigger.controllerPlayerId) return trigger.controllerPlayerId;
  }

  if (match.battle?.flash?.priorityPlayerId) {
    return match.battle.flash.priorityPlayerId;
  }

  if (match.battle?.stage === "block") {
    return match.battle.defenderPlayerId;
  }

  return match.activePlayerId || null;
}

function fieldCards(player) {
  return [
    ...(player?.field?.spirits || []),
    ...(player?.field?.nexuses || []),
    ...(player?.field?.other || [])
  ];
}

function cardBoardValue(match, playerId, physical, cardIndex) {
  const card = getDatabaseCard(cardIndex, physical);
  if (!card) return 0;

  const type = String(card.cardType || physical.cardType || "").toLowerCase();
  const cost = numeric(card.cost);
  const regularCores = numeric(physical.cores?.regular);
  const soulBonus = physical.cores?.soul ? 2.5 : 0;
  const readyBonus = physical.exhausted ? 0 : 4;
  const currentLevel = getCurrentLevel(card, physical);
  const levelEffectBonus = activeLevelEffectCount(card, currentLevel?.level) * 5.5;
  const progressBonus = levelProgressBonus(card, physical);

  if (type === "nexus") {
    return 20 + cost * 2 + regularCores * 1.2 + levelEffectBonus + progressBonus;
  }

  if (["spirit", "ultimate", "brave"].includes(type)) {
    const bp = numeric(getEffectiveBP(match, cardIndex, physical));
    const symbols = getEffectiveSymbols(match, cardIndex, physical)?.length || 0;
    let value = 18 + cost * 2.2 + bp / 420 + symbols * 9 + regularCores * 1.5 + soulBonus + readyBonus + levelEffectBonus + progressBonus;

    if (type === "ultimate") value += 8;
    if (type === "brave") value += 5;

    if (physical.combinedWith) {
      const host = findPhysicalCard(match, physical.combinedWith);
      if (host?.playerId === playerId) value += 14;
    }

    return value;
  }

  return 8 + cost;
}

/**
 * Static board evaluation from one player's perspective.
 * The opponent's hidden card identities are intentionally never inspected:
 * only hand/deck counts are used for the opponent.
 */
export function evaluateBoardState(match, playerId, cardIndex) {
  if (!match?.players?.[playerId]) return -1_000_000;

  const opponentId = otherPlayerId(match, playerId);
  const me = match.players[playerId];
  const opponent = match.players[opponentId];

  if (match.winnerId === playerId) return 1_000_000;
  if (match.winnerId === opponentId) return -1_000_000;

  let score = 0;

  score += (numeric(me.life) - numeric(opponent.life)) * 120;
  score += numeric(me.life) * 12;
  score -= numeric(opponent.life) * 8;

  score += (numeric(me.reserve) - numeric(opponent.reserve)) * 5;
  score += (numeric(me.trashCores) - numeric(opponent.trashCores)) * 2;

  score += (me.hand?.length || 0) * 7;
  score -= (opponent.hand?.length || 0) * 7;
  score += (me.deck?.length || 0) * 0.2;
  score -= (opponent.deck?.length || 0) * 0.2;

  for (const physical of fieldCards(me)) {
    score += cardBoardValue(match, playerId, physical, cardIndex);
  }
  for (const physical of fieldCards(opponent)) {
    score -= cardBoardValue(match, opponentId, physical, cardIndex);
  }

  // Only the evaluated player's own hidden hand is inspected here. The
  // opponent remains represented by public hand/deck counts only.
  score += resourceOutlookScore(match, playerId, cardIndex);

  if (me.burst) score += 22;
  if (opponent.burst) score -= 16;
  if (me.mirage) score += 18;
  if (opponent.mirage) score -= 16;

  if (match.activePlayerId === playerId) score += 4;

  return score;
}

function actionKey(action) {
  if (!action) return "";
  return JSON.stringify(action);
}

function repeatedActionPenalty(action, recentActionKeys = []) {
  if (!LOOP_SENSITIVE_ACTIONS.has(action?.type)) return 0;
  const key = actionKey(action);
  const repetitions = recentActionKeys.filter((item) => item === key).length;
  if (repetitions <= 0) return 0;
  return repetitions === 1 ? -80 : -1200;
}

function readyBattleCards(match, playerId, cardIndex, { includeExhausted = false } = {}) {
  const player = match.players?.[playerId];
  if (!player) return [];

  return [
    ...(player.field?.spirits || []),
    ...(player.field?.other || [])
  ].filter((physical) => {
    if (physical.combinedWith || physical.pendingDestruction) return false;
    if (!includeExhausted && physical.exhausted) return false;
    const card = getDatabaseCard(cardIndex, physical);
    return ["spirit", "ultimate", "brave"].includes(card?.cardType);
  });
}

function combatBodyValue(match, playerId, physical, cardIndex) {
  if (!physical) return 0;
  // cardBoardValue includes a small ready bonus. Removing it here makes this
  // value stable while comparing bodies that may become exhausted in combat.
  return Math.max(1, cardBoardValue(match, playerId, physical, cardIndex) - (physical.exhausted ? 0 : 4));
}

function combatSymbols(match, cardIndex, physical) {
  return Math.max(1, getEffectiveSymbols(match, cardIndex, physical)?.length || 1);
}

function guaranteedDamageFromAttackers(match, cardIndex, attackers, blockerCount) {
  if (!attackers?.length) return 0;
  const damages = attackers
    .map((physical) => combatSymbols(match, cardIndex, physical))
    .sort((a, b) => b - a);

  // Each ready blocker can stop at most one attack because it becomes
  // Exhausted after blocking. A perfect defender blocks the largest symbols.
  return damages.slice(Math.max(0, blockerCount)).reduce((sum, value) => sum + value, 0);
}

function nextTurnDefenseRisk(match, playerId, attackerInstanceId, cardIndex) {
  const me = match.players?.[playerId];
  const opponentId = otherPlayerId(match, playerId);
  const opponent = match.players?.[opponentId];
  if (!me || !opponent) return { penalty: 0, guaranteedDamage: 0, remainingBlockers: 0, threats: 0 };

  // The opponent refreshes at the beginning of their next turn, so even cards
  // that are currently Exhausted can become attackers. Our cards that attack
  // this turn remain Exhausted through that opposing attack step.
  const nextTurnThreats = readyBattleCards(match, opponentId, cardIndex, { includeExhausted: true });
  const remainingBlockers = readyBattleCards(match, playerId, cardIndex)
    .filter((physical) => physical.instanceId !== attackerInstanceId);

  const guaranteedDamage = guaranteedDamageFromAttackers(
    match,
    cardIndex,
    nextTurnThreats,
    remainingBlockers.length
  );

  const life = numeric(me.life);
  let penalty = 0;

  if (nextTurnThreats.length && guaranteedDamage >= life && life > 0) {
    penalty -= 2200;
  } else if (life <= 1 && nextTurnThreats.length > remainingBlockers.length) {
    penalty -= 520;
  } else if (life <= 2 && nextTurnThreats.length > remainingBlockers.length) {
    penalty -= 240;
  } else if (life <= 3 && remainingBlockers.length === 0 && nextTurnThreats.length) {
    penalty -= 110;
  }

  return {
    penalty,
    guaranteedDamage,
    remainingBlockers: remainingBlockers.length,
    threats: nextTurnThreats.length
  };
}

function projectedAttackExchange(match, playerId, attacker, blockers, cardIndex) {
  const opponentId = otherPlayerId(match, playerId);
  const attackerBP = numeric(getEffectiveBP(match, cardIndex, attacker));
  const attackerValue = combatBodyValue(match, playerId, attacker, cardIndex);
  const symbols = combatSymbols(match, cardIndex, attacker);
  const opponentLife = numeric(match.players?.[opponentId]?.life);

  // Defender may always decline unless a restriction says otherwise. For AI
  // planning, taking Life is valued as a cost, but an immediately lethal hit is
  // effectively unacceptable to the defender.
  const outcomes = [{
    kind: "decline",
    utility: opponentLife <= symbols ? 250_000 : 42 * symbols + (opponentLife <= 2 ? 36 : 0)
  }];

  for (const blocker of blockers) {
    const blockerBP = numeric(getEffectiveBP(match, cardIndex, blocker));
    const blockerValue = combatBodyValue(match, opponentId, blocker, cardIndex);
    let utility = 0;

    if (attackerBP > blockerBP) {
      // Attacker survives and removes a public opposing body.
      utility = blockerValue * 2.15;
    } else if (attackerBP < blockerBP) {
      // Defender can trade one exhausted blocker action for our attacker.
      utility = -attackerValue * 2.55;
    } else {
      // Mutual destruction. Positive only when the enemy body is worth more.
      utility = blockerValue * 1.65 - attackerValue * 1.75;
    }

    outcomes.push({ kind: "block", blocker, utility });
  }

  // The defender is assumed to choose the line that is worst for the attacker.
  return outcomes.sort((a, b) => a.utility - b.utility)[0] || { kind: "decline", utility: 0 };
}

function attackScore(match, playerId, action, cardIndex) {
  const ctx = findPhysicalCard(match, action.instanceId);
  if (!ctx?.card) return 0;

  const opponentId = otherPlayerId(match, playerId);
  const opponent = match.players[opponentId];
  const attacker = ctx.card;
  const attackerBP = numeric(getEffectiveBP(match, cardIndex, attacker));
  const symbols = combatSymbols(match, cardIndex, attacker);
  const opponentLife = numeric(opponent?.life);
  const attackers = readyBattleCards(match, playerId, cardIndex);
  const blockers = readyBattleCards(match, opponentId, cardIndex);
  const bodyValue = combatBodyValue(match, playerId, attacker, cardIndex);

  if (!blockers.length) {
    const lethal = opponentLife <= symbols;
    let score = lethal ? 250_000 : 92 + symbols * 38 + attackerBP / 850;

    // Battle Spirits rewards pressure, but an exhausted attacker cannot defend
    // on the opponent's next turn. Hard/Normal now understand that trade-off.
    if (!lethal) score += nextTurnDefenseRisk(match, playerId, action.instanceId, cardIndex).penalty;
    return score;
  }

  const guaranteedDamage = guaranteedDamageFromAttackers(match, cardIndex, attackers, blockers.length);
  const forcedLethalPlan = guaranteedDamage >= opponentLife && opponentLife > 0;
  const mustBlockNow = opponentLife <= symbols;
  const exchange = projectedAttackExchange(match, playerId, attacker, blockers, cardIndex);

  let score = exchange.utility;

  // Whole-attack-step pressure. When every defensive assignment still leaves
  // lethal damage, prefer feeding lower-value bodies into the first blocks and
  // preserve the better attackers for later in the sequence.
  if (forcedLethalPlan) {
    score += 18_000;
    score -= bodyValue * 0.7;
  } else if (mustBlockNow) {
    // A lethal-sized swing forces the defender to spend a blocker, even if the
    // attacking body itself is smaller. This opens later attacks in the step.
    score += 230 + Math.max(0, attackers.length - 1) * 28;
    score -= bodyValue * 0.22;
  } else {
    const attackPressure = Math.max(0, attackers.length - blockers.length);
    score += attackPressure * 38 + symbols * 10;
  }

  // If the best defensive reply simply destroys this attacker, treat a casual
  // non-lethal suicide as genuinely bad instead of attacking just because the
  // action is legal.
  if (!mustBlockNow && exchange.kind === "block" && exchange.utility < 0) {
    score -= 42;
  }

  if (!forcedLethalPlan && !mustBlockNow) {
    score += nextTurnDefenseRisk(match, playerId, action.instanceId, cardIndex).penalty;
  }

  return score;
}

function futureAttackPressure(match, defenderId, cardIndex) {
  const battle = match.battle;
  if (!battle?.attackerPlayerId) return { attackers: [], guaranteedDamage: 0 };

  const futureAttackers = readyBattleCards(match, battle.attackerPlayerId, cardIndex)
    .filter((physical) => physical.instanceId !== battle.attackerInstanceId);
  const currentBlockers = readyBattleCards(match, defenderId, cardIndex);
  const guaranteedDamage = guaranteedDamageFromAttackers(
    match,
    cardIndex,
    futureAttackers,
    currentBlockers.length
  );

  return { attackers: futureAttackers, guaranteedDamage };
}

function blockScore(match, playerId, action, cardIndex) {
  const battle = match.battle;
  if (!battle?.attackerInstanceId) return 0;

  const attackerCtx = findPhysicalCard(match, battle.attackerInstanceId);
  const blockerCtx = findPhysicalCard(match, action.instanceId);
  if (!attackerCtx?.card || !blockerCtx?.card) return 0;

  const opponentId = battle.attackerPlayerId;
  const attackerBP = numeric(getEffectiveBP(match, cardIndex, attackerCtx.card));
  const blockerBP = numeric(getEffectiveBP(match, cardIndex, blockerCtx.card));
  const attackerSymbols = combatSymbols(match, cardIndex, attackerCtx.card);
  const attackerValue = combatBodyValue(match, opponentId, attackerCtx.card, cardIndex);
  const blockerValue = combatBodyValue(match, playerId, blockerCtx.card, cardIndex);
  const life = numeric(match.players[playerId]?.life);
  const future = futureAttackPressure(match, playerId, cardIndex);

  let score = 0;

  if (blockerBP > attackerBP) {
    score += 110 + attackerValue * 1.45;
    // Among blockers that all win, spend the smallest adequate body.
    score -= blockerValue * 0.7;
    score -= Math.max(0, blockerBP - attackerBP) / 95;
  } else if (blockerBP === attackerBP) {
    score += 60 + attackerValue * 1.25 - blockerValue * 0.9;
  } else {
    // Sacrificial blocks are worthwhile mainly to protect critical Life.
    score -= blockerValue * 1.5;
    score -= Math.max(0, attackerBP - blockerBP) / 160;
  }

  const lethalHit = life <= attackerSymbols;
  if (lethalHit) {
    score += 220_000;
  } else {
    score += attackerSymbols * (life <= 2 ? 90 : life <= 3 ? 48 : 20);
  }

  // Do not casually exhaust the only useful blocker on a small attack when a
  // more dangerous attacker is still waiting behind it.
  if (!lethalHit && future.attackers.length) {
    const biggestFutureBP = Math.max(
      ...future.attackers.map((physical) => numeric(getEffectiveBP(match, cardIndex, physical))),
      0
    );
    const biggestFutureSymbols = Math.max(
      ...future.attackers.map((physical) => combatSymbols(match, cardIndex, physical)),
      0
    );
    const currentThreat = attackerBP / 1000 + attackerSymbols * 2.2;
    const futureThreat = biggestFutureBP / 1000 + biggestFutureSymbols * 2.2;

    if (futureThreat > currentThreat + 1.2 && blockerBP >= attackerBP) {
      score -= 72;
    }
  }

  return score;
}

function declineBlockScore(match, playerId, cardIndex) {
  const attackerCtx = findPhysicalCard(match, match.battle?.attackerInstanceId);
  if (!attackerCtx?.card) return 0;

  const symbols = combatSymbols(match, cardIndex, attackerCtx.card);
  const life = numeric(match.players[playerId]?.life);
  const afterLife = life - symbols;
  if (afterLife <= 0) return -300_000;

  const future = futureAttackPressure(match, playerId, cardIndex);
  let score = -symbols * (life <= 2 ? 95 : life <= 3 ? 42 : 14);

  // Taking non-lethal Life also moves those Cores to Reserve in Battle Spirits,
  // so early-game damage is not always worse than throwing away a body.
  if (life >= 4) score += symbols * 12 + 12;

  if (future.guaranteedDamage >= afterLife && future.attackers.length) {
    score -= 2600;
  } else if (afterLife <= 2 && future.attackers.length) {
    score -= 80;
  }

  return score;
}


function pendingDecisionBestGain(match, playerId, cardIndex, depth = 3) {
  if (depth <= 0 || match?.pendingEffectDecision?.playerId !== playerId) return 0;

  const before = evaluateBoardState(match, playerId, cardIndex);
  const decisions = getLegalActions(match, playerId, cardIndex)
    .filter((entry) => entry.action?.type === "RESOLVE_EFFECT_DECISION");
  if (!decisions.length) return 0;

  let best = -Infinity;
  for (const candidate of decisions) {
    const resolved = applyGameAction(match, candidate.action, playerId, cardIndex);
    if (!resolved?.ok || !resolved.match) continue;
    let gain = evaluateBoardState(resolved.match, playerId, cardIndex) - before;
    gain += pendingDecisionBestGain(resolved.match, playerId, cardIndex, depth - 1);
    best = Math.max(best, gain);
  }
  return Number.isFinite(best) ? best : 0;
}

function actionPreviewPotential(match, playerId, action, cardIndex) {
  const result = applyGameAction(match, action, playerId, cardIndex);
  if (!result?.ok || !result.match) return -Infinity;
  let gain = evaluateBoardState(result.match, playerId, cardIndex) - evaluateBoardState(match, playerId, cardIndex);
  gain += pendingDecisionBestGain(result.match, playerId, cardIndex);
  if (result.manualResolutionNeeded && !result.match.pendingEffectDecision) gain -= 70;
  return gain;
}

function battleFlashUrgency(match, playerId, cardIndex) {
  const battle = match?.battle;
  if (!battle || !["flash1", "flash2"].includes(battle.stage)) return 0;

  const attackerCtx = findPhysicalCard(match, battle.attackerInstanceId);
  if (!attackerCtx?.card) return 0;
  const attackerBP = numeric(getEffectiveBP(match, cardIndex, attackerCtx.card));
  const attackerSymbols = combatSymbols(match, cardIndex, attackerCtx.card);
  let urgency = 0;

  if (battle.defenderPlayerId === playerId) {
    const life = numeric(match.players?.[playerId]?.life);
    if (battle.stage === "flash1") {
      const blockers = readyBattleCards(match, playerId, cardIndex);
      const bestBlockerBP = Math.max(
        ...blockers.map((physical) => numeric(getEffectiveBP(match, cardIndex, physical))),
        0
      );
      if (attackerSymbols >= life && life > 0) urgency += 220;
      if (!blockers.length) urgency += life <= 2 ? 100 : 48;
      else if (attackerBP > bestBlockerBP) urgency += 42;
    } else if (battle.blockerInstanceId) {
      const blockerCtx = findPhysicalCard(match, battle.blockerInstanceId);
      const blockerBP = numeric(getEffectiveBP(match, cardIndex, blockerCtx?.card));
      if (attackerBP > blockerBP) urgency += 88;
      else if (attackerBP === blockerBP) urgency += 38;
    }
  } else if (battle.attackerPlayerId === playerId && battle.stage === "flash2" && battle.blockerInstanceId) {
    const blockerCtx = findPhysicalCard(match, battle.blockerInstanceId);
    const blockerBP = numeric(getEffectiveBP(match, cardIndex, blockerCtx?.card));
    if (attackerBP < blockerBP) urgency += 78;
    else if (attackerBP === blockerBP) urgency += 34;
  }

  return urgency;
}

function bestFlashAlternativePotential(match, playerId, cardIndex, legalActions) {
  const flashActions = legalActions.filter((entry) =>
    entry.action?.type === "USE_MAGIC" && entry.action?.options?.mode === "flash"
  );
  if (!flashActions.length) return -Infinity;
  return Math.max(
    ...flashActions.map((entry) => actionPreviewPotential(match, playerId, entry.action, cardIndex))
  );
}

function magicUseBias(match, playerId, action, result, cardIndex) {
  const ctx = findPhysicalCard(match, action.instanceId);
  const card = getDatabaseCard(cardIndex, ctx?.card);
  if (!card) return -40;

  const mode = action.options?.mode === "flash" ? "flash" : "main";
  const beforeState = evaluateBoardState(match, playerId, cardIndex);
  const afterState = evaluateBoardState(result.match, playerId, cardIndex);
  const immediateGain = afterState - beforeState;
  const decisionGain = pendingDecisionBestGain(result.match, playerId, cardIndex);
  let score = decisionGain * 1.55;

  if (mode === "flash" && match.battle) {
    const urgency = battleFlashUrgency(match, playerId, cardIndex);
    // Reward spending the Magic when it actually improves the current battle.
    // A card that opens a useful target decision receives the full urgency;
    // otherwise urgency alone is not enough to justify throwing a card away.
    if (immediateGain + decisionGain > 2) score += urgency;
    else if (urgency < 35) score -= 12;
  }

  if (mode === "flash" && !match.battle) {
    // Flash cards are a flexible defensive resource. During Main Step the CPU
    // will still use one for a strong immediate swing, but otherwise keeps it
    // available for the opponent's Attack Step.
    const life = numeric(match.players?.[playerId]?.life);
    score -= life <= 2 ? 34 : life <= 3 ? 24 : 14;
    if (immediateGain + decisionGain >= 45) score += 18;
  }

  if (result.match.pendingEffectDecision && decisionGain <= 0) score -= 28;
  return score;
}

function passFlashBias(match, playerId, cardIndex, legalActions) {
  const best = bestFlashAlternativePotential(match, playerId, cardIndex, legalActions);
  if (!Number.isFinite(best)) return 26;
  if (best <= 2) return 30;

  let score = -Math.min(190, best * 1.35);
  const urgency = battleFlashUrgency(match, playerId, cardIndex);
  if (urgency >= 80 && best > 0) score -= Math.min(180, urgency * 0.8);
  return score;
}

function burstSetBias(match, playerId, action, cardIndex) {
  const ctx = findPhysicalCard(match, action.instanceId);
  const card = getDatabaseCard(cardIndex, ctx?.card);
  if (!card || !isBurstCard(card)) return -80;

  const player = match.players?.[playerId];
  const opponentId = otherPlayerId(match, playerId);
  const event = getBurstActivationEvent(card);
  let score = 0;

  if (event === "burstLifeDecrease") {
    const life = numeric(player?.life);
    const threats = readyBattleCards(match, opponentId, cardIndex, { includeExhausted: true }).length;
    score += 18 + Math.min(threats, 4) * 5;
    if (life <= 2) score += 34;
    else if (life <= 3) score += 20;
  } else {
    // Automatic CPU activation currently has explicit support for Life-decrease
    // windows. Other official Burst conditions stay legal for human/manual play,
    // but the CPU avoids parking a card in a trigger it cannot verify itself.
    score -= 38;
  }

  if (player?.burst) score -= 26;
  return score;
}

function burstActivationPotential(match, playerId, cardIndex, legalActions) {
  const activation = legalActions.find((entry) => entry.action?.type === "ACTIVATE_BURST");
  if (!activation) return -Infinity;
  return actionPreviewPotential(match, playerId, activation.action, cardIndex);
}

function activateBurstBias(match, playerId, result, cardIndex) {
  const physical = match.players?.[playerId]?.burst;
  const card = getDatabaseCard(cardIndex, physical);
  const decisionGain = pendingDecisionBestGain(result.match, playerId, cardIndex);
  const immediateGain = evaluateBoardState(result.match, playerId, cardIndex) - evaluateBoardState(match, playerId, cardIndex);
  let score = 24 + decisionGain * 1.65;

  if (getBurstActivationEvent(card) === "burstLifeDecrease") {
    const life = numeric(match.players?.[playerId]?.life);
    const lost = numeric(match.burstOpportunity?.amount);
    score += lost * 8;
    if (life <= 2) score += 26;
  }

  if (immediateGain + decisionGain <= -8) score -= 42;
  return score;
}

function passBurstBias(match, playerId, cardIndex, legalActions) {
  const potential = burstActivationPotential(match, playerId, cardIndex, legalActions);
  if (!Number.isFinite(potential)) return 20;
  if (potential <= 0) return 34;
  return -Math.min(220, 30 + potential * 1.5);
}

function mulliganScore(match, playerId, cardIndex) {
  const hand = match.players[playerId]?.hand || [];
  if (!hand.length) return 60;
  let cheap = 0;
  let expensive = 0;
  for (const physical of hand) {
    const card = getDatabaseCard(cardIndex, physical);
    const cost = numeric(card?.cost, 99);
    if (cost <= 3) cheap += 1;
    if (cost >= 6) expensive += 1;
  }
  if (cheap === 0) return 75;
  if (cheap <= 1 && expensive >= 2) return 42;
  return -35;
}

function summonResourceBias(match, playerId, action, result, cardIndex) {
  const ctx = findPhysicalCard(match, action.instanceId);
  const card = getDatabaseCard(cardIndex, ctx?.card);
  if (!card) return 0;

  const cost = calculateReduction(match, playerId, card, cardIndex);
  let score = Number(cost.applied || 0) * 7;

  const minimum = minimumCoresForCard(card);
  const requested = Number(action.options?.coresToPlace ?? minimum);
  if (requested > minimum && Array.isArray(card.levels)) {
    const minPhysical = { ...ctx.card, cores: { regular: minimum, soul: false } };
    const selectedPhysical = { ...ctx.card, cores: { regular: requested, soul: false } };
    const minLevel = getCurrentLevel(card, minPhysical);
    const selectedLevel = getCurrentLevel(card, selectedPhysical);
    const bpGain = Math.max(0, Number(selectedLevel?.bp || 0) - Number(minLevel?.bp || 0));
    const effectGain = Math.max(0, activeLevelEffectCount(card, selectedLevel?.level) - activeLevelEffectCount(card, minLevel?.level));
    const extra = Math.max(0, requested - minimum);
    score += bpGain / 520 + effectGain * 10 - extra * 3.8;
  }

  const beforeFlex = levelSafeFlexibleCores(match, playerId, cardIndex);
  const afterFlex = levelSafeFlexibleCores(result.match, playerId, cardIndex);
  if (afterFlex === 0 && beforeFlex > 0 && (result.match.players[playerId]?.hand?.length || 0)) score -= 10;

  const hasMagicLeft = (result.match.players[playerId]?.hand || []).some((physical) =>
    getDatabaseCard(cardIndex, physical)?.cardType === "magic"
  );
  if (hasMagicLeft && Number(result.match.players[playerId]?.reserve || 0) === 0) score -= 12;

  return score;
}

function coreMoveBias(match, playerId, action, result, cardIndex) {
  const move = action.move;
  if (move?.from?.zone !== "reserve" || move?.to?.zone !== "card") return -20;

  const beforeCtx = findPhysicalCard(match, move.to.instanceId);
  const afterCtx = findPhysicalCard(result.match, move.to.instanceId);
  const card = getDatabaseCard(cardIndex, beforeCtx?.card);
  if (!beforeCtx?.card || !afterCtx?.card || !card) return -10;

  const beforeLevel = getCurrentLevel(card, beforeCtx.card);
  const afterLevel = getCurrentLevel(card, afterCtx.card);
  let score = 0;

  if (Number(afterLevel?.level || 0) > Number(beforeLevel?.level || 0)) {
    const bpGain = Math.max(0, Number(afterLevel?.bp || 0) - Number(beforeLevel?.bp || 0));
    const effectGain = unlockedLevelEffectDelta(card, beforeCtx.card, afterCtx.card);
    score += 24 + bpGain / 320 + effectGain * 15;
  } else {
    const next = nextPrintedLevel(card, afterCtx.card);
    const reserve = Number(result.match.players[playerId]?.reserve || 0);
    const needed = next ? Math.max(0, Number(next.cores) - physicalCoreCount(afterCtx.card)) : Infinity;
    if (Number.isFinite(needed) && needed <= reserve) score += 8;
    else score -= 7;
  }

  const beforeOutlook = resourceOutlookScore(match, playerId, cardIndex);
  const afterOutlook = resourceOutlookScore(result.match, playerId, cardIndex);
  score += (afterOutlook - beforeOutlook) * 0.8;
  return score;
}

function categoryBias(match, playerId, candidate, result, cardIndex, legalActions) {
  const action = candidate.action;
  const type = action.type;
  let score = 0;

  switch (type) {
    case "ADVANCE_PHASE": {
      const productive = legalActions.filter((entry) => entry.action.type !== "ADVANCE_PHASE");
      if (match.phase === "main" && productive.length) score -= 52;
      else if (match.phase === "attack" && productive.some((entry) => entry.action.type === "DECLARE_ATTACK")) score -= 46;
      else score += 34;
      break;
    }
    case "MULLIGAN": score += mulliganScore(match, playerId, cardIndex); break;
    case "SUMMON": score += 36 + summonResourceBias(match, playerId, action, result, cardIndex); break;
    case "DEPLOY_NEXUS": {
      const ctx = findPhysicalCard(match, action.instanceId);
      const card = getDatabaseCard(cardIndex, ctx?.card);
      const reduction = card ? calculateReduction(match, playerId, card, cardIndex) : null;
      score += 28 + Number(reduction?.applied || 0) * 6;
      break;
    }
    case "MOVE_CORE": score += coreMoveBias(match, playerId, action, result, cardIndex); break;
    case "USE_MAGIC": score += 12 + magicUseBias(match, playerId, action, result, cardIndex); break;
    case "SET_BURST": score += burstSetBias(match, playerId, action, cardIndex); break;
    case "SET_MIRAGE": score += match.players[playerId]?.mirage ? 0 : 24; break;
    case "COMBINE_BRAVE": score += 30; break;
    case "SEPARATE_BRAVE": score -= 55; break;
    case "EXCHANGE_BRAVE": score -= 8; break;
    case "DECLARE_ATTACK": score += attackScore(match, playerId, action, cardIndex); break;
    case "DECLARE_BLOCK": score += blockScore(match, playerId, action, cardIndex); break;
    case "DECLINE_BLOCK": score += declineBlockScore(match, playerId, cardIndex); break;
    case "PASS_FLASH": score += passFlashBias(match, playerId, cardIndex, legalActions); break;
    case "RESOLVE_BATTLE": score += 160; break;
    case "RESOLVE_ULTIMATE_TRIGGER": score += 90; break;
    case "USE_TRIGGER_COUNTER": score += 72; break;
    case "PASS_TRIGGER_COUNTER": score += 4; break;
    case "ACTIVATE_BURST": score += activateBurstBias(match, playerId, result, cardIndex); break;
    case "PASS_BURST": score += passBurstBias(match, playerId, cardIndex, legalActions); break;
    case "RESOLVE_EFFECT_DECISION": score += 56; break;
    case "CONFIRM_MANUAL_PLAY":
    case "CONFIRM_MANUAL_COST": score += 100; break;
    case "CANCEL_MANUAL_PLAY":
    case "CANCEL_MANUAL_COST": score -= 90; break;
    default: break;
  }

  if (result?.manualResolutionNeeded && !result.match?.pendingEffectDecision) {
    // The CPU cannot honestly perform a free-form manual text resolution yet.
    score -= 180;
  }

  return score;
}

function scoreCandidate(match, playerId, candidate, cardIndex, options, legalActions) {
  const result = applyGameAction(match, candidate.action, playerId, cardIndex);
  if (!result?.ok || !result.match) return null;

  const before = evaluateBoardState(match, playerId, cardIndex);
  const after = evaluateBoardState(result.match, playerId, cardIndex);
  const delta = after - before;

  let score = delta * 1.25;
  score += categoryBias(match, playerId, candidate, result, cardIndex, legalActions);
  score += repeatedActionPenalty(candidate.action, options.recentActionKeys || []);

  if (result.match.winnerId === playerId) score += 500_000;
  if (result.match.winnerId && result.match.winnerId !== playerId) score -= 500_000;

  return {
    ...candidate,
    result,
    score,
    stateScore: after,
    delta
  };
}

export function rankAIActions(match, playerId, cardIndex, options = {}) {
  if (!match || match.winnerId || !match.players?.[playerId]) return [];
  if (getMatchActor(match) !== playerId) return [];

  const legalActions = getLegalActions(match, playerId, cardIndex);
  const ranked = [];

  for (const candidate of legalActions) {
    const scored = scoreCandidate(match, playerId, candidate, cardIndex, options, legalActions);
    if (scored) ranked.push(scored);
  }

  return ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return actionKey(a.action).localeCompare(actionKey(b.action));
  });
}

function chooseEasy(ranked, random) {
  if (!ranked.length) return null;

  const advance = ranked.find((entry) => entry.action.type === "ADVANCE_PHASE");
  if (advance && safeRandom(random) < 0.16) return advance.action;

  const pool = ranked.slice(0, Math.min(4, ranked.length));
  const roll = safeRandom(random);
  const index = Math.floor(roll * pool.length);
  return pool[index]?.action || ranked[0].action;
}

function chooseNormal(ranked, random) {
  if (!ranked.length) return null;
  if (ranked.length === 1) return ranked[0].action;

  // Usually take the best move. Small controlled variation prevents the CPU
  // from playing the exact same line every game without turning it random.
  if (safeRandom(random) < 0.88) return ranked[0].action;
  const close = ranked.filter((entry) => entry.score >= ranked[0].score - 18).slice(0, 3);
  return close[Math.floor(safeRandom(random) * close.length)]?.action || ranked[0].action;
}

/**
 * CPU Beta 2 controller.
 * It never bypasses the rules: every chosen action comes from getLegalActions()
 * and is scored by applying the same reducer used by local/online play.
 */
export function chooseAIAction(match, playerId, cardIndex, options = {}) {
  if (!match || match.winnerId) return null;
  if (getMatchActor(match) !== playerId) return null;

  const difficulty = DIFFICULTIES.has(options.difficulty)
    ? options.difficulty
    : DIFFICULTIES.has(match.ai?.difficulty)
      ? match.ai.difficulty
      : "normal";

  const ranked = rankAIActions(match, playerId, cardIndex, options);
  if (!ranked.length) return null;

  // Loop guard: when a long same-turn chain is detected, prefer a legal
  // progression action instead of letting Brave/Mirage management oscillate.
  if (numeric(options.turnActionCount) >= numeric(options.maxTurnActions, 70)) {
    const progress = ranked.find((entry) => PROGRESS_ACTIONS.has(entry.action.type));
    if (progress) return progress.action;
  }

  const decisionRandom =
    options.random ||
    deterministicDecisionRandom(match, playerId);

  if (difficulty === "easy") return chooseEasy(ranked, decisionRandom);
  if (difficulty === "normal") return chooseNormal(ranked, decisionRandom);

  // Hard is deterministic and always chooses the best resulting legal state.
  return ranked[0].action;
}
