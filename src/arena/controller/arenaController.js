import { applyGameAction as applyGameActionEngine } from "../../game/reducer.js";
import { chooseAIDecision as chooseAIDecisionEngine } from "../../game/ai.js";
import {
  findPhysicalCard as findPhysicalCardEngine,
  getDatabaseCard as getDatabaseCardEngine,
  getCurrentLevel as getCurrentLevelEngine,
  getEffectiveBP as getEffectiveBPEngine,
  getEffectiveSymbols as getEffectiveSymbolsEngine
} from "../../game/selectors.js";
import {
  getCardName as getCardNameEngine,
  resolveCardImage as resolveCardImageEngine
} from "../../game/cardAdapter.js";
import { otherPlayerId as otherPlayerIdEngine } from "../../game/utils.js";
import { legalBlockers as legalBlockersEngine } from "../../game/battle.js";
import { getBurstActivationEvent as getBurstActivationEventEngine } from "../../game/burstRules.js";
import {
  calculateReduction as calculateReductionEngine,
  getSpendableCoreSources as getSpendableCoreSourcesEngine
} from "../../game/cost.js";
import {
  getBraveSeparationPreview as getBraveSeparationPreviewEngine,
  getCombinedStats as getCombinedStatsEngine,
  getLegalBraveHosts as getLegalBraveHostsEngine
} from "../../game/brave.js";

/**
 * Arena Controller Boundary — v5.2.0 Phase 2
 *
 * This module is the only Arena-facing bridge allowed to reach directly into
 * the in-process Battle Spirits rule engine. React presentation consumes this
 * facade instead of importing reducer/rule helpers itself.
 *
 * Phase 3 will progressively replace most selector-style calls here with
 * ArenaViewModel v2 presentation state. Keeping the bridge explicit now lets
 * us perform that migration without changing gameplay semantics.
 */

export function resolveArenaActorId(match) {
  if (match?.pendingEffectDecision?.playerId) {
    return match.pendingEffectDecision.playerId;
  }

  if (match?.burstOpportunity?.playerId) {
    return match.burstOpportunity.playerId;
  }

  if (match?.battle?.stage === "ultimateTrigger" && match?.battle?.ultimateTrigger) {
    const trigger = match.battle.ultimateTrigger;

    if (trigger.status === "counterWindow" && trigger.counterPlayerId) {
      return trigger.counterPlayerId;
    }

    if (trigger.controllerPlayerId) {
      return trigger.controllerPlayerId;
    }
  }

  if (match?.battle?.flash?.priorityPlayerId) {
    return match.battle.flash.priorityPlayerId;
  }

  if (match?.battle?.stage === "block") {
    return match.battle.defenderPlayerId;
  }

  return match?.activePlayerId ?? null;
}

export function resolveArenaPerspective({
  match,
  online = false,
  viewerPlayerId = null,
  aiMode = false,
  humanPlayerId = null
}) {
  const actorId = resolveArenaActorId(match);

  const canControlActor = online
    ? viewerPlayerId === actorId
    : aiMode
      ? actorId === humanPlayerId
      : true;

  const bottomId = online
    ? viewerPlayerId
    : aiMode
      ? humanPlayerId
      : actorId;

  const topId = bottomId ? otherPlayerIdEngine(match, bottomId) : null;

  return {
    actorId,
    canControlActor,
    bottomId,
    topId
  };
}

export function dispatchArenaIntent({
  online = false,
  onlineClient = null,
  viewerPlayerId = null,
  match,
  action,
  asPlayerId,
  cardIndex,
  onOnlineResult
}) {
  if (online) {
    if (viewerPlayerId !== asPlayerId) {
      return {
        transport: "blocked",
        ok: false,
        reason: "WAIT_FOR_OTHER_PLAYER"
      };
    }

    if (!onlineClient?.action) {
      return {
        transport: "blocked",
        ok: false,
        reason: "ONLINE_CLIENT_UNAVAILABLE"
      };
    }

    onlineClient.action(
      { action },
      (result) => {
        onOnlineResult?.(result);
      }
    );

    return {
      transport: "online",
      ok: true
    };
  }

  return {
    transport: "local",
    ...applyGameActionEngine(match, action, asPlayerId, cardIndex)
  };
}

export function planArenaCpuDecision({
  match,
  aiPlayerId,
  cardIndex,
  recentActionKeys = [],
  turnActionCount = 0,
  maxTurnActions = 70
}) {
  const difficulty = match?.ai?.difficulty || "normal";

  const decision = chooseAIDecisionEngine(
    match,
    aiPlayerId,
    cardIndex,
    {
      difficulty,
      archetypeProfile: match?.ai?.archetypeProfile,
      recentActionKeys,
      turnActionCount,
      maxTurnActions
    }
  );

  const delay = difficulty === "hard"
    ? 360
    : difficulty === "easy"
      ? 650
      : 500;

  return {
    difficulty,
    decision,
    action: decision.action,
    delay
  };
}

// Transitional selector facade. These aliases intentionally preserve current
// Simulator call sites while removing direct Web UI -> Game Engine imports.
// Phase 3 will replace most of them with ArenaViewModel v2 fields.
export const findPhysicalCard = findPhysicalCardEngine;
export const getDatabaseCard = getDatabaseCardEngine;
export const getCurrentLevel = getCurrentLevelEngine;
export const getEffectiveBP = getEffectiveBPEngine;
export const getEffectiveSymbols = getEffectiveSymbolsEngine;
export const getCardName = getCardNameEngine;
export const resolveCardImage = resolveCardImageEngine;
export const otherPlayerId = otherPlayerIdEngine;
export const legalBlockers = legalBlockersEngine;
export const getBurstActivationEvent = getBurstActivationEventEngine;
export const calculateReduction = calculateReductionEngine;
export const getSpendableCoreSources = getSpendableCoreSourcesEngine;
export const getBraveSeparationPreview = getBraveSeparationPreviewEngine;
export const getCombinedStats = getCombinedStatsEngine;
export const getLegalBraveHosts = getLegalBraveHostsEngine;
