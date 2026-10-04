import { resolveArenaVisualPlaymat } from "../playmats/arenaVisualPlaymatRegistry.js";
import useArenaVisualResponsiveProfile from "../hooks/useArenaVisualResponsiveProfile.js";

export default function ArenaVisualShell({ playmatId, children }) {
  const playmat = resolveArenaVisualPlaymat(playmatId);
  const responsiveProfile = useArenaVisualResponsiveProfile();

  return (
    <main
      className="arena-visual-root"
      style={{ "--arena-visual-playmat-image": `url("${playmat.image}")` }}
      data-playmat-id={playmat.id}
      data-responsive-profile={responsiveProfile.id}
    >
      <div className="arena-visual-playmat" aria-hidden="true" />
      <div className="arena-visual-vignette" aria-hidden="true" />
      <div className="arena-visual-content">{children}</div>
    </main>
  );
}
