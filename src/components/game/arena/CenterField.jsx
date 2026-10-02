export default function CenterField({ children, className = "" }) {
  const rootClassName = ["table-middle", "arena-center-field", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClassName} data-arena-component="CenterField">
      {children}
    </div>
  );
}
