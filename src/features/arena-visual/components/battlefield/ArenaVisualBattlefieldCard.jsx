import ArenaVisualCardCoreOverlay from "./ArenaVisualCardCoreOverlay.jsx";
import ArenaVisualBraveAttachment from "./ArenaVisualBraveAttachment.jsx";
import ArenaVisualSummonPaymentPanel from "./ArenaVisualSummonPaymentPanel.jsx";
import { moveCoreIntent } from "../../interactions/arenaIntentFactory.js";
import { readArenaVisualCoreDrag } from "../../interactions/coreInteraction.js";
import { startArenaCombatPointerDrag } from "../../interactions/arenaCombatPointerDrag.js";

function LevelBadge({ level }) {
  const numericLevel = Number(level);
  if (!Number.isFinite(numericLevel) || numericLevel < 1 || numericLevel > 5) return null;
  return (
    <img
      className="arena-visual-level-badge"
      src={`/images/ui/arena/levels/lv${numericLevel}.webp`}
      alt={`Level ${numericLevel}`}
      draggable="false"
    />
  );
}

export default function ArenaVisualBattlefieldCard({ side, card, onSelectCard, interaction, pendingAction = null, onUtilityActionRequest, hoverCardHandlers }) {
  const image = side === "opponent" && card?.hidden ? "/images/card-back.webp" : (card?.image || "/images/card-back.webp");
  const canOwnCore = side === "player" && interaction?.canMoveCores && card?.instanceId;
  const canCombatDrag = side === "player" && Boolean(interaction?.enabled && (card?.canAttack || card?.canBlock));
  const source = canOwnCore
    ? { zone: "card", instanceId: card.instanceId, playerId: interaction.playerId }
    : null;

  return (
    <article
      className={`arena-visual-field-card is-${side}${card?.exhausted ? " is-exhausted" : ""}${card ? " is-selectable" : ""}${canOwnCore ? " is-core-target" : ""}${card?.battleRole ? ` is-${card.battleRole}` : ""}${canCombatDrag ? " is-combat-draggable" : ""}`}
      data-field-card-instance={card?.instanceId || undefined}
      data-motion-card-instance={card?.instanceId || undefined}
      onPointerDown={canCombatDrag ? (event) => startArenaCombatPointerDrag({ event, card, interaction }) : undefined}
      onMouseEnter={card && !card.hidden ? (event) => hoverCardHandlers?.begin?.(card, event) : undefined}
      onMouseMove={card && !card.hidden ? (event) => hoverCardHandlers?.move?.(event) : undefined}
      onMouseLeave={card && !card.hidden ? () => hoverCardHandlers?.end?.() : undefined}
      onClick={() => card && onSelectCard?.({ ...card, sourceZone: "Battlefield", owner: side })}
      role={card ? "button" : undefined}
      tabIndex={card ? 0 : -1}
      onKeyDown={(event) => {
        if (card && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onSelectCard?.({ ...card, sourceZone: "Battlefield", owner: side });
        }
      }}
      onDragOver={canOwnCore ? (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      } : undefined}
      onDrop={canOwnCore ? (event) => {
        event.preventDefault();
        event.stopPropagation();
        const dragged = readArenaVisualCoreDrag(event);
        if (!dragged) return;
        interaction.requestIntent?.(moveCoreIntent(
          dragged,
          { zone: "card", instanceId: card.instanceId },
          { input: "pointer" }
        ));
      } : undefined}
    >
      {card?.attachedBrave ? <ArenaVisualBraveAttachment brave={card.attachedBrave} /> : null}
      <div className="arena-visual-field-card-art">
        <img src={image} alt={card?.hidden ? "Hidden card" : (card?.name || "Battlefield card")} draggable="false" />
        <ArenaVisualCardCoreOverlay
          coreCount={card?.coreCount}
          soulCoreCount={card?.soulCoreCount}
          interaction={canOwnCore ? interaction : null}
          source={source}
        />
      </div>
      {pendingAction ? (
        <ArenaVisualSummonPaymentPanel pending={pendingAction} onActionRequest={onUtilityActionRequest} />
      ) : null}
      {(card?.level || card?.bp) ? (
        <div className="arena-visual-field-card-meta">
          {card.level ? <LevelBadge level={card.level} /> : null}
          {card.bp ? <strong>{card.bp} BP</strong> : null}
        </div>
      ) : null}
    </article>
  );
}
