export default function ArenaVisualPostMatchProgression({ result = {} }) {
  const summary = result.summary || {};
  const mastery = summary.mastery || {};
  const ranked = summary.ranked || null;

  if (!mastery.trackedCards && !ranked && !result.featuredMasteryImage) return null;

  return (
    <section className="arena-visual-postmatch-progression" aria-label="Post match progression">
      <header><span>Progression</span><strong>Match Rewards</strong></header>
      <div>
        <article className="is-mastery">
          {result.featuredMasteryImage ? <img src={result.featuredMasteryImage} alt={result.featuredMasteryName || ""} /> : null}
          <span>
            <small>Card Mastery</small>
            <strong>+{mastery.totalXp || 0} XP</strong>
            <em>{mastery.trackedCards || 0} cards progressed{result.featuredMasteryName ? ` • ${result.featuredMasteryName}` : ""}</em>
          </span>
        </article>
        {ranked ? (
          <article className={`is-ranked ${Number(ranked.rpDelta || 0) >= 0 ? "is-positive" : "is-negative"}`}>
            <span><small>Ranked</small><strong>{Number(ranked.rpDelta || 0) >= 0 ? "+" : ""}{ranked.rpDelta || 0} RP</strong><em>{ranked.rpBefore || 0} → {ranked.rpAfter || 0} RP{ranked.rank ? ` • ${ranked.rank}` : ""}</em></span>
          </article>
        ) : null}
      </div>
    </section>
  );
}
