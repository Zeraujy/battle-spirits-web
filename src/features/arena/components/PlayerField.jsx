export default function PlayerField({ children, className = "" }) {
  const rootClassName = ["arena-field-section", "arena-player-field", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClassName} data-arena-component="PlayerField">
      {children}
    </div>
  );
}
