/**
 * Small, visual-only battle state label used by the desktop arena.
 *
 * The Rules Engine remains the source of truth for attackers / blockers.
 * This component only translates an already-known battle state into a
 * compact badge so players can read combat at a glance.
 */
export default function ArenaBattleRole({ role, language = "ptBR" }) {
  if (!role) return null;

  const labels = {
    attacker: language === "en" ? "ATTACKER" : "ATACANTE",
    blocker: language === "en" ? "BLOCKER" : "BLOQUEADOR"
  };

  const label = labels[role];
  if (!label) return null;

  return (
    <span className={`arena-battle-role ${role}`} aria-hidden="true">
      {label}
    </span>
  );
}
