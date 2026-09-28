export const EffectDuration = Object.freeze({
  THIS_BATTLE: "thisBattle",
  THIS_ATTACK: "thisAttack",
  THIS_TURN: "thisTurn",
  UNTIL_END_STEP: "untilEndStep",
  WHILE_SOURCE_EXISTS: "whileSourceExists",
  WHILE_CONDITION_TRUE: "whileConditionTrue",
  PERMANENT: "permanent"
});

const DURATION_ALIASES = Object.freeze({
  battle: EffectDuration.THIS_BATTLE,
  thisbattle: EffectDuration.THIS_BATTLE,
  untilendofbattle: EffectDuration.THIS_BATTLE,
  attack: EffectDuration.THIS_ATTACK,
  thisattack: EffectDuration.THIS_ATTACK,
  turn: EffectDuration.THIS_TURN,
  thisturn: EffectDuration.THIS_TURN,
  untilendofturn: EffectDuration.THIS_TURN,
  endofturn: EffectDuration.THIS_TURN,
  endstep: EffectDuration.UNTIL_END_STEP,
  untilendstep: EffectDuration.UNTIL_END_STEP,
  source: EffectDuration.WHILE_SOURCE_EXISTS,
  whilesourceexists: EffectDuration.WHILE_SOURCE_EXISTS,
  condition: EffectDuration.WHILE_CONDITION_TRUE,
  whileconditiontrue: EffectDuration.WHILE_CONDITION_TRUE,
  permanent: EffectDuration.PERMANENT
});

export function normalizeEffectDuration(value, fallback = EffectDuration.PERMANENT) {
  if (value && typeof value === "object") value = value.type ?? value.duration;
  const compact = String(value || "").replace(/[\s_-]+/g, "").toLowerCase();
  return DURATION_ALIASES[compact] || fallback;
}

export function createDurationSpec(value, match = {}, context = {}) {
  const type = normalizeEffectDuration(value);
  return {
    type,
    turnNumber: Number(match.turnNumber || 0),
    battleId: context.battleId || match.battle?.id || null,
    sourceInstanceId: context.sourceInstanceId || null,
    createdPhase: match.phase || null
  };
}

export function durationIsActive(match, duration, helpers = {}) {
  const spec = typeof duration === "object" && duration
    ? duration
    : createDurationSpec(duration, match, helpers);
  const type = normalizeEffectDuration(spec.type || duration);

  if (type === EffectDuration.PERMANENT) return true;
  if (type === EffectDuration.THIS_TURN) return Number(match.turnNumber || 0) === Number(spec.turnNumber || 0);
  if (type === EffectDuration.THIS_BATTLE || type === EffectDuration.THIS_ATTACK) {
    if (!match.battle) return false;
    return !spec.battleId || match.battle.id === spec.battleId;
  }
  if (type === EffectDuration.UNTIL_END_STEP) {
    if (Number(match.turnNumber || 0) !== Number(spec.turnNumber || 0)) return false;
    return match.phase !== "end" || helpers.keepDuringEndStep === true;
  }
  if (type === EffectDuration.WHILE_SOURCE_EXISTS) {
    return typeof helpers.sourceExists === "function"
      ? Boolean(helpers.sourceExists(spec.sourceInstanceId))
      : true;
  }
  if (type === EffectDuration.WHILE_CONDITION_TRUE) {
    return typeof helpers.conditionMatches === "function"
      ? Boolean(helpers.conditionMatches())
      : helpers.conditionActive !== false;
  }
  return true;
}

export function durationExpiresOn(duration, reason) {
  const type = normalizeEffectDuration(duration?.type || duration);
  if (reason === "battleEnd") return [EffectDuration.THIS_BATTLE, EffectDuration.THIS_ATTACK].includes(type);
  if (reason === "turnEnd") return [EffectDuration.THIS_TURN, EffectDuration.UNTIL_END_STEP].includes(type);
  if (reason === "endStep") return type === EffectDuration.UNTIL_END_STEP;
  return false;
}
