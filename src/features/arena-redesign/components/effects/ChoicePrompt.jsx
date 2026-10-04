export default function ChoicePrompt({ choice, onActionRequest }) {
  if (!choice?.active) return null;

  return (
    <section className="arena-redesign-choice-prompt" aria-label="Effect Choice">
      <strong>{choice.title}</strong>
      <span>{choice.instruction}</span>
      {choice.totalCores != null && <small>{choice.totalCores} Core{choice.totalCores === 1 ? "" : "s"} to distribute</small>}
      <div className="arena-redesign-choice-actions">
        {choice.actions.map((action) => (
          <button key={action.id || `${action.type}-${action.label}`} type="button" onClick={() => onActionRequest?.(action, { source: "effect-decision" })}>
            {action.label}
          </button>
        ))}
      </div>
    </section>
  );
}
