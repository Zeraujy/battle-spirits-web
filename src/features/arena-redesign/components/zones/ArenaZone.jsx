export default function ArenaZone({
  zone,
  label,
  count,
  side = "player",
  compact = false,
  children,
  className = ""
}) {
  const hasCount = Number.isFinite(Number(count));

  return (
    <section
      className={[
        "arena-redesign-zone",
        `arena-redesign-zone-${zone}`,
        `is-${side}`,
        compact ? "is-compact" : "",
        className
      ].filter(Boolean).join(" ")}
      data-arena-zone={zone}
      data-arena-side={side}
    >
      <header className="arena-redesign-zone-label">
        <span>{label}</span>
        {hasCount ? <strong>{Number(count)}</strong> : null}
      </header>

      <div className="arena-redesign-zone-body">
        {children}
      </div>
    </section>
  );
}
