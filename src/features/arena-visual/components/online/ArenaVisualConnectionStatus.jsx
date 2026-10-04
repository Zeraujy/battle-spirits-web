export default function ArenaVisualConnectionStatus({ online }) {
  if (!online?.enabled) return null;
  return (
    <div className={`arena-visual-connection-status is-${online.viewerConnectionState || "connected"}`}>
      <i />
      <span>{online.viewerConnectionLabel || "Connected"}</span>
      {online.serverAuthoritative ? <b>Server</b> : null}
    </div>
  );
}
