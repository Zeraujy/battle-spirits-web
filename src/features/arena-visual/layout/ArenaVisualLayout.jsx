import { useState } from "react";
import ArenaVisualPlayerSide from "../components/layout/ArenaVisualPlayerSide.jsx";
import ArenaVisualUtilityPanel from "../components/layout/ArenaVisualUtilityPanel.jsx";
import ArenaVisualPhaseBar from "../components/layout/ArenaVisualPhaseBar.jsx";
import ArenaVisualActionCenter from "../components/layout/ArenaVisualActionCenter.jsx";
import { createArenaVisualMockupStyle } from "../models/arenaVisualMockupMetrics.js";

export default function ArenaVisualLayout({ model, selectedCard, onSelectCard, onUtilityActionRequest, interaction, hoverCardHandlers }) {
  const [utilityCollapsed, setUtilityCollapsed] = useState(false);

  return (
    <div
      className={`arena-visual-layout${utilityCollapsed ? " is-utility-collapsed" : ""}`}
      style={createArenaVisualMockupStyle()}
    >
      <div className="arena-visual-board">
        <ArenaVisualPlayerSide side="opponent" data={model.opponent} onSelectCard={onSelectCard} interaction={interaction} hoverCardHandlers={hoverCardHandlers} />
        <ArenaVisualPhaseBar utility={model.utility} onAdvanceRequest={onUtilityActionRequest} />
        <ArenaVisualActionCenter utility={model.utility} onActionRequest={onUtilityActionRequest} />
        <ArenaVisualPlayerSide
          side="player"
          data={model.player}
          onSelectCard={onSelectCard}
          interaction={interaction}
          pendingAction={model.utility?.pendingAction}
          onUtilityActionRequest={onUtilityActionRequest}
          hoverCardHandlers={hoverCardHandlers}
        />
      </div>
      <ArenaVisualUtilityPanel
        selectedCard={selectedCard}
        utility={model.utility}
        onActionRequest={onUtilityActionRequest}
        collapsed={utilityCollapsed}
        onToggleCollapsed={() => setUtilityCollapsed((value) => !value)}
      />
    </div>
  );
}
