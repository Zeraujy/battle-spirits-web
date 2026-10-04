export default function ArenaVisualBurstPrompt({ burst }) {
  if (!burst) return null;
  return (
    <section className={`arena-visual-burst-prompt${burst.waiting ? " is-waiting" : ""}`}>
      <header>
        <span>Burst Opportunity</span>
        <strong>{burst.waiting ? "Opponent decision" : "Activation window detected"}</strong>
      </header>
      {!burst.hidden && burst.card ? (
        <div>
          {burst.card.image ? <img src={burst.card.image} alt="" draggable="false" /> : null}
          <span><strong>{burst.card.name || "Burst"}</strong><small>{burst.cause || "Burst condition"}</small></span>
        </div>
      ) : (
        <p>{burst.waiting ? "Waiting for the opponent to activate or pass Burst." : "Choose whether to activate the set Burst."}</p>
      )}
    </section>
  );
}
