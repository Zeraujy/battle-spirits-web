import ArenaVisualHandCard from "./ArenaVisualHandCard.jsx";
import { createHandFanLayout } from "./handFanLayout.js";

export default function ArenaVisualHandFan({ side, cards = [], count = 0, onSelectCard, interaction, hoverCardHandlers }) {
  const visibleCount = Math.min(Math.max(cards.length || count || 0, 0), 12);
  const layout = createHandFanLayout(visibleCount, side);
  const normalizedCards = Array.from({ length: visibleCount }, (_, index) => cards[index] || null);
  return (
    <div className={`arena-visual-hand-fan is-${side}`}>
      {normalizedCards.map((card, index) => (
        <ArenaVisualHandCard
          key={card?.id || `${side}-hand-${index}`}
          side={side}
          card={card}
          layout={layout[index]}
          onSelectCard={onSelectCard}
          interaction={interaction}
          hoverCardHandlers={hoverCardHandlers}
        />
      ))}
    </div>
  );
}
