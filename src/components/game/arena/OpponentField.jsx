export default function OpponentField({ children, className = "", ...props }) {
  const rootClassName = ["arena-field-section", "arena-opponent-field", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClassName} data-arena-component="OpponentField" {...props}>
      {children}
    </div>
  );
}
