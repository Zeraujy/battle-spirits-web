import ArenaVisualTargetDecision from "./ArenaVisualTargetDecision.jsx";

export default function ArenaVisualCardSelectionDecision(props) {
  return (
    <div className={`arena-visual-card-selection-decision is-${props.decision.kind}`}>
      <ArenaVisualTargetDecision {...props} />
    </div>
  );
}
