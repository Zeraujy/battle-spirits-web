export default function TargetingLayer({ interaction }) {
  if (!interaction?.targetingActive) return null;

  const targets = interaction?.targetableInstanceIds || interaction?.targetableFieldInstanceIds || [];
  const selected = interaction?.selectedTargetInstanceIds || [];
  const prompt = interaction?.targeting?.prompt || interaction?.targeting?.label || "Choose a target";

  return (
    <div className="arena-redesign-targeting-layer" role="status" aria-live="polite">
      <strong>{prompt}</strong>
      <span>{selected.length} selected · {targets.length} available</span>
    </div>
  );
}
