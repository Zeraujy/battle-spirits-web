export default function ContextPanel({
  open = true,
  mode = "card",
  theme = "neutral",
  eyebrow = "",
  emptyText = "",
  hasContent = false,
  className = "",
  children
}) {
  return (
    <aside
      className={`context-panel inspector panel arena-side-dock card-theme-${theme} ${
        open ? "dock-open" : "dock-closed"
      } ${hasContent ? "context-has-content" : "context-empty"} ${className}`.trim()}
      data-context-mode={mode}
      data-context-open={open ? "true" : "false"}
    >
      <div className="context-panel-scroll inspector-scroll">
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        {!hasContent ? <p className="muted context-panel-empty">{emptyText}</p> : null}
        {children}
      </div>
    </aside>
  );
}
