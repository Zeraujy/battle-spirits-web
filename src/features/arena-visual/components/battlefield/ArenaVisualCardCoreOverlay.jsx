import ArenaVisualCoreToken from "../resources/ArenaVisualCoreToken.jsx";
import { coreClickIntent } from "../../interactions/arenaIntentFactory.js";
import { writeArenaVisualCoreDrag } from "../../interactions/coreInteraction.js";

const LEGACY_REGULAR_CORE_POSITIONS = Object.freeze([
  { left: 20, top: 67 },
  { left: 37, top: 67 },
  { left: 54, top: 67 },
  { left: 71, top: 67 },
  { left: 20, top: 77 },
  { left: 37, top: 77 },
  { left: 54, top: 77 },
  { left: 71, top: 77 }
]);

const LEGACY_SOUL_CORE_POSITION = Object.freeze({ left: 72, top: 70 });

export default function ArenaVisualCardCoreOverlay({
  coreCount = 0,
  soulCoreCount = 0,
  interaction = null,
  source = null
}) {
  const regularCount = Math.min(Math.max(0, Number(coreCount) || 0), LEGACY_REGULAR_CORE_POSITIONS.length);
  const hasSoulCore = Number(soulCoreCount) > 0;
  const interactive = Boolean(interaction?.canMoveCores && source);

  if (regularCount === 0 && !hasSoulCore) return null;

  const token = (kind, position, index, className = "") => {
    const coreType = kind === "soul-core" ? "soul" : "regular";
    const payload = source ? { ...source, coreType } : null;
    return (
      <span
        className={`arena-visual-card-core-position${className ? ` ${className}` : ""}`}
        key={`${kind}-${index}`}
        style={{ left: `${position.left}%`, top: `${position.top}%` }}
        onClick={(event) => event.stopPropagation()}
      >
        <ArenaVisualCoreToken
          kind={kind}
          compact
          index={index}
          draggable={interactive}
          onDragStart={interactive ? (event) => {
            event.stopPropagation();
            writeArenaVisualCoreDrag(event, payload);
          } : undefined}
          onClick={interactive ? (event) => {
            event.stopPropagation();
            interaction.requestIntent?.(coreClickIntent(payload, { input: "pointer" }));
          } : undefined}
        />
      </span>
    );
  };

  return (
    <div className="arena-visual-card-core-overlay" aria-label="Card cores">
      {LEGACY_REGULAR_CORE_POSITIONS.slice(0, regularCount).map((position, index) => token("core", position, index))}
      {hasSoulCore ? token("soul-core", LEGACY_SOUL_CORE_POSITION, "soul", "is-soul-core") : null}
    </div>
  );
}
