import ArenaZone from "./ArenaZone.jsx";

export default function BurstZone({ side, card }) {
  const occupied = Boolean(card);

  return (
    <ArenaZone zone="burst" label="Burst" side={side} compact>
      <div
        className="arena-redesign-burst-slot"
        data-occupied={occupied ? "true" : "false"}
        data-hidden-card={card?.hidden ? "true" : "false"}
      >
        {occupied ? (
          <span className="arena-redesign-burst-card" aria-hidden="true">
            {card?.hidden ? "Set" : card?.cardId || "Set"}
          </span>
        ) : null}
      </div>
    </ArenaZone>
  );
}
