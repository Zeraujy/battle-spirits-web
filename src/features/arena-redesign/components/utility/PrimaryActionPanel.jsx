export default function PrimaryActionPanel({ actions = [], onActionRequest }) {
  return (
    <section className="arena-redesign-utility-section" aria-label="Contextual actions">
      <header className="arena-redesign-utility-title">Actions</header>
      <div className="arena-redesign-primary-actions" data-action-count={actions.length}>
        {actions.length ? actions.map((action) => (
          <button
            key={action.id || action.type}
            type="button"
            onClick={() => onActionRequest?.(action)}
            data-action-type={action.type}
          >
            {action.label}
          </button>
        )) : (
          <div className="arena-redesign-utility-empty">No global action available</div>
        )}
      </div>
    </section>
  );
}
