import ArenaZone from "./ArenaZone.jsx";
import ArenaHandFan from "../hand/ArenaHandFan.jsx";

export default function HandZone({ side, cards = [], count = 0, interaction = null }) {
  const list = Array.isArray(cards) ? cards : [];
  const cardCount = Number.isFinite(Number(count)) ? Number(count) : list.length;

  return (
    <ArenaZone zone="hand" label="Hand" side={side} count={cardCount}>
      <ArenaHandFan side={side} cards={list} interaction={interaction} />
    </ArenaZone>
  );
}
