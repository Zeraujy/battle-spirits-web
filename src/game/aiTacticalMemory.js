import { otherPlayerId } from "./utils.js";

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

function ratio(numerator, denominator, fallback = 0) {
  const den = Number(denominator) || 0;
  return den > 0 ? clamp01((Number(numerator) || 0) / den) : fallback;
}

function publicOpponentState(match, opponentId) {
  const opponent = match?.players?.[opponentId] || {};
  return {
    life: Number(opponent.life || 0),
    reserve: Number(opponent.reserve || 0),
    hasSetBurst: Boolean(opponent.burst),
    fieldBodies:
      (opponent.field?.spirits?.length || 0) +
      (opponent.field?.ultimates?.length || 0) +
      (opponent.field?.braves?.length || 0),
    nexusCount: opponent.field?.nexuses?.length || 0
  };
}

/**
 * Builds CPU memory exclusively from information that has already been public.
 * It intentionally never reads opponent hand identities, deck order or hidden
 * Burst identity. The structured action log is the source of behavioral memory.
 */
export function buildAITacticalMemory(match, aiPlayerId) {
  const opponentId = otherPlayerId(match, aiPlayerId);
  const actions = Array.isArray(match?.actionLog)
    ? match.actionLog.filter((entry) => entry?.actorId === opponentId)
    : [];

  const counters = {
    observedActions: actions.length,
    attacks: 0,
    blocks: 0,
    declinedBlocks: 0,
    flashMagicUses: 0,
    flashPasses: 0,
    burstSets: 0,
    burstActivations: 0,
    summons: 0,
    nexusDeploys: 0,
    mainMagicUses: 0
  };

  for (const entry of actions) {
    const action = entry?.action || {};
    switch (entry?.type || action.type) {
      case "DECLARE_ATTACK": counters.attacks += 1; break;
      case "DECLARE_BLOCK": counters.blocks += 1; break;
      case "DECLINE_BLOCK": counters.declinedBlocks += 1; break;
      case "USE_MAGIC":
        if (action.options?.mode === "flash") counters.flashMagicUses += 1;
        else counters.mainMagicUses += 1;
        break;
      case "PASS_FLASH": counters.flashPasses += 1; break;
      case "SET_BURST": counters.burstSets += 1; break;
      case "ACTIVATE_BURST": counters.burstActivations += 1; break;
      case "SUMMON": counters.summons += 1; break;
      case "DEPLOY_NEXUS": counters.nexusDeploys += 1; break;
      default: break;
    }
  }

  const blockWindows = counters.blocks + counters.declinedBlocks;
  const flashWindows = counters.flashMagicUses + counters.flashPasses;
  const turnsObserved = Math.max(1, Number(match?.turnNumber || 1) - 1);
  const sampleWeight = clamp01(counters.observedActions / 14);

  const blockRate = ratio(counters.blocks, blockWindows, 0.5);
  const declineRate = ratio(counters.declinedBlocks, blockWindows, 0.5);
  const flashThreat = ratio(counters.flashMagicUses, flashWindows, 0);
  const aggression = clamp01((counters.attacks / turnsObserved) / 2.2);
  const burstHabit = clamp01((counters.burstSets + counters.burstActivations * 1.5) / Math.max(3, turnsObserved));

  return {
    version: 1,
    source: "public-actions-only",
    opponentId,
    sampleWeight,
    counters,
    tendencies: {
      aggression,
      blockRate,
      declineRate,
      flashThreat,
      burstHabit
    },
    publicState: publicOpponentState(match, opponentId)
  };
}

function reason(type, score, ptBR, en) {
  return { type, score, ptBR, en };
}

/**
 * Small score adjustment. Tactical memory should influence a decision, never
 * override legality or the engine's immediate tactical evaluation.
 */
export function tacticalMemoryActionBias(match, aiPlayerId, action, memory, difficulty = "normal") {
  if (!memory || difficulty === "easy") return { score: 0, reasons: [] };

  const scale = (difficulty === "hard" ? 1 : 0.35) * (0.35 + memory.sampleWeight * 0.65);
  const tendencies = memory.tendencies || {};
  const publicState = memory.publicState || {};
  const reasons = [];
  let score = 0;

  if (action?.type === "DECLARE_ATTACK") {
    if (publicState.reserve > 0 && tendencies.flashThreat > 0.25) {
      const value = -Math.min(48, 14 + tendencies.flashThreat * 42) * scale;
      score += value;
      reasons.push(reason(
        "memory-flash-threat",
        value,
        "O oponente já respondeu com Magic em Flash; a CPU preserva ataques de baixo valor quando há Reserve disponível.",
        "The opponent has answered with Flash Magic before; CPU preserves low-value attacks while Reserve is available."
      ));
    }

    if (publicState.hasSetBurst && tendencies.burstHabit >= 0.15) {
      const value = -Math.min(28, 8 + tendencies.burstHabit * 24) * scale;
      score += value;
      reasons.push(reason(
        "memory-burst-habit",
        value,
        "Há um Burst setado e o histórico público mostra uso recorrente de Burst.",
        "A Burst is set and public history shows recurring Burst use."
      ));
    }

    if (tendencies.declineRate > 0.58 && memory.counters.declinedBlocks >= 2) {
      const value = Math.min(30, 8 + tendencies.declineRate * 24) * scale;
      score += value;
      reasons.push(reason(
        "memory-decline-block",
        value,
        "O oponente costuma aceitar dano em vez de bloquear, aumentando o valor de pressão contínua.",
        "The opponent often takes damage instead of blocking, increasing the value of sustained pressure."
      ));
    }

    if (tendencies.blockRate > 0.7 && memory.counters.blocks >= 2) {
      const value = -Math.min(24, 6 + tendencies.blockRate * 18) * scale;
      score += value;
      reasons.push(reason(
        "memory-frequent-blocker",
        value,
        "O oponente bloqueia com frequência; a CPU exige um pouco mais de valor antes de comprometer um atacante.",
        "The opponent blocks frequently; CPU asks for slightly more value before committing an attacker."
      ));
    }
  }

  if (action?.type === "SET_BURST" && tendencies.aggression > 0.5) {
    const value = Math.min(22, 6 + tendencies.aggression * 16) * scale;
    score += value;
    reasons.push(reason(
      "memory-opponent-aggression",
      value,
      "O adversário demonstrou pressão ofensiva recorrente; preparar Burst ganha valor.",
      "The opponent has shown recurring offensive pressure; preparing Burst gains value."
    ));
  }

  if (action?.type === "DECLARE_BLOCK" && tendencies.aggression > 0.6) {
    const life = Number(match?.players?.[aiPlayerId]?.life || 0);
    if (life <= 3) {
      const value = Math.min(20, 5 + tendencies.aggression * 15) * scale;
      score += value;
      reasons.push(reason(
        "memory-aggression-defense",
        value,
        "Contra um padrão agressivo, a CPU valoriza mais preservar Life quando já está sob pressão.",
        "Against an aggressive pattern, CPU values preserving Life more when already under pressure."
      ));
    }
  }

  return { score, reasons };
}
