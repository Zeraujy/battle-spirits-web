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

function attackScore(match, playerId, action, cardIndex) {
  const ctx = findPhysicalCard(match, action.instanceId);
  if (!ctx?.card) return 0;

  const opponentId = otherPlayerId(match, playerId);
  const opponent = match.players[opponentId];
  const attackerBP = numeric(getEffectiveBP(match, cardIndex, ctx.card));
  const symbols = Math.max(1, getEffectiveSymbols(match, cardIndex, ctx.card)?.length || 1);
  const blockers = (opponent?.field?.spirits || [])
    .concat(opponent?.field?.other || [])
    .filter((physical) => !physical.exhausted);

  if (!blockers.length) {
    const lethal = numeric(opponent?.life) <= symbols;
    return lethal ? 250_000 : 85 + symbols * 34 + attackerBP / 900;
  }

  const blockerBPs = blockers.map((physical) => numeric(getEffectiveBP(match, cardIndex, physical)));
  const weakest = Math.min(...blockerBPs);
  const strongest = Math.max(...blockerBPs);

  if (attackerBP > strongest) return 62 + symbols * 11;
  if (attackerBP >= weakest) return 38 + symbols * 8;
  return 8 + symbols * 4 - Math.max(0, weakest - attackerBP) / 700;
}

function blockScore(match, playerId, action, cardIndex) {
  const battle = match.battle;
  if (!battle?.attackerInstanceId) return 0;

  const attackerCtx = findPhysicalCard(match, battle.attackerInstanceId);
  const blockerCtx = findPhysicalCard(match, action.instanceId);
  if (!attackerCtx?.card || !blockerCtx?.card) return 0;

  const attackerBP = numeric(getEffectiveBP(match, cardIndex, attackerCtx.card));
  const blockerBP = numeric(getEffectiveBP(match, cardIndex, blockerCtx.card));
  const attackerSymbols = Math.max(1, getEffectiveSymbols(match, cardIndex, attackerCtx.card)?.length || 1);
  const life = numeric(match.players[playerId]?.life);

  let score = 26;
  if (blockerBP > attackerBP) score += 80;
  else if (blockerBP === attackerBP) score += 55;
  else score -= 22 + (attackerBP - blockerBP) / 650;

  if (life <= attackerSymbols) score += 200_000;
  else if (life <= 2) score += 65;

  // Prefer the cheapest sufficient blocker instead of wasting the largest body.
  if (blockerBP >= attackerBP) score -= Math.max(0, blockerBP - attackerBP) / 1200;
  return score;
}

function declineBlockScore(match, playerId, cardIndex) {
  const attackerCtx = findPhysicalCard(match, match.battle?.attackerInstanceId);
  if (!attackerCtx?.card) return 0;
  const symbols = Math.max(1, getEffectiveSymbols(match, cardIndex, attackerCtx.card)?.length || 1);
  const life = numeric(match.players[playerId]?.life);
  if (life <= symbols) return -300_000;
  return life <= 2 ? -90 : -18 * symbols;
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
