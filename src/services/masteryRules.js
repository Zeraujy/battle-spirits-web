export const MASTERY_THRESHOLDS = [0, 250, 650, 1300, 2300, 3800, 6000];

export function masteryLevelFromXp(xp = 0) {
  const points = Math.max(0, Number(xp || 0));
  let level = 1;
  for (let index = 0; index < MASTERY_THRESHOLDS.length; index += 1) {
    if (points >= MASTERY_THRESHOLDS[index]) level = index + 1;
  }
  return Math.min(7, level);
}

export function masteryNextThreshold(level = 1) {
  const safe = Math.max(1, Math.min(7, Number(level || 1)));
  return safe >= 7 ? null : MASTERY_THRESHOLDS[safe];
}

export function masteryXpForMatch({ result, isCover = false } = {}) {
  return 40 + (result === "win" ? 20 : 0) + (isCover ? 15 : 0);
}
