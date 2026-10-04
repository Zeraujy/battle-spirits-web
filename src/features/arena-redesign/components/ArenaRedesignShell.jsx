import useArenaResponsiveProfile from "../hooks/useArenaResponsiveProfile.js";
import "../styles/arena-redesign.css";

/**
 * Full-screen presentation boundary for the parallel Arena redesign.
 *
 * This component intentionally receives already-prepared presentation data.
 * It must never import the game engine, online transport, or server modules.
 */
export default function ArenaRedesignShell({
  playmat,
  children,
  className = ""
}) {
  const responsiveProfile = useArenaResponsiveProfile();
  const rootClassName = [
    "arena-redesign-shell",
    className
  ].filter(Boolean).join(" ");

  const style = playmat?.assetUrl
    ? { "--arena-redesign-playmat-image": `url("${playmat.assetUrl}")` }
    : undefined;

  return (
    <main
      className={rootClassName}
      style={style}
      data-arena-redesign="true"
      data-arena-redesign-foundation="15"
      data-arena-viewport={responsiveProfile.viewport}
      data-arena-input={responsiveProfile.input}
      data-playmat-id={playmat?.id || "default"}
    >
      <div className="arena-redesign-playmat" aria-hidden="true" />

      <div className="arena-redesign-content">
        {children}
      </div>
    </main>
  );
}
