import { useLanguage } from "../i18n.jsx";

export default function PlayerHud({ player, active, actor, opponent = false, dataLifeTarget }) {
  const { t } = useLanguage();
  const reserveTotal = Number(player.reserve || 0) + (player.soulCore?.zone === "reserve" ? 1 : 0);
  const coreTrashTotal = Number(player.trashCores || 0) + (player.soulCore?.zone === "trash" ? 1 : 0);
  const playerColor = player.playerColor || (opponent ? "#ee6c78" : "#68a8ff");
  return (
    <div className={`player-hud ${active ? "active" : ""} ${actor ? "actor" : ""}`} style={{ "--player-color":playerColor }}>
      <div className="avatar-wrap">{player.avatar ? <img src={player.avatar} alt="Avatar" /> : <span>{(player.name || "J").slice(0, 1).toUpperCase()}</span>}</div>
      <div className="player-hud-main"><strong>{player.name}</strong><small>{opponent ? t("opponent") : t("player")}{active ? ` • ${t("currentTurn")}` : ""}</small></div>
      <div className="life-core-display life-drop-target" data-life-target={dataLifeTarget || undefined} title="Life">
        <div className="life-core-row">{Array.from({length:Math.min(Number(player.life || 0), 10)},(_,i)=><span className="life-core" key={i}/>)}</div><b>{player.life}</b><span>LIFE</span>
      </div>
      <div className="hud-resources">
        <div className="hud-stat"><b>{player.deck.length}</b><span>Deck</span></div><div className="hud-stat"><b>{player.hand.length}</b><span>Hand</span></div><div className="hud-stat"><b>{reserveTotal}</b><span>Reserve</span></div><div className="hud-stat"><b>{coreTrashTotal}</b><span>Core Trash</span></div><div className="set-zone-indicators"><span>Burst {player.burst ? "●" : "○"}</span><span>Mirage {player.mirage ? "●" : "○"}</span></div>
      </div>
    </div>
  );
}
