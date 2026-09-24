/**
 * Touch/click policy for Core tokens in the desktop simulator.
 *
 * This module DOES NOT move Cores and does not validate Battle Spirits rules.
 * It only converts an intentional click into a suggested destination. The
 * actual movement is still dispatched as MOVE_CORE and validated by the
 * Rules Engine in src/game/cores.js.
 */
export function getSmartCoreClickTarget({
  source,
  pendingPlay = null,
  pendingCost = null,
  paidCount = 0,
  pendingCoreCount = 0,
  selectedFieldInstanceId = null,
  freeMainMove = false
} = {}) {
  if (!source?.zone) return null;

  const pending = pendingPlay || pendingCost;

  // During a manual payment, clicking a paid Core in Core Trash is a quick
  // undo action. The engine decides whether that exact Core can return.
  if (source.zone === "trash") {
    return pending
      ? { zone: "reserve", reason: "undo-payment" }
      : null;
  }

  // Clicking a Core already placed on the pending summon returns it to the
  // Reserve so the player can correct the minimum-Level allocation.
  if (source.zone === "card") {
    if (pendingPlay?.instanceId === source.instanceId) {
      return { zone: "reserve", reason: "remove-pending-core" };
    }

    // Outside payment, a Core on one of your cards can be clicked back to the
    // Reserve during the normal free Main-Step movement window.
    if (!pending && freeMainMove) {
      return { zone: "reserve", reason: "return-to-reserve" };
    }

    return null;
  }

  if (source.zone !== "reserve") return null;

  // Magic / Flash only need their cost paid to Core Trash.
  if (pendingCost) {
    return Number(paidCount) < Number(pendingCost.payableCost || 0)
      ? { zone: "trash", reason: "pay-cost" }
      : null;
  }

  if (pendingPlay) {
    // Smart-click order for a summon/deploy:
    // 1) pay the invocation cost;
    // 2) place the next Cores on the pending card for its minimum Level;
    // 3) keep allowing extra Cores so the player may summon at a higher Level.
    if (Number(paidCount) < Number(pendingPlay.payableCost || 0)) {
      return { zone: "trash", reason: "pay-cost" };
    }

    // A Brave summoned directly combined has no standalone Level Core
    // requirement. Avoid putting Cores on the attached Brave by accident.
    if (
      pendingPlay.directCombineHostInstanceId &&
      Number(pendingPlay.minimumCores || 0) === 0
    ) {
      return null;
    }

    return {
      zone: "card",
      instanceId: pendingPlay.instanceId,
      reason:
        Number(pendingCoreCount) < Number(pendingPlay.minimumCores || 0)
          ? "minimum-core"
          : "extra-level-core"
    };
  }

  // Normal Main Step convenience: select one of your field cards, then click
  // Cores in the Reserve to place them on that card. MOVE_CORE still validates
  // the action and special Nexus restrictions.
  if (freeMainMove && selectedFieldInstanceId) {
    return {
      zone: "card",
      instanceId: selectedFieldInstanceId,
      reason: "selected-card"
    };
  }

  return null;
}
