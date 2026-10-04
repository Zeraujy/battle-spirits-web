import ArenaVisualBattlefieldCard from "../battlefield/ArenaVisualBattlefieldCard.jsx";
import { playHandCardIntent } from "../../interactions/arenaIntentFactory.js";
import { readArenaVisualCardDrag } from "../../interactions/arenaCardDrag.js";
import { groupArenaVisualBattlefieldCards } from "../../models/battlefieldLayout.js";

function BattlefieldLane({ lane, side, cards, onSelectCard, interaction, pendingAction, onUtilityActionRequest, hoverCardHandlers }) {
  return (
    <div className={`arena-visual-field-lane is-${lane}`} data-field-lane={lane} data-motion-zone={`field:${side === "player" ? interaction?.playerId : interaction?.opponentPlayerId}:${lane === "left" ? "other" : lane === "right" ? "nexuses" : "spirits"}`}>
      {cards.map((card, index) => (
        <ArenaVisualBattlefieldCard
          key={card?.id || `${side}-${lane}-${index}`}
          side={side}
          card={card}
          onSelectCard={onSelectCard}
          interaction={interaction}
          pendingAction={pendingAction?.instanceId === card?.instanceId ? pendingAction : null}
          onUtilityActionRequest={onUtilityActionRequest}
          hoverCardHandlers={hoverCardHandlers}
        />
      ))}
    </div>
  );
}

export default function ArenaVisualBattlefield({ side, battlefield = {}, onSelectCard, interaction, pendingAction = null, onUtilityActionRequest, hoverCardHandlers }) {
  const cards = Array.isArray(battlefield.cards) ? battlefield.cards : [];
  const count = Number.isFinite(battlefield.count) ? battlefield.count : cards.length;
  const canReceiveHandCard = side === "player" && Boolean(interaction?.enabled);

  const { left: leftCards, center: centerCards, right: rightCards } = groupArenaVisualBattlefieldCards(cards);

  return (
    <section
      className={`arena-visual-battlefield is-${side}${canReceiveHandCard ? " is-hand-drop-target" : ""}`}
      aria-label={`${side} battlefield`}
      data-zone="battlefield"
      onDragOver={canReceiveHandCard ? (event) => {
        const payload = readArenaVisualCardDrag(event);
        if (!payload || payload.sourceZone !== "hand") return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      } : undefined}
      onDrop={canReceiveHandCard ? (event) => {
        const payload = readArenaVisualCardDrag(event);
        if (!payload || payload.sourceZone !== "hand") return;
        event.preventDefault();
        interaction.requestIntent?.(playHandCardIntent(payload.instanceId, { input: "pointer" }));
      } : undefined}
    >
      {cards.length > 0 ? (
        <div className={`arena-visual-field-row is-${side} is-zoned-layout`}>
          <BattlefieldLane
            lane="left"
            side={side}
            cards={leftCards}
            onSelectCard={onSelectCard}
            interaction={interaction}
            pendingAction={pendingAction}
            onUtilityActionRequest={onUtilityActionRequest}
            hoverCardHandlers={hoverCardHandlers}
          />
          <BattlefieldLane
            lane="center"
            side={side}
            cards={centerCards}
            onSelectCard={onSelectCard}
            interaction={interaction}
            pendingAction={pendingAction}
            onUtilityActionRequest={onUtilityActionRequest}
            hoverCardHandlers={hoverCardHandlers}
          />
          <BattlefieldLane
            lane="right"
            side={side}
            cards={rightCards}
            onSelectCard={onSelectCard}
            interaction={interaction}
            pendingAction={pendingAction}
            onUtilityActionRequest={onUtilityActionRequest}
            hoverCardHandlers={hoverCardHandlers}
          />
        </div>
      ) : (
        <span className="arena-visual-battlefield-caption">{count > 0 ? `${count} card${count === 1 ? "" : "s"}` : "Battlefield"}</span>
      )}
    </section>
  );
}
