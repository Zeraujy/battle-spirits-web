import ArenaVisualBattlefield from "../zones/ArenaVisualBattlefield.jsx";
import ArenaVisualHandZone from "../zones/ArenaVisualHandZone.jsx";
import ArenaVisualSideZones from "../zones/ArenaVisualSideZones.jsx";
import ArenaVisualMirageZone from "../zones/ArenaVisualMirageZone.jsx";

export default function ArenaVisualPlayerSide({ side, data, onSelectCard, interaction, pendingAction = null, onUtilityActionRequest, hoverCardHandlers }) {
  const sideInteraction = side === "player" ? interaction : { ...interaction, enabled: false };
  return (
    <section className={`arena-visual-player-side is-${side}`} data-side={side}>
      <ArenaVisualSideZones side={side} data={data} position="left" interaction={sideInteraction} />
      <div className="arena-visual-main-field">
        {side === "opponent" ? <ArenaVisualHandZone side={side} hand={data.hand} onSelectCard={onSelectCard} interaction={sideInteraction} hoverCardHandlers={hoverCardHandlers} /> : null}
        <ArenaVisualBattlefield side={side} battlefield={data.battlefield} onSelectCard={onSelectCard} interaction={sideInteraction} pendingAction={pendingAction} onUtilityActionRequest={onUtilityActionRequest} hoverCardHandlers={hoverCardHandlers} />
        <ArenaVisualMirageZone side={side} mirage={data.mirage} onSelectCard={onSelectCard} hoverCardHandlers={hoverCardHandlers} />
        {side === "player" ? <ArenaVisualHandZone side={side} hand={data.hand} onSelectCard={onSelectCard} interaction={sideInteraction} hoverCardHandlers={hoverCardHandlers} /> : null}
      </div>
      <ArenaVisualSideZones side={side} data={data} position="right" interaction={sideInteraction} />
    </section>
  );
}
