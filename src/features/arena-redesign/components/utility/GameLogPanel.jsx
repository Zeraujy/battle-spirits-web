export default function GameLogPanel({ entries = [] }) {
  return (
    <section className="arena-redesign-utility-section arena-redesign-game-log" aria-label="Game log">
      <header className="arena-redesign-utility-title">Game Log</header>
      {entries.length ? (
        <ol className="arena-redesign-utility-feed">
          {entries.map((entry) => (
            <li key={entry.id}>
              <span>{entry.text}</span>
              {entry.meta ? <small>{entry.meta}</small> : null}
            </li>
          ))}
        </ol>
      ) : (
        <div className="arena-redesign-utility-empty">No log entries</div>
      )}
    </section>
  );
}
