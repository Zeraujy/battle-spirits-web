import { useRef } from "react";
import useArenaLayout from "./useArenaLayout.js";
import "../../../styles/arena/arenaShell.css";

/**
 * Presentation root for the Arena UX/UI overhaul.
 *
 * Contract:
 * - Own layout boundaries only.
 * - Do not read or mutate game state.
 * - Do not dispatch game actions.
 * - Do not communicate with online services.
 * - Responsive mode is DOM-only so resizing does not re-render gameplay.
 */
export default function ArenaShell({ children, className = "", viewModel = null }) {
  const rootRef = useRef(null);
  useArenaLayout(rootRef);

  const rootClassName = ["simulator-page", "arena-shell", className]
    .filter(Boolean)
    .join(" ");

  return (
    <main
      ref={rootRef}
      className={rootClassName}
      data-arena-shell="v4.9.1"
      data-arena-foundation="01"
      data-arena-phase="21"
      data-arena-layout-mode="standard"
      data-arena-view-model={viewModel?.version ? `v${viewModel.version}` : undefined}
      data-arena-active-player={viewModel?.timing?.activePlayerId || undefined}
      data-arena-priority-player={viewModel?.timing?.priorityPlayerId || undefined}
    >
      {children}
    </main>
  );
}
