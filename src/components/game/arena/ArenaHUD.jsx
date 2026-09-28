import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../../../i18n.jsx";
import "../../../styles/arena/arenaHudV490.css";

function ArenaHUD({ player, active, actor, opponent = false, dataLifeTarget, role }) {
  const { t } = useLanguage();
  const reserveCount = Number(player?.reserve || 0) + (player?.soulCore?.zone === "reserve" ? 1 : 0);
  const coreTrashCount = Number(player?.trashCores || 0) + (player?.soulCore?.zone === "trash" ? 1 : 0);
  const lifeCount = Number(player?.life || 0);
  const deckCount = Number(player?.deck?.length || 0);
  const handCount = Number(player?.hand?.length || 0);
  const playerColor = player?.playerColor || (opponent ? "#929292" : "#d8d8d8");
  const [resourcePulse, setResourcePulse] = useState(null);
  const previousResources = useRef({ life: lifeCount, reserve: reserveCount, trash: coreTrashCount });

  useEffect(() => {
    const nextResources = { life: lifeCount, reserve: reserveCount, trash: coreTrashCount };
    const previous = previousResources.current;
    let changedResource = null;

    if (previous.life !== nextResources.life) changedResource = "life";
    else if (previous.reserve !== nextResources.reserve) changedResource = "reserve";
    else if (previous.trash !== nextResources.trash) changedResource = "trash";

    previousResources.current = nextResources;
    if (!changedResource) return undefined;

    setResourcePulse(changedResource);
    const timer = window.setTimeout(() => setResourcePulse(null), 650);
    return () => window.clearTimeout(timer);
  }, [lifeCount, reserveCount, coreTrashCount]);

  return (
    <div
      className={`player-hud arena-compact-hud arena-${role}-hud ${active ? "active" : ""} ${actor ? "actor" : ""}`}
      style={{ "--player-color": playerColor }}
      data-arena-component={opponent ? "OpponentHUD" : "PlayerHUD"}
    >
      <div className="arena-hud-identity">
        <div className="avatar-wrap">
          {player?.avatar ? (
            <img src={player.avatar} alt="Avatar" />
          ) : (
            <span>{(player?.name || "J").slice(0, 1).toUpperCase()}</span>
          )}
        </div>

        <div className="player-hud-main">
          <strong>{player?.name}</strong>
          <small>
            {opponent ? t("opponent") : t("player")}
            {active ? ` • ${t("currentTurn")}` : ""}
          </small>
        </div>
      </div>

      <div className="arena-hud-counters">
        <div
          className={`life-core-display life-drop-target arena-hud-life ${resourcePulse === "life" ? "resource-pulse" : ""}`}
          data-life-target={dataLifeTarget || undefined}
          title="Life"
        >
          <div className="life-core-row">
            {Array.from({ length: Math.min(lifeCount, 10) }, (_, index) => (
              <span className="life-core" key={index} />
            ))}
          </div>
          <b>{lifeCount}</b>
          <span>LIFE</span>
        </div>

        <div className="arena-hud-stat arena-hud-deck" title="Deck">
          <b>{deckCount}</b>
          <span>Deck</span>
        </div>

        <div className={`arena-hud-stat arena-hud-reserve ${resourcePulse === "reserve" ? "resource-pulse" : ""}`} title="Reserve">
          <b>{reserveCount}</b>
          <span>Reserve</span>
        </div>

        <div className={`arena-hud-stat arena-hud-core-trash ${resourcePulse === "trash" ? "resource-pulse" : ""}`} title="Core Trash">
          <b>{coreTrashCount}</b>
          <span>Core Trash</span>
        </div>

        <div className="arena-hud-secondary" aria-label="Secondary match counters">
          <span>Hand <b>{handCount}</b></span>
          <span className={player?.burst ? "is-set" : ""}>Burst {player?.burst ? "●" : "○"}</span>
        </div>
      </div>
    </div>
  );
}

export function PlayerHUD(props) {
  return <ArenaHUD {...props} role="player" opponent={false} />;
}

export function OpponentHUD(props) {
  return <ArenaHUD {...props} role="opponent" opponent />;
}
