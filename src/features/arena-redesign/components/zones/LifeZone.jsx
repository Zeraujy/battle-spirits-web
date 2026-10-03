import ArenaZone from "./ArenaZone.jsx";
import CorePool from "../resources/CorePool.jsx";

export default function LifeZone({ side, playerId, life = 0, soulCore = false }) {
  return (
    <ArenaZone zone="life" label="Life" side={side} count={life} compact>
      <CorePool
        regularCount={life}
        soulCore={soulCore}
        compact
        maxVisible={6}
        label="Life"
        playerId={playerId}
        zone="life"
        interactive={false}
      />
    </ArenaZone>
  );
}
