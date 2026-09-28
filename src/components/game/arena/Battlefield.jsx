import "../../../styles/arena/battlefieldV490.css";

/**
 * Presentation-only spatial container for the Arena battlefield.
 * It intentionally preserves the legacy `table-area` class and accepts
 * existing data attributes/styles without reading or mutating game state.
 */
export default function Battlefield({ children, className = "", ...props }) {
  const rootClassName = ["table-area", "arena-battlefield", className]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={rootClassName} data-arena-component="Battlefield" {...props}>
      {children}
    </section>
  );
}
