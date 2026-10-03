import { useState } from "react";
import { isHandCardDrag, readHandCardDragPayload } from "../../interactions/handInteraction.js";
import ArenaZone from "./ArenaZone.jsx";
import ArenaFieldCard from "../cards/ArenaFieldCard.jsx";
import { getFieldCardDensity } from "../cards/fieldCardPresentation.js";

function flattenField(field) {
  if (!field || typeof field !== "object") return [];

  return [
    ...(Array.isArray(field.spirits) ? field.spirits : []),
    ...(Array.isArray(field.nexuses) ? field.nexuses : []),
    ...(Array.isArray(field.other) ? field.other : [])
  ];
}

export default function BattlefieldZone({
  side,
  field,
  battle = null,
  interaction = null
}) {
  const cards = flattenField(field);
  const density = getFieldCardDensity(cards.length);
  const [handDropActive, setHandDropActive] = useState(false);
  const acceptsHandCards = side === "player" && Boolean(interaction?.canDragHandCards && interaction?.onHandCardDrop);

  function handleHandDragOver(event) {
    if (!acceptsHandCards || !isHandCardDrag(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setHandDropActive(true);
  }

  function handleHandDragLeave(event) {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setHandDropActive(false);
  }

  function handleHandDrop(event) {
    if (!acceptsHandCards) return;
    const payload = readHandCardDragPayload(event);
    if (!payload) return;
    event.preventDefault();
    event.stopPropagation();
    setHandDropActive(false);
    interaction?.onHandCardDrop?.(payload, { zone: "field", side });
  }

  return (
    <ArenaZone zone="battlefield" label="Field" side={side} count={cards.length}>
      <div
        className={`arena-redesign-battlefield-cards is-${density}${handDropActive ? " is-hand-drop-active" : ""}`}
        data-card-count={cards.length}
        data-card-density={density}
        data-hand-drop-target={acceptsHandCards ? "true" : "false"}
        onDragOver={handleHandDragOver}
        onDragLeave={handleHandDragLeave}
        onDrop={handleHandDrop}
      >
        {cards.map((physical, index) => (
          <ArenaFieldCard
            key={physical.instanceId || `${side}-field-${index}`}
            physical={physical}
            side={side}
            density={density}
            battle={battle}
            interaction={interaction}
          />
        ))}
      </div>
    </ArenaZone>
  );
}
