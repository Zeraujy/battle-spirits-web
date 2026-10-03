import BattlefieldZone from "../zones/BattlefieldZone.jsx";
import BurstZone from "../zones/BurstZone.jsx";
import DeckZone from "../zones/DeckZone.jsx";
import HandZone from "../zones/HandZone.jsx";
import LifeZone from "../zones/LifeZone.jsx";
import ReserveZone from "../zones/ReserveZone.jsx";
import TrashCoreZone from "../zones/TrashCoreZone.jsx";
import TrashZone from "../zones/TrashZone.jsx";
import VoidZone from "../zones/VoidZone.jsx";

function soulCoreIsIn(player, zone) {
  return player?.resources?.soulCore?.zone === zone;
}

export default function ArenaSideLayout({
  side = "player",
  player,
  battle = null,
  interaction = null,
  showVoid = true
}) {
  const zones = player?.zones || {};
  const counts = player?.counts || {};
  const resources = player?.resources || {};
  const isOpponent = side === "opponent";
  const playerInteraction = isOpponent
    ? null
    : { ...interaction, playerId: interaction?.playerId || player?.id || null };
  const fieldInteraction = isOpponent
    ? {
        playerId: interaction?.playerId || null,
        targeting: interaction?.targeting || null,
        targetingActive: interaction?.targetingActive || false,
        targetableInstanceIds: interaction?.targetableInstanceIds || [],
        targetableFieldInstanceIds: interaction?.targetableFieldInstanceIds || [],
        selectedTargetInstanceIds: interaction?.selectedTargetInstanceIds || [],
        disabledFieldInstanceIds: interaction?.disabledFieldInstanceIds || [],
        actionTypesByInstanceId: interaction?.actionTypesByInstanceId || {},
        actionLabelsByInstanceId: interaction?.actionLabelsByInstanceId || {},
        onTargetCardClick: interaction?.onTargetCardClick || null
      }
    : playerInteraction;

  return (
    <div
      className={`arena-redesign-player-side is-${side}`}
      data-arena-side-layout={side}
    >
      <div className="arena-redesign-side-rail arena-redesign-side-rail-primary">
        <LifeZone
          side={side}
          playerId={player?.id || null}
          life={resources.life || 0}
          soulCore={soulCoreIsIn(player, "life")}
        />
        <BurstZone side={side} card={zones.burst} />
        <ReserveZone
          side={side}
          playerId={player?.id || null}
          reserve={resources.reserve || 0}
          soulCore={soulCoreIsIn(player, "reserve")}
          interaction={playerInteraction}
        />
      </div>

      <div className="arena-redesign-side-main">
        {isOpponent ? <HandZone side={side} cards={zones.hand} count={counts.hand} /> : null}
        <BattlefieldZone
          side={side}
          field={zones.field}
          battle={battle}
          interaction={fieldInteraction}
        />
        {!isOpponent ? <HandZone side={side} cards={zones.hand} count={counts.hand} interaction={playerInteraction} /> : null}
      </div>

      <div className="arena-redesign-side-rail arena-redesign-side-rail-secondary">
        <DeckZone side={side} count={counts.deck || 0} />
        <TrashZone side={side} cards={zones.trash} count={counts.trash || 0} />
        <TrashCoreZone
          side={side}
          playerId={player?.id || null}
          trashCores={resources.trashCores || 0}
          soulCore={soulCoreIsIn(player, "trash")}
          interaction={playerInteraction}
        />
        {showVoid ? <VoidZone side={side} /> : null}
      </div>
    </div>
  );
}
