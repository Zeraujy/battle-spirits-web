export default function ArenaVisualMirageZone({ side, mirage = {}, onSelectCard, hoverCardHandlers }) {
  const card = Array.isArray(mirage.cards) ? mirage.cards[0] : null;
  return (
    <section className={`arena-visual-mirage-zone is-${side}${card ? " has-card" : ""}`} aria-label={`${side} Mirage`}>
      <header><span>Mirage</span>{card ? <strong>1</strong> : null}</header>
      <div
        className="arena-visual-mirage-card"
        data-motion-zone={`mirage:${mirage.playerId || side}`}
        data-motion-card-instance={card?.instanceId || undefined}
        onClick={() => card && onSelectCard?.({ ...card, sourceZone: "Mirage", owner: side })}
        onMouseEnter={card && !card.hidden ? (event) => hoverCardHandlers?.begin?.(card, event) : undefined}
        onMouseMove={card && !card.hidden ? (event) => hoverCardHandlers?.move?.(event) : undefined}
        onMouseLeave={card && !card.hidden ? () => hoverCardHandlers?.end?.() : undefined}
      >
        {card?.image ? <img src={card.image} alt={card.name || "Mirage"} draggable="false" /> : <span>Empty</span>}
      </div>
    </section>
  );
}
