export default function ArenaVisualTriggerReveal({ trigger }) {
  const source = trigger?.source || {};
  const revealed = trigger?.revealed || {};
  return (
    <div className="arena-visual-trigger-reveal">
      <article>
        <span>{trigger?.kind === "xu" ? "XU Source" : "Ultimate"}</span>
        <div>{source.image ? <img src={source.image} alt={source.name || ""} /> : <b>{source.name || "Ultimate"}</b>}</div>
        <strong>{source.name || "Ultimate"}</strong>
        <small>Cost {trigger?.sourceCost ?? "—"}</small>
      </article>
      <div className="arena-visual-trigger-result-mark">
        <b>{trigger?.status === "emptyDeck" ? "—" : trigger?.originalHit ? ">" : "≤"}</b>
        <span>{trigger?.resultLabel || "GUARD"}</span>
      </div>
      <article>
        <span>Revealed</span>
        <div>{revealed.image ? <img src={revealed.image} alt={revealed.name || ""} /> : <b>{revealed.name || "Empty Deck"}</b>}</div>
        <strong>{revealed.name || "Empty Deck"}</strong>
        <small>{trigger?.revealedCost == null ? "—" : `Cost ${trigger.revealedCost}`}</small>
      </article>
    </div>
  );
}
