import { Children } from "react";

export default function ActionBar({
  actions = null,
  visible = true,
  context = "none",
  className = ""
}) {
  const count = Children.count(actions);

  if (!visible || count === 0) return null;

  return (
    <div
      className={`arena-action-bar ${className}`.trim()}
      data-action-context={context}
      data-action-count={count}
      aria-label="Context actions"
    >
      <div className="arena-action-bar-inner inspector-actions">
        {actions}
      </div>
    </div>
  );
}
