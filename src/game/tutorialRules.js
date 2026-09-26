/**
 * Player-facing Eternal tutorial reference.
 * Keep this intentionally small: it is not a replacement for the full rulebook.
 * Reference: Battle Spirits Official Rule Manual [Eternal] Ver.17.1.
 */
export const ETERNAL_TUTORIAL_RULES = Object.freeze({
  manualVersion: "17.1",
  setup: Object.freeze({
    life: 5,
    reserveCores: 3,
    soulCores: 1,
    openingHand: 4,
    mulligans: 1
  }),
  phases: Object.freeze([
    "start",
    "core",
    "draw",
    "refresh",
    "main",
    "attack",
    "end"
  ]),
  firstPlayerFirstTurnSkips: Object.freeze(["core", "attack"]),
  battleFlow: Object.freeze([
    "attack",
    "flash1",
    "block",
    "flash2",
    "resolve"
  ]),
  defenderHasFirstFlashPriority: true,
  sameTurnAttacksAllowed: true
});

export function tutorialRuleSummary(language = "ptBR") {
  const en = language === "en";
  return {
    setup: en
      ? "Start with 5 Life, 3 Cores + 1 Soul Core in Reserve and 4 cards in Hand."
      : "Comece com 5 de Life, 3 Cores + 1 Soul Core no Reserve e 4 cartas na mão.",
    goal: en
      ? "Reduce the opponent's Life to 0, or make them run out of cards in their Deck."
      : "Reduza o Life do oponente a 0 ou faça o Deck dele ficar sem cartas.",
    firstTurn: en
      ? "On the first player's first turn, Core Step and Attack Step are skipped."
      : "No primeiro turno de quem começa, Core Step e Attack Step são pulados."
  };
}
