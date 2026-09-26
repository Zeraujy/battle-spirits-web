export const CUSTOM_MATCH_DEFAULTS = Object.freeze({
  firstPlayerMode: "random",
  turnTimerSeconds: 0,
  mulliganEnabled: true,
  ruleset: "eternal"
});

const TURN_TIMER_OPTIONS = new Set([0, 60, 90, 120, 180]);
const FIRST_PLAYER_MODES = new Set(["random", "host", "guest"]);
const RULESETS = new Set(["eternal", "official", "lab"]);

export function normalizeCustomMatchSettings(input = {}) {
  const firstPlayerMode = FIRST_PLAYER_MODES.has(input?.firstPlayerMode)
    ? input.firstPlayerMode
    : CUSTOM_MATCH_DEFAULTS.firstPlayerMode;
  const parsedTimer = Number(input?.turnTimerSeconds || 0);
  const turnTimerSeconds = TURN_TIMER_OPTIONS.has(parsedTimer)
    ? parsedTimer
    : CUSTOM_MATCH_DEFAULTS.turnTimerSeconds;
  const incomingRuleset = input?.ruleset === "standard" ? "eternal" : input?.ruleset;
  const ruleset = RULESETS.has(incomingRuleset)
    ? incomingRuleset
    : CUSTOM_MATCH_DEFAULTS.ruleset;

  return {
    firstPlayerMode,
    turnTimerSeconds,
    mulliganEnabled: input?.mulliganEnabled !== false,
    ruleset
  };
}

export function resolveFirstPlayerId(settings = {}, random = Math.random) {
  const normalized = normalizeCustomMatchSettings(settings);
  if (normalized.firstPlayerMode === "host") return "player1";
  if (normalized.firstPlayerMode === "guest") return "player2";
  return random() < 0.5 ? "player1" : "player2";
}

export function deckValidationOptionsForSettings(settings = {}) {
  const normalized = normalizeCustomMatchSettings(settings);
  if (normalized.ruleset === "lab") {
    return {
      minimumDeckSize: 1,
      maxSameName: 99,
      regulation: "lab"
    };
  }
  if (normalized.ruleset === "official") return { regulation: "official" };
  return { regulation: "eternal" };
}

export function customMatchSettingsSummary(settings = {}) {
  const normalized = normalizeCustomMatchSettings(settings);
  return {
    ...normalized,
    timed: normalized.turnTimerSeconds > 0,
    official: normalized.ruleset === "official",
    experimental: normalized.ruleset === "lab"
  };
}
