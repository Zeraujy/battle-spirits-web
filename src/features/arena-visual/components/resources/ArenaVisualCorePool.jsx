import ArenaVisualCoreToken from "./ArenaVisualCoreToken.jsx";
import { coreClickIntent } from "../../interactions/arenaIntentFactory.js";
import { writeArenaVisualCoreDrag } from "../../interactions/coreInteraction.js";

const STONE_POSITIONS = Object.freeze([
  [14, 28, -11], [35, 18, 8], [58, 30, -5], [77, 18, 12],
  [23, 54, 7], [48, 50, -13], [72, 55, 4], [87, 44, -9],
  [14, 76, 10], [37, 73, -4], [59, 78, 14], [80, 73, -12],
  [50, 24, 3], [30, 37, -8]
]);

export default function ArenaVisualCorePool({
  coreCount = 0,
  soulCoreCount = 0,
  compact = false,
  maxVisible = 6,
  slotCount = 0,
  layout = "default",
  interaction = null,
  source = null
}) {
  const visibleSoulCores = Math.min(Math.max(0, soulCoreCount), maxVisible);
  const remainingSlots = Math.max(0, maxVisible - visibleSoulCores);
  const visibleCores = Math.min(Math.max(0, coreCount), remainingSlots);
  const hiddenCount = Math.max(0, coreCount + soulCoreCount - visibleCores - visibleSoulCores);
  const tokens = [
    ...Array.from({ length: visibleCores }, () => "core"),
    ...Array.from({ length: visibleSoulCores }, () => "soul-core")
  ];
  const visibleTokens = slotCount > 0
    ? [...tokens, ...Array.from({ length: Math.max(0, slotCount - tokens.length) }, () => "empty")]
    : tokens;
  const interactive = Boolean(interaction?.canMoveCores && source);

  return (
    <div className={`arena-visual-core-pool${compact ? " is-compact" : ""} is-layout-${layout}`} aria-label="Core pool">
      <div className="arena-visual-core-grid">
        {visibleTokens.map((kind, index) => {
          const coreType = kind === "soul-core" ? "soul" : "regular";
          const payload = source ? { ...source, coreType } : null;
          const stone = layout === "stones" ? STONE_POSITIONS[index % STONE_POSITIONS.length] : null;
          const stoneStyle = stone ? {
            "--arena-visual-stone-x": `${stone[0]}%`,
            "--arena-visual-stone-y": `${stone[1]}%`,
            "--arena-visual-stone-r": `${stone[2]}deg`
          } : undefined;
          return (
            <ArenaVisualCoreToken
              key={`${kind}-${index}`}
              kind={kind}
              compact={compact}
              index={index}
              style={stoneStyle}
              draggable={interactive}
              onDragStart={interactive ? (event) => writeArenaVisualCoreDrag(event, payload) : undefined}
              onClick={interactive ? () => interaction.requestIntent?.(coreClickIntent(payload, { input: "pointer" })) : undefined}
            />
          );
        })}
      </div>
      {hiddenCount > 0 ? <span className="arena-visual-core-overflow">+{hiddenCount}</span> : null}
    </div>
  );
}
