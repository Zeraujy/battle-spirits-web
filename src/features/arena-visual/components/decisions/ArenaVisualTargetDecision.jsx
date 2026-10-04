export default function ArenaVisualTargetDecision({
  decision,
  selectedIds,
  selectedBP,
  toggleCandidate,
  resolve
}) {
  const minimum = Math.max(0, Number(decision.minimum || 0));
  const maximum = Math.max(minimum, Number(decision.maximum || 1));
  const ready = selectedIds.length >= minimum
    && selectedIds.length <= maximum
    && (decision.maxTotalBP == null || selectedBP <= Number(decision.maxTotalBP));

  return (
    <>
      <div className="arena-visual-center-candidates">
        {(decision.candidates || []).map((candidate) => {
          const id = candidate.instanceId || candidate.id;
          const selected = selectedIds.includes(id);
          return (
            <button key={candidate.id || id} type="button" className={selected ? "is-selected" : ""} onClick={() => toggleCandidate(candidate)}>
              {candidate.image ? <img src={candidate.image} alt="" draggable="false" /> : null}
              <span>
                <strong>{candidate.name || candidate.label || "Choice"}</strong>
                <small>{candidate.cardId || candidate.zone || ""}</small>
              </span>
            </button>
          );
        })}
      </div>
      <footer className="arena-visual-center-decision-footer">
        <span>{selectedIds.length}/{maximum}{decision.maxTotalBP != null ? ` • ${selectedBP}/${decision.maxTotalBP} BP` : ""}</span>
        <div>
          {minimum === 0 || decision.allowZero ? <button type="button" className="is-quiet" onClick={() => resolve({ selectedInstanceIds: [] })}>Choose None</button> : null}
          <button type="button" disabled={!ready} onClick={() => resolve({ selectedInstanceIds: selectedIds })}>Confirm</button>
        </div>
      </footer>
    </>
  );
}
