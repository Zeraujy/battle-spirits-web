import ArenaZone from "./ArenaZone.jsx";

export default function VoidZone({ side }) {
  return (
    <ArenaZone zone="void" label="Void" side={side} compact>
      <div className="arena-redesign-void-mark" aria-label="Void">∞</div>
    </ArenaZone>
  );
}
