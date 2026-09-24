export const FORMAT = "eternal";
export const RULES_VERSION = "17.1";

export const PHASES = [
  "start",
  "core",
  "draw",
  "refresh",
  "main",
  "attack",
  "end"
];

export const PHASE_LABELS = {
  start: "Start Step",
  core: "Core Step",
  draw: "Draw Step",
  refresh: "Refresh Step",
  main: "Main Step",
  attack: "Attack Step",
  end: "End Step"
};

export const COLORS = ["red", "purple", "green", "white", "yellow", "blue"];
export const BATTLE_CARD_TYPES = new Set(["spirit", "ultimate", "brave"]);
export const FIELD_ZONES = ["spirits", "nexuses", "other"];

export const GAME_DEFAULTS = {
  life: 5,
  reserveRegularCores: 3,
  startingHand: 4,
  maxSameName: 3,
  minimumDeckSize: 40
};
