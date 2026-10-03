/**
 * Visual-only Brave layer shown behind its combined host.
 * Rules and ownership remain entirely inside the engine; this component only
 * represents the already-established combination on the battlefield.
 */
export default function ArenaBraveAttachment({
  image,
  name,
  exhausted = false,
  highRarity = false,
  glowTheme = "neutral"
}) {
  if (!image) return null;

  return (
    <div
      className={`arena-brave-attachment ${exhausted ? "is-exhausted" : ""} ${highRarity ? `has-rarity-glow brave-glow-${glowTheme}` : ""}`}
      aria-hidden="true"
    >
      <img src={image} alt={name || "Brave"} draggable={false} />
    </div>
  );
}
