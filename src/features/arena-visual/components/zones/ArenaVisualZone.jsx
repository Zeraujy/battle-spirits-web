export default function ArenaVisualZone({
  name,
  count,
  className = "",
  children,
  compact = false,
  hidden = false,
  ...props
}) {
  if (hidden) return null;

  return (
    <section
      {...props}
      className={`arena-visual-zone${compact ? " is-compact" : ""}${className ? ` ${className}` : ""}`}
      aria-label={name}
      data-zone={name.toLowerCase().replaceAll(" ", "-")}
    >
      <header className="arena-visual-zone-label">
        <span>{name}</span>
        {Number.isFinite(count) ? <strong>{count}</strong> : null}
      </header>
      <div className="arena-visual-zone-content">{children}</div>
    </section>
  );
}
