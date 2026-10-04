export function getArenaVisualBattlefieldLane(card) {
  const type = String(card?.cardType || card?.type || "").trim().toLowerCase();
  if (type === "nexus") return "right";
  if (type === "spirit" || type === "ultimate") return "center";
  return "left";
}

export function groupArenaVisualBattlefieldCards(cards = []) {
  const lanes = { left: [], center: [], right: [] };
  for (const card of Array.isArray(cards) ? cards : []) {
    lanes[getArenaVisualBattlefieldLane(card)].push(card);
  }
  return lanes;
}
