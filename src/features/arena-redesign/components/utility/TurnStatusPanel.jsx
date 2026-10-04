export default function TurnStatusPanel({ turn }) {
  if (!turn) return null;

  return (
    <section className="arena-redesign-utility-section arena-redesign-turn-status" aria-label="Turn status">
      <div className="arena-redesign-utility-heading">
        <span>Turn</span>
        <strong>{turn.number}</strong>
      </div>
      <div className="arena-redesign-turn-phase">{turn.phaseLabel}</div>
      <div className="arena-redesign-turn-owner">
        {turn.viewerIsActivePlayer ? "YOUR TURN" : (turn.activePlayerName ? `${turn.activePlayerName}'s turn` : "Opponent turn")}
      </div>
      {turn.turnClock ? (
        <time className="arena-redesign-turn-clock">{String(turn.turnClock)}</time>
      ) : null}
    </section>
  );
}
