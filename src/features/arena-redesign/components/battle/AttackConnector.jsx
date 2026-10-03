export default function AttackConnector({ blocked = false }) {
  return (
    <svg
      className="arena-redesign-attack-connector"
      viewBox="0 0 180 24"
      role="img"
      aria-label={blocked ? "Attacker to blocker" : "Attacker to Life"}
      preserveAspectRatio="none"
    >
      <defs>
        <marker id="arena-redesign-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" />
        </marker>
      </defs>
      <line x1="6" y1="12" x2="170" y2="12" markerEnd="url(#arena-redesign-arrow)" />
    </svg>
  );
}
