import { useRef } from "react";
import { playHandCardIntent } from "../../interactions/arenaIntentFactory.js";
import { startArenaPointerCardDrag } from "../../interactions/arenaPointerCardDrag.js";

export default function ArenaVisualHandCard({ side, card, layout, onSelectCard, interaction, hoverCardHandlers }) {
  const isOpponent = side === "opponent";
  const image = isOpponent ? "/images/card-back.webp" : (card?.image || "/images/card-back.webp");
  const suppressClickRef = useRef(false);
  const cleanupPointerDragRef = useRef(null);
  const style = {
    "--arena-visual-card-offset": layout.offset,
    "--arena-visual-card-rotation": `${layout.rotation}deg`,
    "--arena-visual-card-lift": `${layout.lift}px`,
    zIndex: layout.zIndex
  };
  const selectable = !isOpponent && Boolean(card);
  const interactivePlay = selectable && Boolean(interaction?.enabled && card?.instanceId);
  const playabilityRelevant = selectable && Boolean(card?.playabilityRelevant);
  const isPlayable = card?.playable == null ? !playabilityRelevant : card.playable === true;

  function beginPointerDrag(event) {
    if (!interactivePlay || !isPlayable) return;
    hoverCardHandlers?.end?.();
    cleanupPointerDragRef.current?.();
    cleanupPointerDragRef.current = startArenaPointerCardDrag({
      event,
      imageSrc: image,
      payload: {
        instanceId: card.instanceId,
        sourceZone: "hand",
        cardType: card.cardType || card.type || null
      },
      onDrop(payload) {
        interaction.requestIntent?.(playHandCardIntent(payload.instanceId, { input: event.pointerType || "pointer" }));
      },
      onDragStateChange(active) {
        if (active) suppressClickRef.current = true;
        else window.setTimeout(() => { suppressClickRef.current = false; }, 0);
      }
    });
  }

  return (
    <button
      type="button"
      className={`arena-visual-hand-card is-${side}${selectable ? " is-selectable" : ""}${interactivePlay && isPlayable ? " is-playable-source" : ""}${playabilityRelevant && isPlayable ? " is-main-playable" : ""}${playabilityRelevant && !isPlayable ? " is-main-unavailable" : ""}`}
      style={style}
      aria-hidden={isOpponent ? "true" : undefined}
      tabIndex={selectable ? 0 : -1}
      draggable={false}
      data-motion-card-instance={card?.instanceId || undefined}
      onPointerDown={interactivePlay && isPlayable ? beginPointerDrag : undefined}
      onMouseEnter={!isOpponent && card ? (event) => hoverCardHandlers?.begin?.(card, event) : undefined}
      onMouseMove={!isOpponent && card ? (event) => hoverCardHandlers?.move?.(event) : undefined}
      onMouseLeave={!isOpponent && card ? () => hoverCardHandlers?.end?.() : undefined}
      onClick={selectable ? (event) => {
        if (suppressClickRef.current) {
          event.preventDefault();
          return;
        }
        onSelectCard?.({ ...card, sourceZone: "Hand", owner: side });
      } : undefined}
      onDoubleClick={interactivePlay && isPlayable ? (event) => {
        event.preventDefault();
        interaction.requestIntent?.(playHandCardIntent(card.instanceId, { input: "mouse" }));
      } : undefined}
    >
      <img src={image} alt={isOpponent ? "" : (card?.name || "Hand card")} draggable="false" />
    </button>
  );
}
