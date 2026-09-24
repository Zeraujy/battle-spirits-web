import {
  getCurrentLevel,
  getDatabaseCard,
  getEffectiveBP,
  getEffectiveSymbols
} from "./selectors.js";
import { otherPlayerId } from "./utils.js";

const FIELD_ZONES = new Set(["spirits", "nexuses", "other"]);

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function fieldEntries(match) {
  const entries = [];
  for (const [playerId, player] of Object.entries(match?.players || {})) {
    for (const zone of ["spirits", "nexuses", "other"]) {
      for (const physical of player?.field?.[zone] || []) {
        entries.push({ playerId, zone, physical });
      }
    }
  }
  return entries;
}

function locateKnownCard(match, playerId, instanceId) {
  const player = match?.players?.[playerId];
  if (!player || !instanceId) return null;

  const collections = [
    ["hand", player.hand || []],
    ["trash", player.trash || []],
    ["revealed", player.revealed || []],
    ["deck", player.deck || []],
    ["spirits", player.field?.spirits || []],
    ["nexuses", player.field?.nexuses || []],
    ["other", player.field?.other || []]
  ];

  for (const [zone, cards] of collections) {
    const physical = cards.find((card) => card?.instanceId === instanceId);
    if (physical) return { zone, physical };
  }

  if (player.burst?.instanceId === instanceId) return { zone: "burst", physical: player.burst };
  if (player.mirage?.instanceId === instanceId) return { zone: "mirage", physical: player.mirage };
  return null;
}

function fieldStrategicValue(match, ownerId, physical, cardIndex) {
  const card = getDatabaseCard(cardIndex, physical);
  if (!card) return 8;

  const type = String(card.cardType || physical?.cardType || "").toLowerCase();
  const cost = number(card.cost);
  const cores = number(physical?.cores?.regular) + (physical?.cores?.soul ? 1 : 0);
  const symbols = getEffectiveSymbols(match, cardIndex, physical)?.length || 0;
  const level = number(getCurrentLevel(card, physical)?.level);
  const ready = physical?.exhausted ? 0 : 1;

  if (type === "nexus") {
    return 16 + cost * 2 + symbols * 7 + cores * 1.5 + level * 2;
  }

  if (["spirit", "ultimate", "brave"].includes(type)) {
    const bp = number(getEffectiveBP(match, cardIndex, physical));
    let value = 16 + cost * 2 + bp / 420 + symbols * 10 + cores * 1.7 + level * 2.5 + ready * 5;
    if (type === "ultimate") value += 6;
    if (physical?.combinedWith) value += 8;
    return value;
  }

  return 8 + cost;
}

function battleRoleBonus(match, instanceId) {
  const battle = match?.battle;
  if (!battle || !instanceId) return 0;
  if (battle.attackerInstanceId === instanceId) return 30;
  if (battle.blockerInstanceId === instanceId) return 26;
  return 0;
}

function totalTrackedCoreSupply(player) {
  if (!player) return 0;
  let total = number(player.reserve) + number(player.trashCores) + number(player.life);
  if (player.soulCore?.zone) total += 1;
  for (const zone of ["spirits", "nexuses", "other"]) {
    for (const physical of player.field?.[zone] || []) {
      total += number(physical?.cores?.regular);
      // Soul Core is already represented once by player.soulCore.
    }
  }
  return total;
}

function protectionCount(match, playerId) {
  return Object.keys(match?.temporary?.turnProtections?.[playerId] || {}).length;
}

function restrictionCount(match) {
  return Object.keys(match?.battle?.restrictions || {}).length;
}

function addReason(reasons, type, score, details = {}) {
  if (!Number.isFinite(score) || Math.abs(score) < 0.01) return;
  reasons.push({ type, score, ...details });
}

/**
 * Semantic evaluation of a resolved structured effect.
 *
 * This deliberately works from public state transitions instead of reading the
 * opponent's hidden hand/deck identities. A card that was already public on the
 * field may still be followed by instanceId after being destroyed/bounced,
 * because its identity was known before the effect resolved.
 */
