export function createHandFanLayout(count = 0, side = "player") {
  const safeCount = Math.max(0, Math.min(Number.isFinite(count) ? count : 0, 12));
  if (safeCount === 0) return [];
  const center = (safeCount - 1) / 2;
  const spread = safeCount <= 5 ? 6.4 : safeCount <= 8 ? 5.2 : 4.25;
  const direction = side === "opponent" ? -1 : 1;

  return Array.from({ length: safeCount }, (_, index) => {
    const relative = index - center;
    return {
      index,
      offset: relative,
      rotation: relative * spread * direction,
      lift: Math.abs(relative) * 1.6,
      zIndex: index + 1
    };
  });
}
