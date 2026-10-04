import ArenaVisualZone from "./ArenaVisualZone.jsx";
import ArenaVisualCorePool from "../resources/ArenaVisualCorePool.jsx";
import { moveCoreIntent } from "../../interactions/arenaIntentFactory.js";
import { readArenaVisualCoreDrag } from "../../interactions/coreInteraction.js";

const CARD_BACK_IMAGE = "/images/card-back.webp";

function coreZoneName(name) {
  if (name === "Reserve") return "reserve";
  if (name === "Core Trash") return "trash";
  if (name === "Life") return "life";
  return null;
}

function motionZoneName(name, playerId) {
  if (!playerId) return undefined;
  if (name === "Deck") return `deck:${playerId}`;
  if (name === "Trash") return `trash:${playerId}`;
  if (name === "Burst") return `burst:${playerId}`;
  return undefined;
}

function ResourceZoneContent({ name, zone, side, interaction }) {
  if (!["Life", "Reserve", "Core Trash"].includes(name)) return null;
  const coreCount = Number.isFinite(zone?.coreCount) ? zone.coreCount : (Number.isFinite(zone?.count) ? zone.count : 0);
  const soulCoreCount = Number.isFinite(zone?.soulCoreCount) ? zone.soulCoreCount : 0;
  const slotCount = name === "Life" ? 6 : 0;
  const layout = name === "Life" ? "life" : "stones";
  const sourceZone = coreZoneName(name);
  const enabled = side === "player" && interaction?.canMoveCores && ["reserve", "trash"].includes(sourceZone);
  const source = enabled ? { zone: sourceZone, playerId: interaction.playerId } : null;

  return (
    <ArenaVisualCorePool
      coreCount={coreCount}
      soulCoreCount={soulCoreCount}
      compact={name === "Life"}
      maxVisible={name === "Life" ? 6 : 14}
      slotCount={slotCount}
      layout={layout}
      interaction={enabled ? interaction : null}
      source={source}
    />
  );
}

function CardPileContent({ name, zone, side, playerId }) {
  if (!["Deck", "Trash", "Burst"].includes(name)) return null;

  const topCard = Array.isArray(zone?.cards) && zone.cards.length > 0
    ? zone.cards[zone.cards.length - 1]
    : null;
  const image = name === "Deck" || name === "Burst"
    ? (Number(zone?.count || 0) > 0 ? CARD_BACK_IMAGE : null)
    : topCard?.image;

  return (
    <div
      className={`arena-visual-card-pile is-${side} is-${name.toLowerCase()}`}
      aria-hidden="true"
      data-motion-zone={motionZoneName(name, playerId)}
      data-motion-card-instance={topCard?.instanceId || undefined}
    >
      {image ? <img src={image} alt="" draggable="false" /> : null}
    </div>
  );
}

function ZoneContent({ name, zone, side, interaction, playerId }) {
  return (
    <>
      <ResourceZoneContent name={name} zone={zone} side={side} interaction={interaction} />
      <CardPileContent name={name} zone={zone} side={side} playerId={playerId} />
    </>
  );
}

function ZoneStack({ side, position, data, interaction }) {
  const playerLeft = [
    ["Life", data.life],
    ["Burst", data.burst],
    ["Reserve", data.reserve]
  ];
  const playerRight = [
    ["Deck", data.deck],
    ["Trash", data.trash],
    ["Core Trash", data.coreTrash]
  ];

  const opponentLeft = [...playerRight].reverse();
  const opponentRight = [...playerLeft].reverse();
  const zones = side === "opponent"
    ? (position === "left" ? opponentLeft : opponentRight)
    : (position === "left" ? playerLeft : playerRight);
  const sidePlayerId = side === "player" ? interaction?.playerId : interaction?.opponentPlayerId;

  return (
    <aside className={`arena-visual-zone-stack is-${side} is-${position}`}>
      {zones.map(([name, zone]) => {
        const targetZone = coreZoneName(name);
        const canReceiveCore = side === "player" && interaction?.canMoveCores && ["reserve", "trash"].includes(targetZone);
        return (
          <ArenaVisualZone
            key={name}
            name={name}
            count={zone?.count}
            compact
            hidden={zone?.visible === false}
            className={`arena-visual-zone-${name.toLowerCase().replaceAll(" ", "-")}${canReceiveCore ? " is-core-target" : ""}`}
            data-life-target={name === "Life" ? sidePlayerId : undefined}
            data-motion-zone={motionZoneName(name, sidePlayerId)}
            onDragOver={canReceiveCore ? (event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            } : undefined}
            onDrop={canReceiveCore ? (event) => {
              event.preventDefault();
              const dragged = readArenaVisualCoreDrag(event);
              if (!dragged) return;
              interaction.requestIntent?.(moveCoreIntent(
                dragged,
                { zone: targetZone },
                { input: "pointer" }
              ));
            } : undefined}
          >
            <ZoneContent name={name} zone={zone} side={side} interaction={interaction} playerId={sidePlayerId} />
          </ArenaVisualZone>
        );
      })}
    </aside>
  );
}

export default function ArenaVisualSideZones({ side, data, position, interaction }) {
  return <ZoneStack side={side} data={data} position={position} interaction={interaction} />;
}
