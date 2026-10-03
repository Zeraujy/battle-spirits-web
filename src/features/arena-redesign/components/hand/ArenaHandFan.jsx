import ArenaHandCard from "./ArenaHandCard.jsx";
import { getHandDensity, getHandFanStyle } from "./handFanLayout.js";

export default function ArenaHandFan({ side = "player", cards = [], interaction = null }) {
  const list = Array.isArray(cards) ? cards : [];
  const density = getHandDensity(list.length);

  return (
    <div
      className={`arena-redesign-hand-fan is-${side} is-${density}`}
      data-hand-count={list.length}
      data-hand-density={density}
    >
      {list.map((physical, index) => (
        <ArenaHandCard
          key={physical?.instanceId || `${side}-hand-${index}`}
          physical={physical}
          side={side}
          density={density}
          interaction={interaction}
          style={getHandFanStyle(index, list.length, side)}
        />
      ))}
    </div>
  );
}
