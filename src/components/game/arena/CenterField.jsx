export default function CenterField({ children, className = "", ...props }) {
  const rootClassName = ["table-middle", "arena-center-field", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClassName} data-arena-component="CenterField" {...props}>
      {children}
    </div>
  );
}
