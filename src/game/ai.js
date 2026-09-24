import { applyGameAction } from "./reducer.js";
import { getLegalActions } from "./legalActions.js";
import {
  findPhysicalCard,
  getDatabaseCard,
  getEffectiveBP,
  getEffectiveSymbols
} from "./selectors.js";
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
  "SET_MIRAGE"
]);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function numeric(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
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

  if (type === "nexus") {
    return 20 + cost * 2 + regularCores * 1.2;
  }

  if (["spirit", "ultimate", "brave"].includes(type)) {
    const bp = numeric(getEffectiveBP(match, cardIndex, physical));
    const symbols = getEffectiveSymbols(match, cardIndex, physical)?.length || 0;
    let value = 18 + cost * 2.2 + bp / 420 + symbols * 9 + regularCores * 1.5 + soulBonus + readyBonus;

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
    case "SUMMON": score += 36; break;
    case "DEPLOY_NEXUS": score += 28; break;
    case "USE_MAGIC": score += action.options?.mode === "flash" ? 18 : 14; break;
    case "SET_BURST": score += match.players[playerId]?.burst ? 2 : 30; break;
    case "SET_MIRAGE": score += match.players[playerId]?.mirage ? 0 : 24; break;
    case "COMBINE_BRAVE": score += 30; break;
    case "SEPARATE_BRAVE": score -= 55; break;
    case "EXCHANGE_BRAVE": score -= 8; break;
    case "DECLARE_ATTACK": score += attackScore(match, playerId, action, cardIndex); break;
    case "DECLARE_BLOCK": score += blockScore(match, playerId, action, cardIndex); break;
    case "DECLINE_BLOCK": score += declineBlockScore(match, playerId, cardIndex); break;
    case "PASS_FLASH": score += 5; break;
    case "RESOLVE_BATTLE": score += 160; break;
    case "RESOLVE_ULTIMATE_TRIGGER": score += 90; break;
    case "USE_TRIGGER_COUNTER": score += 72; break;
    case "PASS_TRIGGER_COUNTER": score += 4; break;
    case "ACTIVATE_BURST": score += 72; break;
    case "PASS_BURST": score -= 12; break;
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
