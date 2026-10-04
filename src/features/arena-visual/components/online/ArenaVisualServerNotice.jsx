export default function ArenaVisualServerNotice({ online }) {
  const message = online?.error || online?.notice;
  if (!message) return null;
  return (
    <div className={`arena-visual-server-notice${online.error ? " is-error" : ""}`} role={online.error ? "alert" : "status"}>
      <span>{online.error ? "Server Error" : "Server Notice"}</span>
      <strong>{message}</strong>
    </div>
  );
}
