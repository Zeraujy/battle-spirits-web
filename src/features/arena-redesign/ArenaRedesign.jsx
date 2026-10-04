import ArenaRedesignShell from "./components/ArenaRedesignShell.jsx";
import ArenaRedesignSurface from "./components/ArenaRedesignSurface.jsx";
import ArenaSideLayout from "./components/layout/ArenaSideLayout.jsx";
import BattleFocus from "./components/battle/BattleFocus.jsx";
import TargetingLayer from "./components/battle/TargetingLayer.jsx";
import ArenaUtilityPanel from "./components/utility/ArenaUtilityPanel.jsx";
import ArenaEffectResolutionLayer from "./components/effects/ArenaEffectResolutionLayer.jsx";
import { resolveArenaPlaymat } from "./playmats/playmatResolver.js";

/**
 * Parallel Arena presentation root.
 *
 * The redesign remains isolated from the production Simulator route. The
 * optional interaction bridge accepts callbacks owned by the current Arena
 * controller; it never dispatches rules-engine actions by itself.
 */
export default function ArenaRedesign({
  viewModel,
  playmatId,
  interactions = null,
  opponent,
  center,
  player,
  utility,
  utilityData = null,
  effectData = null
}) {
  const playmat = resolveArenaPlaymat(playmatId);
  const resolvedInteraction = {
    ...(viewModel?.interactionHints || {}),
    ...(interactions || {})
  };

  const centerContent = center ?? (
    <>
      <BattleFocus viewModel={viewModel} />
      <TargetingLayer interaction={resolvedInteraction} />
    </>
  );

  const opponentContent = opponent ?? (
    <ArenaSideLayout
      side="opponent"
      player={viewModel?.opponent}
      battle={viewModel?.battle}
      interaction={resolvedInteraction}
    />
  );

  const playerContent = player ?? (
    <ArenaSideLayout
      side="player"
      player={viewModel?.player}
      battle={viewModel?.battle}
      interaction={resolvedInteraction}
    />
  );

  const utilityContent = utility ?? (
    <ArenaUtilityPanel
      viewModel={viewModel}
      presentationData={utilityData}
      onActionRequest={resolvedInteraction?.onUtilityActionRequest}
    />
  );

  return (
    <ArenaRedesignShell playmat={playmat}>
      <ArenaRedesignSurface
        opponent={opponentContent}
        center={centerContent}
        player={playerContent}
        utility={utilityContent}
      />

      <ArenaEffectResolutionLayer
        viewModel={viewModel}
        presentationData={effectData}
        onActionRequest={resolvedInteraction?.onEffectActionRequest}
      />

      <output
        className="arena-redesign-state"
        hidden
        data-match-id={viewModel?.match?.id || ""}
        data-viewer-player-id={viewModel?.viewer?.playerId || ""}
        data-phase={viewModel?.timing?.phase || ""}
      />
    </ArenaRedesignShell>
  );
}
