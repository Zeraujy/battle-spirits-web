export default function ArenaVisualOptionDecision({ decision, resolve }) {
  return (
    <div className="arena-visual-decision-options">
      {(decision.options || []).map((option) => (
        <button key={option.id} type="button" onClick={() => resolve({ optionId: String(option.id) })}>
          {option.label}
        </button>
      ))}
    </div>
  );
}
