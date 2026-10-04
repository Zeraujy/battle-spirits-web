export default function ArenaVisualReconnectOverlay({ online }) {
  if (!online?.enabled) return null;

  if (online.viewerNeedsReconnect) {
    return (
      <div className="arena-visual-reconnect-overlay" role="alert">
        <section>
          <span>Connection</span>
          <strong>{online.viewerConnectionState === "reconnecting" ? "Reconnecting…" : "Connection lost"}</strong>
          <p>The match state remains server-authoritative while the client attempts to resume the session.</p>
          {Number.isFinite(online.viewerReconnectRemainingSeconds) ? <b>{online.viewerReconnectRemainingSeconds}s</b> : null}
        </section>
      </div>
    );
  }

  if (online.opponentNeedsReconnect) {
    return (
      <div className="arena-visual-opponent-reconnect" role="status">
        <i />
        <span>
          <strong>Opponent reconnecting</strong>
          <small>{Number.isFinite(online.opponentReconnectRemainingSeconds) ? `${online.opponentReconnectRemainingSeconds}s remaining` : "Waiting for the opponent to return"}</small>
        </span>
      </div>
    );
  }

  return null;
}
