import { memo, useEffect, useRef, useState } from "react";
import { useLanguage } from "../../../localization/i18n.jsx";
import "../../../styles/arena/arenaHudV490.css";

function ArenaHUDComponent({ player, active, actor, opponent = false, dataLifeTarget, role }) {
  const { t } = useLanguage();
  const reserveCount = Number(player?.reserve || 0) + (player?.soulCore?.zone === "reserve" ? 1 : 0);
  const coreTrashCount = Number(player?.trashCores || 0) + (player?.soulCore?.zone === "trash" ? 1 : 0);
  const lifeCount = Number(player?.life || 0);
  const deckCount = Number(player?.deck?.length || 0);
  const handCount = Number(player?.hand?.length || 0);
  const playerColor = player?.playerColor || (opponent ? "#929292" : "#d8d8d8");
  const [resourcePulse, setResourcePulse] = useState(null);
  const previousResources = useRef({ reserve: reserveCount, trash: coreTrashCount });

  // Life intentionally does not participate in resourcePulse. The Life box is
  // geometry-stable and receives no class/state transition when damage occurs.
  useEffect(() => {
    const nextResources = { reserve: reserveCount, trash: coreTrashCount };
    const previous = previousResources.current;
    let changedResource = null;

    if (previous.reserve !== nextResources.reserve) changedResource = "reserve";
    else if (previous.trash !== nextResources.trash) changedResource = "trash";

    previousResources.current = nextResources;
    if (!changedResource) return undefined;

    setResourcePulse(changedResource);
    const timer = window.setTimeout(() => setResourcePulse(null), 650);
    return () => window.clearTimeout(timer);
  }, [reserveCount, coreTrashCount]);

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
          className="arena-hud-life"
          data-life-target={dataLifeTarget || undefined}
          title="Life"
          data-life-count={lifeCount}
        >
          <div className="arena-life-slots" aria-hidden="true">
            {Array.from({ length: 10 }, (_, index) => (
              <span
                className={`arena-life-core ${index < Math.min(lifeCount, 10) ? "is-active" : "is-empty"}`}
                key={index}
              />
            ))}
          </div>
          <b className="arena-life-value">{lifeCount}</b>
          <span className="arena-life-label">LIFE</span>
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

const ArenaHUD = memo(ArenaHUDComponent);

export function PlayerHUD(props) {
  return <ArenaHUD {...props} role="player" opponent={false} />;
}

export function OpponentHUD(props) {
  return <ArenaHUD {...props} role="opponent" opponent />;
}
