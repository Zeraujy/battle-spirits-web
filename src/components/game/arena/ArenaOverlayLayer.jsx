import "../../../styles/arena/arenaOverlayV490.css";

/**
 * Shared non-blocking overlay root for Arena presentation layers.
 *
 * Contract:
 * - The root never captures pointer input.
 * - Individual interactive children must opt in with
 *   `.arena-overlay-interactive`.
 * - Presentation only; no game-state authority lives here.
 */
export default function ArenaOverlayLayer({ children, className = "" }) {
  return (
    <div
      className={["arena-overlay-layer", className].filter(Boolean).join(" ")}
      data-arena-overlay-layer="true"
    >
      {children}
    </div>
  );
}
