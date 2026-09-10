import { FIELD_ZONES } from "../constants.js";

function normalizeDuration(value) {
  const raw = String(value || "").replace(/[\s_-]+/g, "").toLowerCase();
  if (["battle", "thisbattle", "untilendofbattle"].includes(raw)) return "battle";
  if (["turn", "thisturn", "untilendofturn", "endofturn"].includes(raw)) return "turn";
  return raw || null;
}

export function addBPModifier(physical, amount, duration, metadata = {}) {
  const normalized = normalizeDuration(duration);
  if (!normalized) {
    return { ...physical, temporaryBP: Number(physical.temporaryBP || 0) + Number(amount || 0) };
  }
  return {
    ...physical,
    effectModifiers: [
      ...(physical.effectModifiers || []),
      {
        type: "bp",
        amount: Number(amount || 0),
        duration: normalized,
        battleId: metadata.battleId || null,
        sourceEffectId: metadata.sourceEffectId || null
      }
    ]
  };
}

export function getEffectBPBonus(physical) {
  return (physical?.effectModifiers || [])
    .filter((modifier) => modifier?.type === "bp")
    .reduce((total, modifier) => total + Number(modifier.amount || 0), 0);
}

export function clearEffectModifiers(match, duration, metadata = {}) {
  const normalized = normalizeDuration(duration);
  if (!normalized) return match;
  const players = {};
  for (const [playerId, player] of Object.entries(match.players || {})) {
    const field = { ...player.field };
    for (const zone of FIELD_ZONES) {
      field[zone] = (player.field?.[zone] || []).map((physical) => ({
        ...physical,
        effectModifiers: (physical.effectModifiers || []).filter((modifier) => {
          if (modifier?.duration !== normalized) return true;
          if (normalized === "battle" && metadata.battleId && modifier.battleId && modifier.battleId !== metadata.battleId) return true;
          return false;
        })
      }));
    }
    players[playerId] = { ...player, field };
  }
  return { ...match, players };
}
