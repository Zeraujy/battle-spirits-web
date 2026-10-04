const VIEWPORT_MARGIN = 18;
const PREVIEW_WIDTH = 240;
const PREVIEW_HEIGHT = 350;

export default function ArenaVisualHoverPreview({ preview }) {
  if (!preview?.card || preview.card.hidden) return null;

  const x = Number(preview.x || 0);
  const y = Number(preview.y || 0);
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1440;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 900;
  const placeLeft = x + PREVIEW_WIDTH + 42 > viewportWidth;
  const left = placeLeft ? Math.max(VIEWPORT_MARGIN, x - PREVIEW_WIDTH - 28) : x + 28;
  const top = Math.max(VIEWPORT_MARGIN, Math.min(y - PREVIEW_HEIGHT * 0.42, viewportHeight - PREVIEW_HEIGHT - VIEWPORT_MARGIN));

  return (
    <aside
      className="arena-visual-hover-preview"
      style={{ left: `${left}px`, top: `${top}px` }}
      aria-hidden="true"
    >
      <img src={preview.card.image || "/images/card-back.webp"} alt="" draggable="false" />
      <div>
        <span>{preview.card.cardType || preview.card.type || "Card"}</span>
        <strong>{preview.card.name || "Card"}</strong>
        <small>{preview.card.cardId || preview.card.id || ""}</small>
      </div>
    </aside>
  );
}
