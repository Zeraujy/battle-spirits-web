import { formatMatchDuration } from "../../../../services/player/postMatchService.js";

export default function ArenaVisualMatchResultSummary({ result = {} }) {
  const summary = result.summary || {};
  return (
    <div className="arena-visual-result-summary">
      <article><span>Result</span><strong>{result.reasonTitle || "Match Complete"}</strong><small>{result.reasonText || ""}</small></article>
      <article><span>Final Turn</span><strong>{result.turnNumber || "-"}</strong></article>
      <article><span>Duration</span><strong>{formatMatchDuration(summary.durationSeconds || 0, result.language || "en")}</strong><small>{summary.turns || result.turnNumber || 1} turns</small></article>
      <article><span>Life Remaining</span><strong>{summary.lifeRemaining ?? "—"}</strong></article>
      <article><span>Card Mastery</span><strong>+{summary.mastery?.totalXp || 0} XP</strong><small>{summary.mastery?.trackedCards || 0} cards progressed</small></article>
      {summary.ranked ? <article><span>Ranked</span><strong>{summary.ranked.rpDelta >= 0 ? "+" : ""}{summary.ranked.rpDelta} RP</strong><small>{summary.ranked.rpBefore} → {summary.ranked.rpAfter} RP</small></article> : null}
    </div>
  );
}
