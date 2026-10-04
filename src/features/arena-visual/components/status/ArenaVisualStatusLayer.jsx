import ArenaVisualAuthorityStatus from "./ArenaVisualAuthorityStatus.jsx";
import ArenaVisualConnectionStatus from "../online/ArenaVisualConnectionStatus.jsx";
import ArenaVisualReconnectOverlay from "../online/ArenaVisualReconnectOverlay.jsx";
import ArenaVisualServerNotice from "../online/ArenaVisualServerNotice.jsx";
import ArenaVisualTurnClock from "../online/ArenaVisualTurnClock.jsx";

export default function ArenaVisualStatusLayer({ authority, online }) {
  return (
    <>
      <div className="arena-visual-status-strip">
        <ArenaVisualConnectionStatus online={online} />
        <ArenaVisualTurnClock online={online} />
        <ArenaVisualAuthorityStatus authority={authority} />
      </div>
      <ArenaVisualServerNotice online={online} />
      <ArenaVisualReconnectOverlay online={online} />
    </>
  );
}
