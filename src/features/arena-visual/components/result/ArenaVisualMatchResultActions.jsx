export default function ArenaVisualMatchResultActions({
  result = {},
  onRequestRematch,
  onPlayAgain,
  onAddOpponent,
  onOpenProfile,
  onExit
}) {
  return (
    <footer className="arena-visual-result-actions">
      <div>
        {result.mode === "online" ? (
          <button type="button" onClick={onRequestRematch} disabled={result.rematchPending}>
            {result.rematchPending ? "Waiting…" : "Request Rematch"}
          </button>
        ) : (
          <button type="button" onClick={onPlayAgain}>
            {result.mode === "ranked" ? "Return to Ranked Queue" : "Play Again"}
          </button>
        )}
        {result.opponentUsername && ["online", "ranked"].includes(result.mode) ? (
          <>
            <button type="button" onClick={onAddOpponent}>Add Opponent</button>
            <button type="button" onClick={() => onOpenProfile?.(result.opponentUsername)}>Open Profile</button>
          </>
        ) : null}
      </div>
      <button type="button" className="is-primary" onClick={onExit}>Main Menu <b aria-hidden="true">→</b></button>
    </footer>
  );
}
