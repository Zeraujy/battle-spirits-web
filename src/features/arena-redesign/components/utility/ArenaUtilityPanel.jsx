import { createUtilityPanelPresentation } from "../../models/utilityPanelPresentation.js";
import ArenaChatPanel from "./ArenaChatPanel.jsx";
import GameLogPanel from "./GameLogPanel.jsx";
import PhaseTracker from "./PhaseTracker.jsx";
import PrimaryActionPanel from "./PrimaryActionPanel.jsx";
import RecentActionPanel from "./RecentActionPanel.jsx";
import TurnStatusPanel from "./TurnStatusPanel.jsx";

export default function ArenaUtilityPanel({
  viewModel,
  presentationData,
  onActionRequest
}) {
  const model = createUtilityPanelPresentation(viewModel, presentationData);

  return (
    <div className="arena-redesign-utility-panel">
      <TurnStatusPanel turn={model.turn} />
      <PhaseTracker phases={model.phases} />
      <PrimaryActionPanel actions={model.primaryActions} onActionRequest={onActionRequest} />
      <RecentActionPanel entries={model.recentActions} />
      <GameLogPanel entries={model.gameLog} />
      <ArenaChatPanel messages={model.chatMessages} enabled={model.chatEnabled} />
    </div>
  );
}
