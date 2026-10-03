import ArenaZone from "./ArenaZone.jsx";

export default function DeckZone({ side, count = 0 }) {
  return (
    <ArenaZone zone="deck" label="Deck" side={side} count={count} compact>
      <div className="arena-redesign-card-back" aria-hidden="true">
        <img src="/images/card-back.webp" alt="" draggable="false" />
      </div>
    </ArenaZone>
  );
}
