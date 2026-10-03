import ArenaZone from "./ArenaZone.jsx";

export default function TrashZone({ side, cards = [], count = 0 }) {
  const topCard = Array.isArray(cards) && cards.length ? cards[cards.length - 1] : null;

  return (
    <ArenaZone zone="trash" label="Trash" side={side} count={count} compact>
      <div className="arena-redesign-zone-card-preview" data-has-card={topCard ? "true" : "false"}>
        {topCard ? (
          <span className="arena-redesign-card-reference" title={topCard.cardId || "Trash card"}>
            {topCard.cardId || "Card"}
          </span>
        ) : (
          <span className="arena-redesign-empty-zone-mark" aria-hidden="true">—</span>
        )}
      </div>
    </ArenaZone>
  );
}
