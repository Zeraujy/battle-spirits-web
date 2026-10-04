export default function ArenaVisualFlashWindow({ battle }) {
  if (!battle || !["flash1", "flash2"].includes(battle.stage)) return null;
  return (
    <div className={`arena-visual-flash-window is-${battle.stage}`}>
      <span>{battle.stage === "flash1" ? "First Flash Timing" : "Second Flash Timing"}</span>
      <strong>{battle.viewerHasFlashPriority ? "Your Flash priority" : battle.priorityPlayerName || "Opponent priority"}</strong>
      <small>Magic, High Speed and Field Flash actions are shown when legally available.</small>
    </div>
  );
}
