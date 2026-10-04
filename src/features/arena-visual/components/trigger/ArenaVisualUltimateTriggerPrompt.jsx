import ArenaVisualTriggerCounterPrompt from "./ArenaVisualTriggerCounterPrompt.jsx";
import ArenaVisualTriggerReveal from "./ArenaVisualTriggerReveal.jsx";

export default function ArenaVisualUltimateTriggerPrompt({ trigger, onActionRequest }) {
  if (!trigger) return null;

  return (
    <section className={`arena-visual-ultimate-trigger is-${String(trigger.resultLabel || "guard").toLowerCase()}${trigger.kind === "xu" ? " is-xu" : ""}`}>
      <header>
        <div><span>{trigger.kind === "xu" ? "XU Trigger" : "Ultimate Trigger"}</span><h2>{trigger.resultLabel}</h2></div>
        <b>{trigger.statusLabel}</b>
      </header>

      <ArenaVisualTriggerReveal trigger={trigger} />

      {trigger.criticalHit?.eligible && !trigger.countered ? (
        <div className="arena-visual-trigger-critical">
          <span>Critical Hit</span>
          <strong>Critical Hit condition met</strong>
          {trigger.criticalHit.text ? <p>{trigger.criticalHit.text}</p> : null}
        </div>
      ) : null}

      <ArenaVisualTriggerCounterPrompt trigger={trigger} onActionRequest={onActionRequest} />

      {trigger.effectText && trigger.status !== "counterWindow" ? (
        <div className="arena-visual-trigger-effect">
          <span>{trigger.kind === "xu" ? "XU Hit Effect" : trigger.hit ? "Hit Effect" : "Result"}</span>
          <p>{trigger.effectText}</p>
        </div>
      ) : null}

      {trigger.status !== "counterWindow" ? (
        <footer>
          {trigger.waiting ? (
            <span>Waiting for the Trigger controller to continue.</span>
          ) : (
            <button
              type="button"
              onClick={() => onActionRequest?.({
                id: "resolve-ultimate-trigger",
                type: "RESOLVE_ULTIMATE_TRIGGER",
                actorId: trigger.controllerPlayerId
              })}
            >
              {trigger.countered ? "Continue After Trigger Counter" : trigger.hit ? `Resolve ${trigger.kind === "xu" ? "XU HIT" : "HIT"} and Continue` : "Continue"}
            </button>
          )}
        </footer>
      ) : null}
    </section>
  );
}
