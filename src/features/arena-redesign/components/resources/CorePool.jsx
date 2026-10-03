import CoreToken from "./CoreToken.jsx";

function normalizeCount(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

export default function CorePool({
  regularCount = 0,
  soulCore = false,
  state = "available",
  compact = false,
  maxVisible = 8,
  label = "Cores",
  playerId = null,
  zone = null,
  instanceId = null,
  interactive = false,
  selectedCore = null,
  payingCoreKeys = null,
  onCoreClick,
  onCoreDragStart
}) {
  const normalizedCount = normalizeCount(regularCount);
  const visibleCount = Math.min(normalizedCount, maxVisible);
  const hiddenCount = Math.max(0, normalizedCount - visibleCount);
  const size = compact ? "small" : "medium";
  const payingSet = payingCoreKeys instanceof Set
    ? payingCoreKeys
    : new Set(Array.isArray(payingCoreKeys) ? payingCoreKeys : []);

  function isPaying(coreType, tokenIndex) {
    const key = [zone || "", instanceId || "", coreType, String(tokenIndex)].join(":");
    return payingSet.has(key);
  }

  return (
    <div
      className={`arena-redesign-core-pool${compact ? " is-compact" : ""}`}
      data-regular-count={normalizedCount}
      data-soul-core={soulCore ? "true" : "false"}
      aria-label={`${label}: ${normalizedCount + (soulCore ? 1 : 0)}`}
    >
      <div className="arena-redesign-core-pool-tokens">
        {Array.from({ length: visibleCount }, (_, index) => (
          <CoreToken
            key={`core-${index}`}
            type="core"
            state={state}
            size={size}
            index={index}
            playerId={playerId}
            zone={zone}
            instanceId={instanceId}
            interactive={interactive}
            selectedCore={selectedCore}
            paying={isPaying("regular", index)}
            onCoreClick={onCoreClick}
            onCoreDragStart={onCoreDragStart}
          />
        ))}

        {soulCore ? (
          <CoreToken
            type="soul-core"
            state={state}
            size={size}
            index={visibleCount}
            playerId={playerId}
            zone={zone}
            instanceId={instanceId}
            interactive={interactive}
            selectedCore={selectedCore}
            paying={isPaying("soul", "soul")}
            onCoreClick={onCoreClick}
            onCoreDragStart={onCoreDragStart}
          />
        ) : null}
      </div>

      {hiddenCount > 0 ? (
        <span className="arena-redesign-core-overflow" aria-hidden="true">
          +{hiddenCount}
        </span>
      ) : null}
    </div>
  );
}
