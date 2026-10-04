function clockClass(seconds) {
  if (!Number.isFinite(seconds)) return "";
  if (seconds <= 15) return " is-danger";
  if (seconds <= 30) return " is-warning";
  return "";
}

export default function ArenaVisualTurnClock({ online }) {
  if (!online?.enabled || !Number.isFinite(online.turnRemainingSeconds)) return null;
  return (
    <div className={`arena-visual-turn-clock${clockClass(online.turnRemainingSeconds)}`}>
      <span>Turn Clock</span>
      <strong>{online.turnRemainingSeconds}s</strong>
    </div>
  );
}
