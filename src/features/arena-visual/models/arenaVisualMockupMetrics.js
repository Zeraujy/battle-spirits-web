export const ARENA_VISUAL_MOCKUP_REFERENCE = Object.freeze({
  width: 1650,
  height: 928,
  utilityWidthRatio: 0.233,
  playerLeftRailWidthRatio: 0.091,
  playerRightRailWidthRatio: 0.061,
  opponentLeftRailWidthRatio: 0.061,
  opponentRightRailWidthRatio: 0.091,
  zoneHeightRatios: Object.freeze({
    life: 0.117,
    burst: 0.149,
    reserve: 0.116,
    deck: 0.151,
    trash: 0.149,
    coreTrash: 0.098
  }),
  burstWidthRatioWithinWideRail: 0.68
});

function percentage(value) {
  return Number((value * 100).toFixed(3));
}

export function createArenaVisualMockupStyle() {
  const metrics = ARENA_VISUAL_MOCKUP_REFERENCE;
  return {
    "--arena-visual-utility-width": `${percentage(metrics.utilityWidthRatio)}vw`,
    "--arena-visual-player-left-rail-width": `${percentage(metrics.playerLeftRailWidthRatio)}vw`,
    "--arena-visual-player-right-rail-width": `${percentage(metrics.playerRightRailWidthRatio)}vw`,
    "--arena-visual-opponent-left-rail-width": `${percentage(metrics.opponentLeftRailWidthRatio)}vw`,
    "--arena-visual-opponent-right-rail-width": `${percentage(metrics.opponentRightRailWidthRatio)}vw`,
    "--arena-visual-zone-life-height": `${percentage(metrics.zoneHeightRatios.life)}vh`,
    "--arena-visual-zone-burst-height": `${percentage(metrics.zoneHeightRatios.burst)}vh`,
    "--arena-visual-zone-reserve-height": `${percentage(metrics.zoneHeightRatios.reserve)}vh`,
    "--arena-visual-zone-deck-height": `${percentage(metrics.zoneHeightRatios.deck)}vh`,
    "--arena-visual-zone-trash-height": `${percentage(metrics.zoneHeightRatios.trash)}vh`,
    "--arena-visual-zone-core-trash-height": `${percentage(metrics.zoneHeightRatios.coreTrash)}vh`,
    "--arena-visual-burst-width-ratio": String(metrics.burstWidthRatioWithinWideRail)
  };
}
