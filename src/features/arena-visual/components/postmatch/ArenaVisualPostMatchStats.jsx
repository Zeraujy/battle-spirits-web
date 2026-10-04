import { formatMatchDuration } from "../../../../services/player/postMatchService.js";

export default function ArenaVisualPostMatchStats({ result = {} }) {
  const summary = result.summary || {};
  return (
    <section className="arena-visual-postmatch-stats" aria-label="Post match statistics">
      <article><span>Result</span><strong>{result.reasonTitle || "Match Complete"}</strong><small>{result.reasonText || ""}</small></article>
      <article><span>Final Turn</span><strong>{result.turnNumber || "-"}</strong><small>{summary.turns || result.turnNumber || 1} turns</small></article>
      <article><span>Duration</span><strong>{formatMatchDuration(summary.durationSeconds || 0, result.language || "en")}</strong></article>
      <article><span>Life Remaining</span><strong>{summary.lifeRemaining ?? "—"}</strong></article>
      <article className="is-deck"><span>Deck</span><strong>{summary.deck?.name || "Match Snapshot"}</strong><small>{summary.deck?.cardIds?.length ? `${summary.deck.cardIds.length} cards` : "No deck snapshot available"}</small></article>
    </section>
  );
}
