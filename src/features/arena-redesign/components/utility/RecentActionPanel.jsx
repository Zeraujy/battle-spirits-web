export default function RecentActionPanel({ entries = [] }) {
  return (
    <section className="arena-redesign-utility-section" aria-label="Recent actions">
      <header className="arena-redesign-utility-title">Recent Action</header>
      {entries.length ? (
        <ul className="arena-redesign-utility-feed arena-redesign-recent-action-feed">
          {entries.map((entry) => (
            <li key={entry.id}>
              <span>{entry.text}</span>
              {entry.meta ? <small>{entry.meta}</small> : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="arena-redesign-utility-empty">No recent action</div>
      )}
    </section>
  );
}
