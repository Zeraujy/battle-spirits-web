export default function ArenaVisualTriggerCounterPrompt({ trigger, onActionRequest }) {
  if (!trigger || trigger.status !== "counterWindow") return null;

  if (trigger.waiting) {
    return <div className="arena-visual-trigger-waiting">Waiting for the opponent's Trigger Counter response.</div>;
  }

  return (
    <section className="arena-visual-trigger-counter">
      <header><span>Trigger Counter</span><strong>Respond before the HIT effect resolves</strong></header>
      <p>Use a valid Trigger Counter Magic now, or pass this response window.</p>
      <div>
        {(trigger.counterCards || []).map((card) => (
          <button
            type="button"
            key={card.instanceId}
            className="arena-visual-trigger-counter-card"
            onClick={() => onActionRequest?.({
              id: `trigger-counter-${card.instanceId}`,
              type: "USE_TRIGGER_COUNTER",
              instanceId: card.instanceId,
              actorId: trigger.counterPlayerId
            })}
          >
            {card.image ? <img src={card.image} alt="" /> : null}
            <span><strong>{card.name}</strong><small>Cost {card.cost ?? "—"}</small></span>
          </button>
        ))}
        <button
          type="button"
          className="is-quiet"
          onClick={() => onActionRequest?.({ id: "pass-trigger-counter", type: "PASS_TRIGGER_COUNTER", actorId: trigger.counterPlayerId })}
        >
          Do Not Use Trigger Counter
        </button>
      </div>
    </section>
  );
}
