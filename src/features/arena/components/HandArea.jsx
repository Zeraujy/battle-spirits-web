import "../../../styles/arena/handAreaV490.css";

export default function HandArea({ owner = "player", children, className = "", ...props }) {
  return (
    <section
      {...props}
      className={`arena-hand-area arena-${owner}-hand-area ${className}`.trim()}
      data-arena-component="HandArea"
      data-hand-owner={owner}
    >
      <div className="arena-hand-surface" data-arena-component="HandFan">
        {children}
      </div>
    </section>
  );
}
