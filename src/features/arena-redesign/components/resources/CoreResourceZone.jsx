import CorePool from "./CorePool.jsx";
import { readCoreDragPayload } from "../../interactions/coreInteraction.js";

export default function CoreResourceZone({
  label,
  zone,
  regularCount = 0,
  soulCore = false,
  compact = false,
  className = "",
  playerId = null,
  interactive = false,
  interaction = null
}) {
  function handleDragOver(event) {
    if (!interactive) return;
    if (event.dataTransfer?.types?.includes("application/x-bs-core")) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    }
  }

  function handleDrop(event) {
    if (!interactive) return;
    event.preventDefault();
    event.stopPropagation();
    const payload = readCoreDragPayload(event);
    if (!payload) return;
    interaction?.onCoreMove?.(payload, { zone });
  }

  return (
    <section
      className={`arena-redesign-resource-zone arena-redesign-resource-zone-${zone} ${className}${interactive ? " is-interactive" : ""}`.trim()}
      data-core-zone={zone}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <header className="arena-redesign-zone-label">
        <span>{label}</span>
        <strong>{Number(regularCount || 0) + (soulCore ? 1 : 0)}</strong>
      </header>

      <CorePool
        regularCount={regularCount}
        soulCore={soulCore}
        compact={compact}
        label={label}
        playerId={playerId}
        zone={zone}
        interactive={interactive}
        selectedCore={interaction?.selectedCore || null}
        payingCoreKeys={interaction?.payingCoreKeys || null}
        onCoreClick={interaction?.onCoreClick}
        onCoreDragStart={interaction?.onCoreDragStart}
      />
    </section>
  );
}
