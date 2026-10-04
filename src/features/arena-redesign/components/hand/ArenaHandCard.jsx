import { useRef } from "react";
import { getCardArtworkUrl, getCardById } from "../../../../services/cards/cardRepository.js";
import {
  createHandCardInteractionPayload,
  writeHandCardDragPayload,
  getTouchHandDropTarget
} from "../../interactions/handInteraction.js";
import { getHandCardInteractionState } from "../cards/cardInteractionPresentation.js";

function getCardName(card, fallback) {
  return card?.namePT || card?.nameEN || card?.name || fallback || "Card";
}

export default function ArenaHandCard({
  physical,
  side = "player",
  style,
  density = "comfortable",
  interaction = null
}) {
  const touchDragRef = useRef(null);
  const suppressClickRef = useRef(false);
  const hidden = Boolean(physical?.hidden || side === "opponent");
  const card = hidden ? null : getCardById(physical?.cardId);
  const title = hidden ? "Hidden card" : getCardName(card, physical?.cardId);
  const artwork = hidden ? "/images/card-back.webp" : getCardArtworkUrl(card || physical?.cardId);
  const cardInteractionState = getHandCardInteractionState(physical?.instanceId, interaction);
  const selected = !hidden && cardInteractionState.selected;
  const playable = !hidden && cardInteractionState.playable;
  const unavailable = !hidden && cardInteractionState.unavailable;
  const targetable = !hidden && cardInteractionState.targetable;
  const selectedTarget = !hidden && cardInteractionState.selectedTarget;
  const draggable = side === "player" && !hidden && playable && !cardInteractionState.targetingActive && Boolean(interaction?.canDragHandCards);

  const payload = createHandCardInteractionPayload({
    playerId: interaction?.playerId || null,
    instanceId: physical?.instanceId || null,
    cardId: physical?.cardId || null,
    cardType: physical?.cardType || card?.cardType || null
  });

  function handleClick(event) {
    event.stopPropagation();
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (hidden) return;
    const selectionPayload = { ...payload, physical, card, side, zone: "hand" };
    if (cardInteractionState.targetingActive) {
      if (!targetable && !selectedTarget) return;
      interaction?.onTargetCardClick?.(selectionPayload);
      return;
    }
    interaction?.onHandCardClick?.(selectionPayload);
  }

  function clearTouchDropHighlight() {
    const previous = touchDragRef.current?.dropTarget || null;
    previous?.classList?.remove("is-hand-drop-active");
  }

  function handlePointerDown(event) {
    if (!draggable) return;
    interaction?.onHandCardPointerDown?.(event, { ...payload, physical, card, artwork });

    if (event.pointerType === "touch" || event.pointerType === "pen") {
      event.currentTarget?.setPointerCapture?.(event.pointerId);
      touchDragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        dragging: false,
        dropTarget: null
      };
    }
  }

  function handlePointerMove(event) {
    const state = touchDragRef.current;
    if (!state || state.pointerId !== event.pointerId) return;

    const distance = Math.hypot(event.clientX - state.startX, event.clientY - state.startY);
    if (distance < 8 && !state.dragging) return;
    state.dragging = true;

    const nextTarget = getTouchHandDropTarget(document, event.clientX, event.clientY);
    if (state.dropTarget !== nextTarget) {
      state.dropTarget?.classList?.remove("is-hand-drop-active");
      nextTarget?.classList?.add("is-hand-drop-active");
      state.dropTarget = nextTarget;
    }

    interaction?.onHandCardPointerMove?.(event, { ...payload, physical, card, artwork });
  }

  function handlePointerUp(event) {
    const state = touchDragRef.current;
    if (!state || state.pointerId !== event.pointerId) return;

    if (state.dragging) suppressClickRef.current = true;

    if (state.dragging && state.dropTarget) {
      interaction?.onHandCardDrop?.(payload, {
        zone: "field",
        side: state.dropTarget.dataset?.handDropSide || "player",
        input: "touch"
      });
    }

    clearTouchDropHighlight();
    touchDragRef.current = null;
    interaction?.onHandCardPointerUp?.(event, { ...payload, physical, card, artwork });
  }

  function handlePointerCancel(event) {
    clearTouchDropHighlight();
    touchDragRef.current = null;
    interaction?.onHandCardPointerCancel?.(event, { ...payload, physical, card, artwork });
  }

  function handleDragStart(event) {
    if (!draggable || !payload.instanceId) {
      event.preventDefault();
      return;
    }
    writeHandCardDragPayload(event, payload);
    interaction?.onHandCardDragStart?.({ ...payload, physical, card, artwork });
  }

  function handleDragEnd(event) {
    if (!draggable) return;
    interaction?.onHandCardDragEnd?.({ ...payload, physical, card, dropEffect: event.dataTransfer?.dropEffect || "none" });
  }

  const className = [
    "arena-redesign-hand-card",
    `is-${side}`,
    `is-${density}`,
    hidden ? "is-hidden" : "is-visible",
    selected ? "is-selected" : "",
    playable ? "is-playable" : "is-unplayable",
    unavailable ? "is-unavailable" : "",
    targetable ? "is-targetable" : "",
    selectedTarget ? "is-target-selected" : "",
    cardInteractionState.primaryActionType ? `has-action-${cardInteractionState.primaryActionType.toLowerCase().replaceAll("_", "-")}` : "",
    draggable ? "is-draggable" : ""
  ].filter(Boolean).join(" ");

  return (
    <button
      type="button"
      className={className}
      style={{
        left: `${style.leftPercent}%`,
        "--hand-card-rotation": `${style.rotationDeg}deg`,
        "--hand-card-lift": `${style.liftPx}px`,
        zIndex: style.zIndex
      }}
      title={title}
      data-hand-card-instance={hidden ? undefined : physical?.instanceId || undefined}
      data-hand-card-hidden={hidden ? "true" : "false"}
      data-hand-card-playable={playable ? "true" : "false"}
      data-hand-card-unavailable={unavailable ? "true" : "false"}
      data-hand-card-action={cardInteractionState.primaryActionType || undefined}
      data-hand-card-targetable={targetable ? "true" : "false"}
      data-hand-card-target-selected={selectedTarget ? "true" : "false"}
      aria-label={cardInteractionState.primaryActionLabel ? `${title} — ${cardInteractionState.primaryActionLabel}` : title}
      draggable={draggable}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      aria-pressed={selected || undefined}
    >
      <img src={artwork} alt={hidden ? "" : title} draggable="false" decoding="async" />
    </button>
  );
}
