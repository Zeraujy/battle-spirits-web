function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getFieldCardDensity(cardCount) {
  const count = Math.max(0, number(cardCount));
  if (count <= 3) return "large";
  if (count <= 6) return "medium";
  return "compact";
}

export function getFieldCardLevel(card, physical) {
  const levels = Array.isArray(card?.levels) ? card.levels : [];
  if (!levels.length) return null;

  const totalCores =
    Math.max(0, number(physical?.cores?.regular)) +
    (physical?.cores?.soul ? 1 : 0);

  let current = null;
  for (const level of levels) {
    if (number(level?.cores) <= totalCores) current = level;
  }

  return current;
}

export function getFieldCardBp(card, physical) {
  const level = getFieldCardLevel(card, physical);
  if (!level) return null;

  return Math.max(
    0,
    number(level.bp) + number(physical?.temporaryBP)
  );
}

export function getFieldCardRole(instanceId, battle) {
  if (!instanceId || !battle) return null;
  if (battle.attackerInstanceId === instanceId) return "attacker";
  if (battle.blockerInstanceId === instanceId) return "blocker";
  return null;
}
