export default function ArenaVisualCoreDistributionDecision({
  decision,
  distribution,
  assigned,
  changeDistribution,
  resolve
}) {
  const required = Math.max(0, Number(decision.totalCores || 0));
  const ready = decision.exactTotal !== false ? assigned === required : assigned <= required;
  return (
    <div className="arena-visual-center-core-distribution">
      {(decision.candidates || []).map((candidate) => {
        const id = candidate.instanceId || candidate.id;
        const amount = Number(distribution[id] || 0);
        return (
          <div key={id}>
            <span><strong>{candidate.name || candidate.cardId}</strong><small>{candidate.cardId || ""}</small></span>
            <button type="button" disabled={amount <= 0} onClick={() => changeDistribution(id, -1)}>−</button>
            <b>{amount}</b>
            <button type="button" disabled={assigned >= required} onClick={() => changeDistribution(id, 1)}>+</button>
          </div>
        );
      })}
      <footer className="arena-visual-center-decision-footer">
        <span>{assigned}/{required} Cores • Source: {decision.sourceCoreZone || "reserve"}</span>
        <button type="button" disabled={!ready} onClick={() => resolve({ coreDistribution: distribution })}>Confirm Cores</button>
      </footer>
    </div>
  );
}
