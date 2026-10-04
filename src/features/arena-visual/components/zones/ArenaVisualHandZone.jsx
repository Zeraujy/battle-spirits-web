import ArenaVisualZone from "./ArenaVisualZone.jsx";
import ArenaVisualHandFan from "../hand/ArenaVisualHandFan.jsx";

export default function ArenaVisualHandZone({ side, hand = {}, onSelectCard, interaction, hoverCardHandlers }) {
  const cards = Array.isArray(hand.cards) ? hand.cards : [];
  const count = Number.isFinite(hand.count) ? hand.count : cards.length;
  return (
    <ArenaVisualZone name="Hand" count={count} className={`arena-visual-hand-zone is-${side}`} data-motion-zone={`hand:${side === "player" ? interaction?.playerId : interaction?.opponentPlayerId}`}>
      <ArenaVisualHandFan side={side} cards={cards} count={count} onSelectCard={onSelectCard} interaction={interaction} hoverCardHandlers={hoverCardHandlers} />
    </ArenaVisualZone>
  );
}
