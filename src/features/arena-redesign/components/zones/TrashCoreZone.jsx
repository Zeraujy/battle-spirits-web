import CoreResourceZone from "../resources/CoreResourceZone.jsx";

export default function TrashCoreZone({
  side,
  playerId,
  trashCores = 0,
  soulCore = false,
  interaction = null
}) {
  const interactive =
    side === "player" &&
    Boolean(interaction?.canMoveCores && interaction?.allowCoreTrashControl);

  return (
    <CoreResourceZone
      label="Core Trash"
      zone="trash"
      regularCount={trashCores}
      soulCore={soulCore}
      compact
      playerId={playerId}
      interactive={interactive}
      interaction={interaction}
      className={`is-${side}`}
    />
  );
}
