export default function BurstRevealOverlay({ burst, onActionRequest }) {
  if (!burst?.active) return null;

  return (
    <section className="arena-redesign-effect-window arena-redesign-burst-window" aria-label="Burst Window">
      <div>
        <span className="arena-redesign-effect-eyebrow">Burst Window</span>
        <strong>{burst.viewerOwnsWindow ? "Your Burst opportunity" : "Opponent Burst opportunity"}</strong>
        <small>{burst.event || "Burst condition"}{burst.amount > 0 ? ` · ${burst.amount} Life` : ""}</small>
      </div>
      {burst.viewerOwnsWindow && burst.actions.length > 0 && (
        <div className="arena-redesign-effect-actions">
          {burst.actions.map((action) => (
            <button key={action.id || action.type} type="button" onClick={() => onActionRequest?.(action, { source: "burst" })}>
              {action.type === "ACTIVATE_BURST" ? "Activate Burst" : action.type === "PASS_BURST" ? "Pass Burst" : action.label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
