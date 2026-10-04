export default function PhaseTracker({ phases = [] }) {
  return (
    <section className="arena-redesign-utility-section" aria-label="Phase tracker">
      <header className="arena-redesign-utility-title">Phase Tracker</header>
      <ol className="arena-redesign-phase-tracker">
        {phases.map((phase) => (
          <li
            key={phase.id}
            className={`is-${phase.state}`}
            aria-current={phase.state === "current" ? "step" : undefined}
          >
            <span className="arena-redesign-phase-dot" aria-hidden="true" />
            <span>{phase.label}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
