import CardTile from "../../cards/CardTile.jsx";
import EffectText from "../../cards/EffectText.jsx";

export default function CardPreview({
  card,
  physical = null,
  mode = "selected",
  source = "field",
  imageSrc = "",
  name = "",
  effect = "",
  noEffectText = "",
  costLabel = "Cost",
  previewLabel = "Card Preview",
  style,
  className = "",
  actions = null
}) {
  if (!card) return null;

  if (mode === "hover") {
    return (
      <div
        className={`card-preview card-preview-hover card-zoom-preview ${className}`.trim()}
        data-preview-mode="hover"
        data-preview-source={source}
        style={style}
      >
        <img src={imageSrc} alt={name} />
        <div className="card-zoom-copy card-preview-copy">
          <span>{previewLabel}</span>
          <strong>{name}</strong>
          <small>
            {card.id}
            {card.cardType ? ` • ${card.cardType}` : ""}
          </small>
        </div>
      </div>
    );
  }

  return (
    <section
      className={`card-preview card-preview-selected ${className}`.trim()}
      data-preview-mode="selected"
      data-preview-source={source}
    >
      <CardTile card={card} physical={physical} staticPreview />

      <h2 className="card-preview-title">{name}</h2>

      <div className="card-meta card-preview-meta">
        <span>{card.id}</span>
        <span>{card.cardType}</span>
        <span>{costLabel} {card.cost}</span>
      </div>

      <EffectText text={effect} emptyText={noEffectText} />

      {actions ? (
        <div className="card-preview-actions">
          {actions}
        </div>
      ) : null}
    </section>
  );
}
