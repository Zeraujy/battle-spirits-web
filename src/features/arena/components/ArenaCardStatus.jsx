/**
 * Compact field readout inspired by physical/digital Battle Spirits UIs.
 *
 * Level artwork is user-provided and intentionally lives outside the card
 * itself so the readout stays upright even while an exhausted card rotates.
 */
export default function ArenaCardStatus({ level, bp, showBP = true }) {
  const levelNumber = Number(level?.level || level || 0);
  const hasArtwork = levelNumber >= 1 && levelNumber <= 5;
  const numericBP = Number(bp || 0);

  if (!levelNumber && !showBP) return null;

  return (
    <div className="arena-card-status" aria-hidden="true">
      <span className="arena-card-level-slot">
        {levelNumber ? (
          hasArtwork ? (
            <img
              className={`arena-card-level-image level-${levelNumber}`}
              src={`./images/ui/arena/levels/lv${levelNumber}.webp`}
              alt=""
              draggable={false}
            />
          ) : (
            <span className="arena-card-level-fallback">LV{levelNumber}</span>
          )
        ) : null}
      </span>

      {showBP && (
        <strong className="arena-card-bp">
          {numericBP.toLocaleString("pt-BR")}<span>BP</span>
        </strong>
      )}
    </div>
  );
}
