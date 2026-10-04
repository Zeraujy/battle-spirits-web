export default function ArenaVisualCoreToken({
  kind = "core",
  compact = false,
  index = 0,
  style,
  draggable = false,
  onDragStart,
  onClick
}) {
  const isSoulCore = kind === "soul-core";
  const isEmpty = kind === "empty";
  const ariaLabel = isEmpty ? "Empty core slot" : (isSoulCore ? "Soul Core" : "Core");

  return (
    <span
      className={`arena-visual-core-token ${isSoulCore ? "is-soul-core" : isEmpty ? "is-empty" : "is-core"}${compact ? " is-compact" : ""}${draggable ? " is-interactive" : ""}`}
      style={{ "--arena-visual-core-index": index, ...(style || {}) }}
      aria-label={ariaLabel}
      role={!isEmpty && onClick ? "button" : undefined}
      tabIndex={!isEmpty && onClick ? 0 : undefined}
      draggable={!isEmpty && draggable}
      onDragStart={!isEmpty ? onDragStart : undefined}
      onClick={!isEmpty ? onClick : undefined}
      onKeyDown={!isEmpty && onClick ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick(event);
        }
      } : undefined}
    >
      {isEmpty ? null : (
        <img
          src={isSoulCore ? "/assets/arena/resources/soul-core.png" : "/assets/arena/resources/core.png"}
          alt=""
          draggable="false"
        />
      )}
    </span>
  );
}
