import { resolveCardImage, resolveCardThumbnail, getCardName } from "../../game/cardAdapter.js";
import { getCurrentLevel } from "../../game/selectors.js";
import { CoreToken } from "../game/CoreArea.jsx";

/**
 * Shared visual representation of a Battle Spirits card.
 *
 * Important implementation detail:
 * cards intentionally do NOT use the browser's native HTML drag-and-drop.
 * Native dragging creates the translucent browser ghost and the "not allowed"
 * cursor that feels wrong in a digital card game. Simulator.jsx provides a
 * pointer-driven drag layer instead.
 */
export default function CardTile({
  card,
  physical,
  hidden = false,
  selected = false,
  onClick,
  onPointerDown,
  compact = false,
  footer,
  onCoreDrop,
  onCoreDragStart,
  onCoreClick,
  canDragCores = false,
  onPreviewStart,
  onPreviewEnd,
  staticPreview = false,
  unusable = false,
  dragActive = false,
  imageVariant = "full",
  loading = "eager",
  fetchPriority
}) {
  const level = physical && card ? getCurrentLevel(card, physical) : null;
  const regular = Number(physical?.cores?.regular || 0);
  const fullImage = hidden ? "./images/card-back.png" : resolveCardImage(card);
  const image = hidden ? fullImage : (imageVariant === "thumbnail" ? resolveCardThumbnail(card) : fullImage);
  const title = hidden ? "Carta oculta" : getCardName(card);

  return (
    <button
      type="button"
      className={`card-tile ${compact ? "compact" : ""} ${selected ? "selected" : ""} ${physical?.exhausted && !staticPreview ? "exhausted" : ""} ${physical?.flags?.pendingManualPlay ? "pending-play-card" : ""} ${unusable ? "unusable" : ""} ${dragActive ? "pointer-drag-active" : ""}`}
      onClick={onClick}
      onPointerDown={onPointerDown}
      title={title}
      draggable={false}
      onDragStart={(event) => event.preventDefault()}
      onDragOver={onCoreDrop ? (event) => {
        if (event.dataTransfer?.types?.includes("application/x-bs-core")) {
          event.preventDefault();
        }
      } : undefined}
      onDrop={onCoreDrop}
      onMouseEnter={!hidden && card ? (event) => onPreviewStart?.(card, event) : undefined}
      onMouseLeave={!hidden && card ? () => onPreviewEnd?.() : undefined}
    >
      <img
        src={image}
        alt={title}
        draggable={false}
        decoding="async"
        loading={loading}
        fetchPriority={fetchPriority}
        onError={imageVariant === "thumbnail" ? (event) => {
          if (event.currentTarget.dataset.fullFallback === "true") return;
          event.currentTarget.dataset.fullFallback = "true";
          event.currentTarget.src = fullImage;
        } : undefined}
      />

      {!hidden && physical && (
        <>
          <div className="card-badges">
            <span>{regular + (physical.cores?.soul ? 1 : 0)}C</span>
            {physical.cores?.soul && <span className="soul">S</span>}
            {level && <span>Lv{level.level}</span>}
            {physical.temporaryBP ? (
              <span>{physical.temporaryBP > 0 ? "+" : ""}{physical.temporaryBP} BP</span>
            ) : null}
          </div>

          <div className="card-core-tokens">
            {Array.from({ length: Math.min(regular, 8) }, (_, index) => (
              <CoreToken
                key={index}
                coreType="regular"
                canDrag={canDragCores}
                source={{ zone: "card", instanceId: physical.instanceId, tokenIndex: index }}
                onDragStart={onCoreDragStart}
                onClick={onCoreClick}
                style={{ left: `${20 + (index % 4) * 17}%`, top: `${67 + Math.floor(index / 4) * 10}%` }}
              />
            ))}
            {physical.cores?.soul && (
              <CoreToken
                coreType="soul"
                canDrag={canDragCores}
                source={{ zone: "card", instanceId: physical.instanceId, tokenIndex: "soul" }}
                onDragStart={onCoreDragStart}
                onClick={onCoreClick}
                style={{ left: "72%", top: "70%" }}
              />
            )}
          </div>
        </>
      )}

      {physical?.combinedWith && <span className="combined-tag">BRAVE</span>}
      {footer}
    </button>
  );
}
