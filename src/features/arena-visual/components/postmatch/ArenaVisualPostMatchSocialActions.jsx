export default function ArenaVisualPostMatchSocialActions({
  result = {},
  onRequestRematch,
  onPlayAgain,
  onAddOpponent,
  onOpenProfile,
  onExit
}) {
  const online = ["online", "ranked"].includes(result.mode);
  return (
    <footer className="arena-visual-postmatch-social-actions">
      <div className="arena-visual-postmatch-primary-actions">
        {result.mode === "online" ? (
          <button type="button" onClick={onRequestRematch} disabled={result.rematchPending}>
            {result.rematchPending ? "Waiting for Opponent…" : "Request Rematch"}
          </button>
        ) : (
          <button type="button" onClick={onPlayAgain}>
            {result.mode === "ranked" ? "Return to Ranked Queue" : "Play Again"}
          </button>
        )}
        <button type="button" className="is-primary" onClick={onExit}>Main Menu <b aria-hidden="true">→</b></button>
      </div>

      {online ? (
        <div className="arena-visual-postmatch-social-row">
          <span>Opponent</span>
          <strong>{result.opponentUsername ? `@${result.opponentUsername}` : "No public username"}</strong>
          <div>
            <button type="button" disabled={!result.opponentUsername} onClick={onAddOpponent}>Add Opponent</button>
            <button type="button" disabled={!result.opponentUsername} onClick={() => onOpenProfile?.(result.opponentUsername)}>Open Profile</button>
          </div>
        </div>
      ) : null}
    </footer>
  );
}
