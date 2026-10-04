export default function EffectResolutionPanel({ effect }) {
  if (!effect?.active) return null;
  return (
    <section className="arena-redesign-effect-resolution" aria-live="polite">
      <span className="arena-redesign-effect-eyebrow">Effect Resolution</span>
      <strong>{effect.title}</strong>
      <p>{effect.viewerOwnsDecision ? effect.instruction : "Waiting for the other player to resolve an effect."}</p>
    </section>
  );
}
