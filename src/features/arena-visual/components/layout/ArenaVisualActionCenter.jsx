import { useEffect, useRef } from "react";
import ArenaVisualDecisionHost from "../decisions/ArenaVisualDecisionHost.jsx";
import ArenaVisualUltimateTriggerPrompt from "../trigger/ArenaVisualUltimateTriggerPrompt.jsx";
import ArenaVisualBattleState from "../battle/ArenaVisualBattleState.jsx";
import ArenaVisualBurstPrompt from "../burst/ArenaVisualBurstPrompt.jsx";
import ArenaVisualMulliganPrompt from "../setup/ArenaVisualMulliganPrompt.jsx";

export default function ArenaVisualActionCenter({ utility = {}, onActionRequest }) {
  const rawActions = Array.isArray(utility?.actions) ? utility.actions.slice(0, 8) : [];
  const decision = utility?.effectDecision || null;
  const ultimateTrigger = utility?.ultimateTrigger || null;
  const autoResolvedRef = useRef(null);
  const resolveAction = rawActions.find((action) => action?.type === "RESOLVE_BATTLE") || null;
  const actions = rawActions.filter((action) => !["DECLARE_ATTACK", "DECLARE_BLOCK", "RESOLVE_BATTLE"].includes(action?.type));

  useEffect(() => {
    if (!resolveAction || decision || ultimateTrigger) {
      if (!resolveAction) autoResolvedRef.current = null;
      return;
    }
    const key = `${utility?.battle?.attackerInstanceId || "battle"}:${utility?.battle?.stage || "resolve"}`;
    if (autoResolvedRef.current === key) return;
    autoResolvedRef.current = key;
    onActionRequest?.(resolveAction);
  }, [resolveAction, decision, ultimateTrigger, onActionRequest, utility?.battle?.attackerInstanceId, utility?.battle?.stage]);

  if (!decision && !ultimateTrigger && !actions.length && !utility?.battle && !utility?.burstOpportunity && !utility?.setup) return null;

  return (
    <div className="arena-visual-action-center" aria-label="Arena action prompt">
      {decision ? <ArenaVisualDecisionHost decision={decision} onActionRequest={onActionRequest} /> : null}
      {!decision && ultimateTrigger ? <ArenaVisualUltimateTriggerPrompt trigger={ultimateTrigger} onActionRequest={onActionRequest} /> : null}
      {!decision && !ultimateTrigger && utility?.setup ? <ArenaVisualMulliganPrompt setup={utility.setup} onActionRequest={onActionRequest} /> : null}
      {!decision && !ultimateTrigger && !utility?.setup && utility?.burstOpportunity ? <ArenaVisualBurstPrompt burst={utility.burstOpportunity} /> : null}
      {!decision && !ultimateTrigger && !utility?.setup && !utility?.burstOpportunity && utility?.battle ? <ArenaVisualBattleState battle={utility.battle} /> : null}
      {!decision && !ultimateTrigger && actions.length ? (
        <section className="arena-visual-center-prompt" aria-live="polite">
          <span className="arena-visual-center-prompt-label">
            {utility?.battle?.flashPriorityPlayerId ? "Flash Timing" : utility?.battle ? "Battle Action" : "Action Required"}
          </span>
          <div className="arena-visual-center-action-buttons">
            {actions.map((action) => (
              <button
                key={action.id || action.label}
                type="button"
                className={`${action.emphasis ? "is-primary" : ""}${action.tone === "quiet" ? " is-quiet" : ""}${["BEGIN_MAGIC_COST","USE_HIGH_SPEED","ACTIVATE_FIELD_FLASH"].includes(action.type) && utility?.battle?.flashPriorityPlayerId ? " is-use-flash" : ""}${action.type === "PASS_FLASH" ? " is-pass-flash" : ""}${action.type === "DECLINE_BLOCK" ? " is-decline-block" : ""}`.trim()}
                disabled={action.disabled === true}
                onClick={() => onActionRequest?.(action)}
              >
                {action.label || action.id}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
