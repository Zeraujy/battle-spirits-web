export default function EmptyState({ title, children }) {
  return <div className="empty-state"><strong>{title}</strong><p>{children}</p></div>;
}
