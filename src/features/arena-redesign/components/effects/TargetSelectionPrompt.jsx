export default function TargetSelectionPrompt({ targetSelection }) {
  if (!targetSelection?.active) return null;
  const required = targetSelection.minimum === targetSelection.maximum
    ? `${targetSelection.minimum}`
    : `${targetSelection.minimum}-${targetSelection.maximum}`;
  return (
    <section className="arena-redesign-target-prompt" aria-live="polite">
      <strong>{targetSelection.title}</strong>
      <span>{targetSelection.instruction}</span>
      <small>Selected {targetSelection.selectedCount} · Required {required}</small>
    </section>
  );
}
