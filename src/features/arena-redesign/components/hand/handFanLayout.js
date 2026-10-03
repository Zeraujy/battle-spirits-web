function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function getHandDensity(cardCount) {
  const count = Math.max(0, Number(cardCount) || 0);
  if (count <= 7) return "comfortable";
  if (count <= 11) return "dense";
  return "compact";
}

export function getHandFanStyle(index, cardCount, side = "player") {
  const count = Math.max(1, Number(cardCount) || 1);
  const center = (count - 1) / 2;
  const relative = Number(index) - center;
  const normalized = center > 0 ? relative / center : 0;
  const spread = getHandDensity(count) === "comfortable" ? 44 : getHandDensity(count) === "dense" ? 38 : 32;
  const rotationLimit = getHandDensity(count) === "comfortable" ? 13 : getHandDensity(count) === "dense" ? 10 : 7;
  const edgeLift = getHandDensity(count) === "comfortable" ? 12 : 8;
  const direction = side === "opponent" ? -1 : 1;

  return {
    leftPercent: 50 + normalized * spread,
    rotationDeg: clamp(normalized * rotationLimit * direction, -rotationLimit, rotationLimit),
    liftPx: Math.abs(normalized) * edgeLift,
    zIndex: 10 + index
  };
}
