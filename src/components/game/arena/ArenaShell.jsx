import "../../../styles/arena/arenaShell.css";

/**
 * ArenaShell is the presentation root for the Arena UX/UI overhaul.
 *
 * Phase 1 contract:
 * - Own layout boundaries only.
 * - Do not read or mutate game state.
 * - Do not dispatch game actions.
 * - Do not communicate with online services.
 * - Preserve the legacy `simulator-page` class so the current Arena can run
 *   unchanged while later phases migrate presentation concerns incrementally.
 */
export default function ArenaShell({ children, className = "" }) {
  const rootClassName = ["simulator-page", "arena-shell", className]
    .filter(Boolean)
    .join(" ");

  return (
    <main
      className={rootClassName}
      data-arena-shell="v4.9.0"
      data-arena-foundation="01"
      data-arena-phase="03"
    >
      {children}
    </main>
  );
}
