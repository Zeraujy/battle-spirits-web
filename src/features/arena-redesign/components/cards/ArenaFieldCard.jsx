import { getCardArtworkUrl, getCardById } from "../../../../services/cards/cardRepository.js";
import CorePool from "../resources/CorePool.jsx";
import { readCoreDragPayload } from "../../interactions/coreInteraction.js";
import {
  getFieldCardBp,
  getFieldCardLevel,
  getFieldCardRole
} from "./fieldCardPresentation.js";
import {
  getFieldCardInteractionState,
  getInteractionFeedbackLabel
} from "./cardInteractionPresentation.js";
import TargetMarker from "../battle/TargetMarker.jsx";

function cardName(card, fallback) {
  return card?.namePT || card?.nameEN || card?.name || fallback || "Card";
}

export default function ArenaFieldCard({
  physical,
  side = "player",
  density = "large",
  battle = null,
  interaction = null
}) {
  const card = getCardById(physical?.cardId);
  const imageUrl = getCardArtworkUrl(card || physical?.cardId);
  const level = getFieldCardLevel(card, physical);
  const bp = getFieldCardBp(card, physical);
  const battleRole = getFieldCardRole(physical?.instanceId, battle);
  const interactionState = getFieldCardInteractionState(physical?.instanceId, interaction);
  const selected = interaction?.selectedFieldInstanceId === physical?.instanceId;
  const canControlCores = side === "player" && Boolean(interaction?.canMoveCores);
  const title = cardName(card, physical?.cardId);
  const feedbackLabel = getInteractionFeedbackLabel(interactionState);

  function handleCardClick(event) {
    event.stopPropagation();
    const payload = {
      side,
      instanceId: physical?.instanceId || null,
      cardId: physical?.cardId || null,
      physical
    };

    if (interactionState.targetingActive) {
      if (!interactionState.targetable && !interactionState.selectedTarget) return;
      interaction?.onTargetCardClick?.(payload);
      return;
    }

    if (interactionState.unavailable) return;
    interaction?.onFieldCardClick?.(payload);
  }

  function handleDragOver(event) {
    if (!canControlCores) return;
    if (event.dataTransfer?.types?.includes("application/x-bs-core")) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    }
  }

  function handleDrop(event) {
    if (!canControlCores || !physical?.instanceId) return;
    event.preventDefault();
    event.stopPropagation();
    const payload = readCoreDragPayload(event);
    if (!payload) return;
    interaction?.onCoreMove?.(payload, {
      zone: "card",
      instanceId: physical.instanceId
    });
  }

  const classes = [
    "arena-redesign-field-card",
    `is-${density}`,
    `is-${side}`,
    physical?.exhausted ? "is-exhausted" : "",
    physical?.pendingDestruction ? "is-pending-destruction" : "",
    physical?.combinedWith ? "is-combined" : "",
    battleRole ? `is-${battleRole}` : "",
    selected ? "is-selected" : "",
    interactionState.actionable ? "is-actionable" : "",
    interactionState.targetable ? "is-targetable" : "",
    interactionState.selectedTarget ? "is-target-selected" : "",
    interactionState.unavailable ? "is-unavailable" : ""
  ].filter(Boolean).join(" ");

  return (
    <article
      className={classes}
      data-card-instance-id={physical?.instanceId || undefined}
      data-card-id={physical?.cardId || undefined}
      data-battle-role={battleRole || undefined}
      data-card-actionable={interactionState.actionable ? "true" : "false"}
      data-card-targetable={interactionState.targetable ? "true" : "false"}
      data-card-target-selected={interactionState.selectedTarget ? "true" : "false"}
      data-card-unavailable={interactionState.unavailable ? "true" : "false"}
    >
      <button
        type="button"
        className="arena-redesign-field-card-art-frame"
        title={feedbackLabel ? `${title} — ${feedbackLabel}` : title}
        onClick={handleCardClick}
        aria-disabled={interactionState.unavailable || undefined}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <img
          className="arena-redesign-field-card-art"
          src={imageUrl}
          alt={title}
          draggable="false"
          decoding="async"
          loading="eager"
        />
      </button>

      <div className="arena-redesign-field-card-status" aria-label={`${title} status`}>
        <span className="arena-redesign-field-card-level">
          {level ? `Lv${level.level}` : "—"}
        </span>
        <strong className="arena-redesign-field-card-bp">
          {bp == null ? "— BP" : `${bp} BP`}
        </strong>
        {battleRole ? (
          <span className="arena-redesign-field-card-role">{battleRole}</span>
        ) : null}
      </div>

      {feedbackLabel ? (
        <div className="arena-redesign-field-card-feedback" aria-hidden="true">
          {feedbackLabel}
        </div>
      ) : null}

      {(interactionState.targetable || interactionState.selectedTarget) ? (
        <TargetMarker selected={interactionState.selectedTarget} />
      ) : null}

      <div className="arena-redesign-field-card-cores">
        <CorePool
          regularCount={physical?.cores?.regular || 0}
          soulCore={Boolean(physical?.cores?.soul)}
          compact={density !== "large"}
          maxVisible={8}
          label={`${title} Cores`}
          playerId={interaction?.playerId || null}
          zone="card"
          instanceId={physical?.instanceId || null}
          interactive={canControlCores}
          selectedCore={interaction?.selectedCore || null}
          payingCoreKeys={interaction?.payingCoreKeys || null}
          onCoreClick={interaction?.onCoreClick}
          onCoreDragStart={interaction?.onCoreDragStart}
        />
      </div>

      {physical?.combinedWith ? (
        <span className="arena-redesign-field-card-combined">Brave</span>
      ) : null}
    </article>
  );
}