export function analyzeEffectTransition(before, after, playerId, cardIndex) {
  if (!before?.players?.[playerId] || !after?.players?.[playerId]) {
    return { score: 0, reasons: [], tags: [] };
  }

  const opponentId = otherPlayerId(before, playerId);
  let score = 0;
  const reasons = [];

  for (const entry of fieldEntries(before)) {
    const { playerId: ownerId, physical } = entry;
    const instanceId = physical?.instanceId;
    if (!instanceId) continue;

    const perspective = ownerId === playerId ? 1 : ownerId === opponentId ? -1 : 0;
    if (!perspective) continue;

    const afterLocation = locateKnownCard(after, ownerId, instanceId);
    const wasValue = fieldStrategicValue(before, ownerId, physical, cardIndex);
    const roleBonus = battleRoleBonus(before, instanceId);

    if (!afterLocation || !FIELD_ZONES.has(afterLocation.zone)) {
      const destination = afterLocation?.zone || "unknown";
      let magnitude = 0;
      let type = null;

      if (destination === "trash") {
        type = "destroy";
        magnitude = 14 + wasValue * 0.58 + roleBonus;
      } else if (destination === "hand") {
        type = "returnToHand";
        magnitude = 9 + wasValue * 0.38 + roleBonus * 0.7;
      } else if (destination === "deck") {
        type = "returnToDeck";
        magnitude = 11 + wasValue * 0.46 + roleBonus * 0.75;
      }

      if (type) {
        // Removing an opponent body is good; removing our own is bad.
        const delta = -perspective * magnitude;
        score += delta;
        addReason(reasons, type, delta, { instanceId, ownerId, destination });
      }
      continue;
    }

    const afterPhysical = afterLocation.physical;

    if (Boolean(physical.exhausted) !== Boolean(afterPhysical.exhausted)) {
      const becameExhausted = !physical.exhausted && afterPhysical.exhausted;
      const magnitude = 10 + clamp(wasValue * 0.34, 4, 30) + roleBonus;
      // Exhausting ours is bad, exhausting theirs is good. Refresh is inverse.
      const direction = becameExhausted ? -perspective : perspective;
      const delta = direction * magnitude;
      score += delta;
      addReason(reasons, becameExhausted ? "exhaust" : "refresh", delta, { instanceId, ownerId });
    }

    const beforeBP = number(getEffectiveBP(before, cardIndex, physical));
    const afterBP = number(getEffectiveBP(after, cardIndex, afterPhysical));
    const bpDelta = afterBP - beforeBP;
    if (bpDelta) {
      let magnitude = clamp(Math.abs(bpDelta) / 260, 2, 34);
      if (roleBonus) magnitude *= 1.8;
      const direction = Math.sign(bpDelta) * perspective;
      const delta = direction * magnitude;
      score += delta;
      addReason(reasons, "bp", delta, { instanceId, ownerId, amount: bpDelta });
    }
  }

  const meBefore = before.players[playerId];
  const meAfter = after.players[playerId];
  const oppBefore = before.players[opponentId];
  const oppAfter = after.players[opponentId];

  // Card advantage. Counts are public; no hidden identities are inspected.
  const ownHandDelta = number(meAfter.hand?.length) - number(meBefore.hand?.length);
  const ownTrashDelta = number(meAfter.trash?.length) - number(meBefore.trash?.length);
  if (ownHandDelta > 0) {
    const recovered = Math.min(ownHandDelta, Math.max(0, -ownTrashDelta));
    const genericGain = ownHandDelta - recovered;
    if (recovered > 0) {
      const delta = recovered * 12;
      score += delta;
      addReason(reasons, "recover", delta, { count: recovered });
    }
    if (genericGain > 0) {
      const delta = genericGain * 10;
      score += delta;
      addReason(reasons, "draw", delta, { count: genericGain });
    }
  }

  // A draw Magic can replace itself, producing no net hand-size increase. Deck
  // loss with no matching revealed/trash growth captures that card cycling.
  const deckLoss = Math.max(0, number(meBefore.deck?.length) - number(meAfter.deck?.length));
  const revealedGain = Math.max(0, number(meAfter.revealed?.length) - number(meBefore.revealed?.length));
  const trashGainBeyondPlayedCard = Math.max(0, ownTrashDelta - 1);
  const inferredDraws = Math.max(0, deckLoss - revealedGain - trashGainBeyondPlayedCard - Math.max(0, ownHandDelta));
  if (inferredDraws > 0) {
    const delta = inferredDraws * 7;
    score += delta;
    addReason(reasons, "draw", delta, { count: inferredDraws, replacement: true });
  }

  const ownCoreDelta = totalTrackedCoreSupply(meAfter) - totalTrackedCoreSupply(meBefore);
  const oppCoreDelta = totalTrackedCoreSupply(oppAfter) - totalTrackedCoreSupply(oppBefore);
  if (ownCoreDelta) {
    const delta = ownCoreDelta * 12;
    score += delta;
    addReason(reasons, "core", delta, { playerId, amount: ownCoreDelta });
  }
  if (oppCoreDelta) {
    const delta = -oppCoreDelta * 10;
    score += delta;
    addReason(reasons, "core", delta, { playerId: opponentId, amount: oppCoreDelta });
  }

  const ownLifeDelta = number(meAfter.life) - number(meBefore.life);
  const oppLifeDelta = number(oppAfter.life) - number(oppBefore.life);
  if (ownLifeDelta) {
    const delta = ownLifeDelta * 30;
    score += delta;
    addReason(reasons, ownLifeDelta > 0 ? "healLife" : "loseLife", delta, { amount: ownLifeDelta });
  }
  if (oppLifeDelta) {
    const delta = -oppLifeDelta * 34;
    score += delta;
    addReason(reasons, oppLifeDelta < 0 ? "damageLife" : "opponentHealLife", delta, { amount: oppLifeDelta });
  }

  const protectionDelta = protectionCount(after, playerId) - protectionCount(before, playerId);
  if (protectionDelta) {
    const delta = protectionDelta * 24;
    score += delta;
    addReason(reasons, "protection", delta, { amount: protectionDelta });
  }

  const restrictionsDelta = restrictionCount(after) - restrictionCount(before);
  if (restrictionsDelta && after?.battle?.attackerPlayerId === playerId) {
    const delta = restrictionsDelta * 18;
    score += delta;
    addReason(reasons, "battleRestriction", delta, { amount: restrictionsDelta });
  }

  return {
    score,
    reasons,
    tags: [...new Set(reasons.map((reason) => reason.type))]
  };
}
