export default function ArenaVisualAuthorityStatus({ authority }) {
  if (!authority || authority.hidden) return null;
  return (
    <div className={`arena-visual-authority-status is-${authority.state || "waiting"}${authority.blocking ? " is-blocking" : ""}`} role="status">
      <i aria-hidden="true" />
      <span>
        <strong>{authority.title}</strong>
        {authority.detail ? <small>{authority.detail}</small> : null}
      </span>
    </div>
  );
}
