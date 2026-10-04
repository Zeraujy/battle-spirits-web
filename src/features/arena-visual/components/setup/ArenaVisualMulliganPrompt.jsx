export default function ArenaVisualMulliganPrompt({ setup, onActionRequest }) {
  if (!setup?.openingSetup) return null;

  return (
    <section className="arena-visual-mulligan-prompt" aria-live="polite">
      <header>
        <span>Opening Setup</span>
        <strong>{setup.firstPlayerName ? `${setup.firstPlayerName} goes first` : "Match opening"}</strong>
      </header>
      <div className="arena-visual-mulligan-summary">
        <article><span>Hand</span><strong>{setup.handCount}</strong></article>
        <article><span>Life</span><strong>{setup.life}</strong></article>
        <article><span>Reserve</span><strong>{setup.reserve}</strong></article>
        <article><span>Soul Core</span><strong>{setup.soulCoreZone === "reserve" ? "Reserve" : setup.soulCoreZone || "—"}</strong></article>
      </div>
      <p>{setup.mulliganAvailable
        ? "You may redraw your opening hand once before advancing the Start Step."
        : setup.mulliganUsed
          ? "Mulligan already used. Continue with this opening hand."
          : "Mulligan is unavailable for this match."}</p>
      {setup.mulliganAvailable ? (
        <button type="button" onClick={() => onActionRequest?.({ id: "mulligan", type: "MULLIGAN" })}>
          Mulligan
        </button>
      ) : null}
    </section>
  );
}
