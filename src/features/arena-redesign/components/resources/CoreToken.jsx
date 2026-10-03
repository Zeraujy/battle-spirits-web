import {
  createCoreInteractionPayload,
  isSameCoreSelection,
  writeCoreDragPayload
} from "../../interactions/coreInteraction.js";

const CORE_ASSET_URL = "/assets/game-resources/core.png";
const SOUL_CORE_ASSET_URL = "/assets/game-resources/soul-core.png";

export default function CoreToken({
  type = "core",
  state = "available",
  size = "medium",
  index = 0,
  playerId = null,
  zone = null,
  instanceId = null,
  interactive = false,
  selectedCore = null,
  paying = false,
  onCoreClick,
  onCoreDragStart
}) {
  const isSoulCore = type === "soul-core";
  const coreType = isSoulCore ? "soul" : "regular";
  const assetUrl = isSoulCore ? SOUL_CORE_ASSET_URL : CORE_ASSET_URL;
  const label = isSoulCore ? "Soul Core" : "Core";
  const payload = createCoreInteractionPayload({
    playerId,
    zone,
    instanceId,
    coreType,
    tokenIndex: isSoulCore ? "soul" : index
  });
  const selected = isSameCoreSelection(selectedCore, payload);
  const visualState = paying ? "paying" : selected ? "selected" : state;
  const canInteract = Boolean(interactive && zone && playerId);

  function handleDragStart(event) {
    if (!canInteract) {
      event.preventDefault();
      return;
    }
    event.stopPropagation();
    writeCoreDragPayload(event, payload);
    onCoreDragStart?.(event, payload);
  }

  function activate(event) {
    event.stopPropagation();
    if (!canInteract) return;
    onCoreClick?.(payload);
  }

  return (
    <button
      type="button"
      className={`arena-redesign-core-token is-${type} is-${visualState} is-${size}${canInteract ? " is-interactive" : ""}`}
      data-core-type={type}
      data-core-state={visualState}
      data-core-index={index}
      data-core-zone={zone || undefined}
      data-core-instance-id={instanceId || undefined}
      title={label}
      aria-label={`${label}${zone ? ` in ${zone}` : ""}`}
      aria-pressed={canInteract ? selected : undefined}
      draggable={canInteract}
      onDragStart={handleDragStart}
      onClick={activate}
      disabled={!canInteract}
    >
      <img src={assetUrl} alt="" draggable="false" />
    </button>
  );
}
