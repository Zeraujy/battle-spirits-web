export default function BattleStatus({ battle }) {
  if (!battle?.active) return null;

  const detail = battle.viewerHasPriority
    ? "Your priority"
    : battle.viewerIsDefender && battle.stage === "block"
      ? "Choose a blocker or continue unblocked"
      : battle.directAttack
        ? "Direct attack"
        : "Attacker and blocker locked";

  return (
    <div className="arena-redesign-battle-status" role="status" aria-live="polite">
      <strong>{battle.stageLabel}</strong>
      <span>{detail}</span>
    </div>
  );
}
