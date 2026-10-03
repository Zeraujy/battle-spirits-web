export default function TargetingUX({
  active = false,
  mode = "none",
  label = "",
  targetableCount = 0,
  selectedCount = 0,
  className = ""
}) {
  if (!active) return null;

  return (
    <div
      className={`arena-targeting-ux ${className}`.trim()}
      data-targeting-mode={mode}
      aria-live="polite"
    >
      <span className="arena-targeting-pulse" aria-hidden="true" />
      <strong>{label}</strong>
      {targetableCount > 0 && (
        <span className="arena-targeting-count">
          {selectedCount > 0 ? `${selectedCount} / ` : ""}{targetableCount}
        </span>
      )}
    </div>
  );
}
