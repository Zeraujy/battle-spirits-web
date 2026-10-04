import { useEffect, useState } from "react";
import ArenaVisualCardSelectionDecision from "./ArenaVisualCardSelectionDecision.jsx";
import ArenaVisualCoreDistributionDecision from "./ArenaVisualCoreDistributionDecision.jsx";
import ArenaVisualOptionDecision from "./ArenaVisualOptionDecision.jsx";
import ArenaVisualOrderDecision from "./ArenaVisualOrderDecision.jsx";
import ArenaVisualTargetDecision from "./ArenaVisualTargetDecision.jsx";

const CARD_SELECTION_KINDS = new Set([
  "selectTrashTarget",
  "chooseCardsFromHand",
  "chooseCardsFromTrash",
  "chooseCardsFromDeck"
]);

export default function ArenaVisualDecisionHost({ decision, onActionRequest }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [order, setOrder] = useState([]);
  const [distribution, setDistribution] = useState({});

  useEffect(() => {
    setSelectedIds([]);
    setOrder((decision?.candidates || []).map((candidate) => candidate.triggerId || candidate.instanceId || candidate.id).filter(Boolean));
    setDistribution({});
  }, [decision?.id]);

  if (!decision) return null;

  function resolve(payload) {
    onActionRequest?.({
      id: "resolve-effect-decision",
      type: "RESOLVE_EFFECT_DECISION",
      decisionId: decision.id,
      payload: { decisionId: decision.id, ...payload }
    });
  }

  const maximum = Math.max(Number(decision.minimum || 0), Number(decision.maximum || 1));
  function toggleCandidate(candidate) {
    const id = candidate.instanceId || candidate.id;
    if (!id) return;
    const immediate = !["selectMultipleTargets", ...CARD_SELECTION_KINDS].includes(decision.kind) && maximum <= 1;
    if (immediate) {
      resolve({ selectedInstanceIds: [id] });
      return;
    }
    setSelectedIds((current) => current.includes(id)
      ? current.filter((value) => value !== id)
      : (current.length >= maximum ? current : [...current, id]));
  }

  function moveOrder(id, delta) {
    setOrder((current) => {
      const index = current.indexOf(id);
      const nextIndex = index + delta;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  const assigned = Object.values(distribution).reduce((sum, value) => sum + Math.max(0, Number(value || 0)), 0);
  const required = Math.max(0, Number(decision.totalCores || 0));
  function changeDistribution(id, delta) {
    setDistribution((current) => {
      const currentValue = Math.max(0, Number(current[id] || 0));
      if (delta > 0 && assigned >= required) return current;
      const nextValue = Math.max(0, currentValue + delta);
      const next = { ...current, [id]: nextValue };
      if (!nextValue) delete next[id];
      return next;
    });
  }

  const selectedBP = selectedIds.reduce((total, id) => {
    const candidate = (decision.candidates || []).find((item) => (item.instanceId || item.id) === id);
    return total + Number(candidate?.bp || 0);
  }, 0);

  let body = null;
  if (["chooseOption", "chooseYesNo"].includes(decision.kind)) {
    body = <ArenaVisualOptionDecision decision={decision} resolve={resolve} />;
  } else if (["chooseOrder", "chooseTriggerOrder"].includes(decision.kind)) {
    body = <ArenaVisualOrderDecision decision={decision} order={order} moveOrder={moveOrder} resolve={resolve} />;
  } else if (decision.kind === "chooseCoreDistribution") {
    body = <ArenaVisualCoreDistributionDecision decision={decision} distribution={distribution} assigned={assigned} changeDistribution={changeDistribution} resolve={resolve} />;
  } else if (CARD_SELECTION_KINDS.has(decision.kind)) {
    body = <ArenaVisualCardSelectionDecision decision={decision} selectedIds={selectedIds} selectedBP={selectedBP} toggleCandidate={toggleCandidate} resolve={resolve} />;
  } else {
    body = <ArenaVisualTargetDecision decision={decision} selectedIds={selectedIds} selectedBP={selectedBP} toggleCandidate={toggleCandidate} resolve={resolve} />;
  }

  return (
    <section className={`arena-visual-center-decision is-${decision.kind}`} aria-live="polite">
      <header>
        <span>Effect Resolution</span>
        <strong>{decision.title || "Effect Resolution"}</strong>
        {decision.waiting ? <small>Waiting for the other player</small> : null}
      </header>
      {decision.instruction ? <p>{decision.instruction}</p> : null}
      {!decision.waiting ? body : <div className="arena-visual-decision-waiting">The decision belongs to the other player.</div>}
    </section>
  );
}
