import { useEffect, useMemo, useRef, useState } from "react";
import { resolveCardImage } from "../../game/cardAdapter.js";

import "../../styles/cards/cardDetailsModal.css";
import "../../styles/cards/cardDetailsTilt.css";

const COLOR_LABELS = {
  red: { ptBR: "Vermelho", en: "Red" },
  purple: { ptBR: "Roxo", en: "Purple" },
  green: { ptBR: "Verde", en: "Green" },
  white: { ptBR: "Branco", en: "White" },
  yellow: { ptBR: "Amarelo", en: "Yellow" },
  blue: { ptBR: "Azul", en: "Blue" },
  ultimate: { ptBR: "Ultimate", en: "Ultimate" }
};

const TYPE_LABELS = {
  spirit: { ptBR: "Spirit", en: "Spirit" },
  brave: { ptBR: "Brave", en: "Brave" },
  ultimate: { ptBR: "Ultimate", en: "Ultimate" },
  nexus: { ptBR: "Nexus", en: "Nexus" },
  magic: { ptBR: "Magic", en: "Magic" }
};

const KEYWORD_PATTERN = [
  "Ultimate Trigger",
  "Trigger Counter",
  "Critical Hit",
  "XU Trigger",
  "High Speed",
  "Heavy Armor",
  "Ice Wall",
  "When Summoned",
  "When This Spirit Attacks",
  "When This Spirit Battles",
  "When This Spirit Blocks",
  "When This Spirit Is Destroyed",
  "When Destroyed",
  "During Either Attack Step",
  "During Your Attack Step",
  "During the Opponent's Attack Step",
  "At the start of the step",
  "At the end of the battle",
  "Quando Invocado",
  "Quando Este Spirit Ataca",
  "Quando Este Spirit Batalha",
  "Quando Este Spirit Bloqueia",
  "Quando Este Spirit For Destruído",
  "Quando Destruído",
  "Durante o Seu Attack Step",
  "Durante o Attack Step do Oponente",
  "Durante o Attack Step de Qualquer Jogador",
  "No início do Step",
  "No fim da batalha",
  "Confront",
  "Rush",
  "Chain",
  "Brilliance",
  "Awaken",
  "Flash",
  "Burst",
  "Curse",
  "Immortality",
  "Armor",
  "Assault",
  "Charge",
  "Tribute",
  "Brave",
  "Main",
  "Ultimate",
  "Nexuses",
  "Nexus",
  "Magics",
  "Magic",
  "Spirits",
  "Spirit",
  "Reserve",
  "Trash",
  "Void",
  "Life",
  "Soul Core",
  "Cores",
  "Core",
  "Refresh",
  "Exhausted",
  "Exhaust",
  "BP"
];

const HIGHLIGHT_REGEX = new RegExp(
  `(\\bLV\\d(?:\\/LV\\d)*\\b|\\[[^\\]]+\\]|${KEYWORD_PATTERN
    .sort((a, b) => b.length - a.length)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")})`,
  "gi"
);

function localized(value, language) {
  if (value == null) return "";
  if (typeof value === "string") return value;

  if (language === "en") {
    return value.en || value.ptBR || value.pt || "";
  }

  return value.ptBR || value.pt || value.en || "";
}

function cardName(card, language) {
  if (language === "en") {
    return card.nameEN || card.name || card.namePT || card.id || "";
  }

  return card.namePT || card.name || card.nameEN || card.id || "";
}

function getSetName(card) {
  return card.set || String(card.id || "").split("-")[0] || "—";
}

function colorLabel(color, language) {
  return COLOR_LABELS[color]?.[language] || color || "—";
}

function typeLabel(type, language) {
  return TYPE_LABELS[type]?.[language] || type || "—";
}

function normalizeSpaces(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function uniqueStrings(items) {
  const seen = new Set();

  return items.filter((item) => {
    const value = normalizeSpaces(item);
    const key = value.toLowerCase();
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractBadges(prefix) {
  if (!prefix) return [];

  let rest = normalizeSpaces(prefix);
  const badges = [];

  const levels = rest.match(/LV\d(?:\/LV\d)*/gi) || [];
  levels
    .flatMap((item) => item.split("/").map((part) => part.trim()))
    .filter(Boolean)
    .forEach((item) => badges.push(item.toUpperCase()));

  rest = rest.replace(/LV\d(?:\/LV\d)*/gi, " ");

  const brackets = rest.match(/\[[^\]]+\]/g) || [];
  brackets.forEach((item) => badges.push(item));
  rest = rest.replace(/\[[^\]]+\]/g, " ");

  rest = rest.replace(/^\s*[-–—:]+\s*/g, "");
  rest = normalizeSpaces(rest);

  if (rest) badges.push(rest);
  return uniqueStrings(badges);
}

function splitRawEffect(text) {
  const lines = String(text || "")
    .replace(/\r/g, "")
    .split(/\n+/)
    .map((line) => normalizeSpaces(line))
    .filter(Boolean);

  return lines.map((line) => {
    const colon = line.indexOf(":");

    if (colon > 0 && colon < 90) {
      const prefix = line.slice(0, colon);
      const body = normalizeSpaces(line.slice(colon + 1));
      return { badges: extractBadges(prefix), text: body };
    }

    return { badges: [], text: line };
  });
}

function parseStructuredEffect(effect, language) {
  const title = normalizeSpaces(localized(effect?.title, language));
  const text = normalizeSpaces(localized(effect?.text, language));
  const levels = Array.isArray(effect?.levels) ? effect.levels : [];

  const levelBadges = levels
    .filter((level) => Number.isFinite(Number(level)))
    .map((level) => `LV${level}`);

  const titleBadges = title ? extractBadges(title) : [];
  const badges = uniqueStrings([...levelBadges, ...titleBadges]);

  if (!text && title) {
    return { badges: levelBadges, text: title };
  }

  if (!text) return null;
  return { badges, text };
}

function getEffectEntries(card, language) {
  const structured = Array.isArray(card?.effects) ? card.effects : [];
  const parsed = structured
    .map((effect) => parseStructuredEffect(effect, language))
    .filter(Boolean);

  if (parsed.length) return parsed;

  const fallback =
    language === "en"
      ? localized(card?.effectText, "en") || card?.textEN || card?.textPT || ""
      : localized(card?.effectText, "ptBR") || card?.textPT || card?.textEN || "";

  return splitRawEffect(fallback);
}

function classifyToken(token) {
  const value = String(token || "").trim();

  if (/^LV\d(?:\/LV\d)*$/i.test(value)) return "level";
  if (/^\[[^\]]+\]$/.test(value)) return "ability";

  if (
    /(when|quando|during|durante|at the start|at the end|no início|no fim)/i.test(value)
  ) {
    return "timing";
  }

  if (
    /(Confront|Rush|Chain|Brilliance|Awaken|Flash|Burst|Curse|Immortality|High Speed|Heavy Armor|Ice Wall|Armor|Assault|Charge|Tribute|Ultimate Trigger|Trigger Counter|Critical Hit|XU Trigger|Brave|Main)/i.test(value)
  ) {
    return "ability";
  }

  if (/(Reserve|Trash|Void|Life|Soul Core|Core|Cores|Refresh|Exhausted|Exhaust)/i.test(value)) {
    return "resource";
  }

  if (/^BP$/i.test(value)) return "bp";
  return "keyword";
}

function renderHighlightedText(text) {
  const source = String(text || "");
  if (!source) return null;

  const parts = [];
  let lastIndex = 0;

  for (const match of source.matchAll(HIGHLIGHT_REGEX)) {
    const index = match.index ?? 0;
    const token = match[0];

    if (index > lastIndex) {
      parts.push(source.slice(lastIndex, index));
    }

    parts.push(
      <span
        className={`card-term ${classifyToken(token)}`}
        key={`${token}-${index}`}
      >
        {token}
      </span>
    );

    lastIndex = index + token.length;
  }

  if (lastIndex < source.length) parts.push(source.slice(lastIndex));

  return parts.map((part, index) =>
    typeof part === "string" ? <span key={`text-${index}`}>{part}</span> : part
  );
}

function normalizeRarity(rarity) {
  return String(rarity || "")
    .toUpperCase()
    .replace(/[\s_-]+/g, "");
}

function hasSpecialNameGlow(card) {
  const rarity = normalizeRarity(card?.rarity);
  if (!rarity || rarity === "M") return false;

  const exact = new Set([
    "X",
    "XX",
    "10THX",
    "XV",
    "NX",
    "AX",
    "PX",
    "PXV",
    "転醒X",
    "契約X"
  ]);

  return exact.has(rarity) || rarity.endsWith("X");
}

function getGlowTheme(card) {
  const symbols = Array.isArray(card?.symbols) ? card.symbols.filter(Boolean) : [];
  const colors = Array.isArray(card?.colors) ? card.colors.filter(Boolean) : [];

  if (
    card?.cardType === "ultimate" ||
    symbols.includes("ultimate") ||
    colors.includes("ultimate") ||
    symbols.length > 1 ||
    colors.length > 1
  ) {
    return "rainbow";
  }

  return symbols[0] || colors[0] || "neutral";
}

function Badge({ children, className = "" }) {
  return <span className={`card-details-badge ${className}`}>{children}</span>;
}

function ColorDot({ color, language, showLabel = false }) {
  return (
    <span
      className={`card-detail-color-orb ${color || "neutral"} ${showLabel ? "with-label" : ""}`}
      title={colorLabel(color, language)}
    >
      <i aria-hidden="true" />
      {showLabel && <b>{colorLabel(color, language)}</b>}
    </span>
  );
}

function SymbolDot({ color, language }) {
  return (
    <span
      className={`card-detail-symbol-orb ${color || "neutral"}`}
      title={colorLabel(color, language)}
    >
      <i aria-hidden="true" />
    </span>
  );
}

function SectionTitle({ children }) {
  return <h3 className="card-details-section-title">{children}</h3>;
}

export default function CardDetailsModal({
  card,
  onClose,
  initialLanguage = "ptBR",
  relatedCards = [],
  onSelectRelated
}) {
  const [language, setLanguage] = useState(initialLanguage === "en" ? "en" : "ptBR");
  const cardTiltRef = useRef(null);
  const tiltFrameRef = useRef(null);

  function setTiltVariables({
    rotateX = 0,
    rotateY = 0,
    pointerX = 50,
    pointerY = 50,
    shadowX = 0,
    shadowY = 18
  } = {}) {
    const element = cardTiltRef.current;
    if (!element) return;

    element.style.setProperty("--card-tilt-x", `${rotateX.toFixed(2)}deg`);
    element.style.setProperty("--card-tilt-y", `${rotateY.toFixed(2)}deg`);
    element.style.setProperty("--card-pointer-x", `${pointerX.toFixed(2)}%`);
    element.style.setProperty("--card-pointer-y", `${pointerY.toFixed(2)}%`);
    element.style.setProperty("--card-shadow-x", `${shadowX.toFixed(2)}px`);
    element.style.setProperty("--card-shadow-y", `${shadowY.toFixed(2)}px`);
  }

  function handleCardPointerEnter(event) {
    if (event.pointerType === "touch") return;
    cardTiltRef.current?.classList.add("is-tilting");
  }

  function handleCardPointerMove(event) {
    if (event.pointerType === "touch" || !cardTiltRef.current) return;

    const rect = cardTiltRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const localX = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
    const localY = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
    const percentX = localX / rect.width;
    const percentY = localY / rect.height;
    const normalizedX = percentX * 2 - 1;
    const normalizedY = percentY * 2 - 1;

    if (tiltFrameRef.current) cancelAnimationFrame(tiltFrameRef.current);

    tiltFrameRef.current = requestAnimationFrame(() => {
      setTiltVariables({
        rotateX: normalizedY * -9,
        rotateY: normalizedX * 9,
        pointerX: percentX * 100,
        pointerY: percentY * 100,
        shadowX: normalizedX * -11,
        shadowY: 18 + Math.abs(normalizedY) * 7
      });
    });
  }

  function handleCardPointerLeave() {
    if (tiltFrameRef.current) {
      cancelAnimationFrame(tiltFrameRef.current);
      tiltFrameRef.current = null;
    }

    cardTiltRef.current?.classList.remove("is-tilting");
    setTiltVariables();
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }

    window.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (tiltFrameRef.current) cancelAnimationFrame(tiltFrameRef.current);
    };
  }, [onClose]);

  const activeCard = card || {};

  const image = useMemo(
    () => activeCard.image || resolveCardImage(activeCard),
    [card]
  );
  const name = cardName(activeCard, language);
  const effectEntries = useMemo(
    () => getEffectEntries(activeCard, language),
    [card, language]
  );

  const reductions = Array.isArray(activeCard.reduction) ? activeCard.reduction : [];
  const symbols = Array.isArray(activeCard.symbols) ? activeCard.symbols : [];
  const colors = Array.isArray(activeCard.colors) ? activeCard.colors : [];
  const families = Array.isArray(activeCard.families) ? activeCard.families : [];
  const subtypes = Array.isArray(activeCard.subtypes) ? activeCard.subtypes : [];
  const levels = Array.isArray(activeCard.levels) ? activeCard.levels : [];

  const specialGlow = hasSpecialNameGlow(activeCard);
  const glowTheme = getGlowTheme(activeCard);

  const labels =
    language === "en"
      ? {
          title: "Card Details",
          set: "Set",
          rarity: "Rarity",
          type: "Type",
          colors: "Color",
          cost: "Cost",
          reduction: "Reduction",
          symbols: "Symbols",
          families: "Families",
          subtypes: "Subtypes",
          levels: "Levels / BP",
          effect: "Effects & Abilities",
          noEffect: "This card has no effect.",
          noReduction: "None",
          noSymbol: "None",
          related: "Related cards",
          close: "Close"
        }
      : {
          title: "Detalhes da Carta",
          set: "Coleção",
          rarity: "Raridade",
          type: "Tipo",
          colors: "Cor",
          cost: "Custo",
          reduction: "Redução",
          symbols: "Símbolos",
          families: "Famílias",
          subtypes: "Subtipos",
          levels: "Levels / BP",
          effect: "Efeitos & Habilidades",
          noEffect: "Esta carta não possui efeito.",
          noReduction: "Nenhuma",
          noSymbol: "Nenhum",
          related: "Cartas relacionadas",
          close: "Fechar"
        };

  if (!card) return null;

  return (
    <div
      className="card-details-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <section
        className={`card-details-shell card-theme-${glowTheme}`}
        role="dialog"
        aria-modal="true"
        aria-label={`${labels.title}: ${name}`}
      >
        <aside className="card-details-image-column">
          <div className="card-details-image-sticky">
            <div className="card-details-image-stage">
              <div
                ref={cardTiltRef}
                className={`card-details-image-frame card-details-tilt-card ${
                  specialGlow ? `special-foil ${glowTheme}` : ""
                }`}
                onPointerEnter={handleCardPointerEnter}
                onPointerMove={handleCardPointerMove}
                onPointerLeave={handleCardPointerLeave}
              >
                <img src={image} alt={name} draggable="false" />
                <span className="card-details-tilt-glare" aria-hidden="true" />
                <span className="card-details-tilt-sheen" aria-hidden="true" />
              </div>
            </div>

            <div className="card-details-image-caption">
              <span>{activeCard.id}</span>
              <strong>{typeLabel(activeCard.cardType, language)}</strong>
              <span>{getSetName(activeCard)}</span>
            </div>
          </div>
        </aside>

        <div className="card-details-info-column">
          <header className="card-details-toolbar">
            <div className="card-details-language-switch" aria-label="Idioma da carta">
              <button
                type="button"
                className={language === "ptBR" ? "active" : ""}
                onClick={() => setLanguage("ptBR")}
              >
                PT-BR
              </button>
              <button
                type="button"
                className={language === "en" ? "active" : ""}
                onClick={() => setLanguage("en")}
              >
                EN
              </button>
            </div>

            <button
              type="button"
              className="card-details-close"
              onClick={onClose}
              aria-label={labels.close}
              title={labels.close}
            >
              ×
            </button>
          </header>

          <div className="card-details-scroll">
            <section className="card-details-heading-block">
              <div className="card-details-heading-meta">
                <span className="card-details-id">{activeCard.id}</span>
                <Badge>{typeLabel(activeCard.cardType, language)}</Badge>
                <Badge>{labels.set}: {getSetName(activeCard)}</Badge>
                <Badge className="rarity">{labels.rarity}: {activeCard.rarity || "—"}</Badge>
              </div>

              <h2
                className={`card-details-name ${
                  specialGlow ? `rarity-glow ${glowTheme}` : ""
                }`}
              >
                {name}
              </h2>
            </section>

            <section className="card-details-core-info">
              <div className="card-details-cost-card">
                <span>{labels.cost}</span>
                <strong>{activeCard.cost ?? "—"}</strong>
              </div>

              <div className="card-details-data-card">
                <span className="card-details-data-label">{labels.colors}</span>
                <div className="card-details-color-list">
                  {colors.length ? (
                    colors.map((color, index) => (
                      <ColorDot
                        color={color}
                        language={language}
                        showLabel
                        key={`${color}-${index}`}
                      />
                    ))
                  ) : (
                    <em>—</em>
                  )}
                </div>
              </div>

              <div className="card-details-data-card">
                <span className="card-details-data-label">{labels.reduction}</span>
                <div className="card-details-orb-row reduction-row">
                  {reductions.length ? (
                    reductions.map((color, index) => (
                      <ColorDot color={color} language={language} key={`${color}-${index}`} />
                    ))
                  ) : (
                    <em>{labels.noReduction}</em>
                  )}
                </div>
              </div>

              <div className="card-details-data-card">
                <span className="card-details-data-label">{labels.symbols}</span>
                <div className="card-details-orb-row symbol-row">
                  {symbols.length ? (
                    symbols.map((symbol, index) => (
                      <SymbolDot color={symbol} language={language} key={`${symbol}-${index}`} />
                    ))
                  ) : (
                    <em>{labels.noSymbol}</em>
                  )}
                </div>
              </div>
            </section>

            {(families.length > 0 || subtypes.length > 0) && (
              <section className="card-details-taxonomy">
                {families.length > 0 && (
                  <div>
                    <SectionTitle>{labels.families}</SectionTitle>
                    <div className="card-details-tag-list">
                      {families.map((family) => (
                        <span key={family}>{family}</span>
                      ))}
                    </div>
                  </div>
                )}

                {subtypes.length > 0 && (
                  <div>
                    <SectionTitle>{labels.subtypes}</SectionTitle>
                    <div className="card-details-tag-list secondary">
                      {subtypes.map((subtype) => (
                        <span key={subtype}>{subtype}</span>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {levels.length > 0 && (
              <section className="card-details-section">
                <SectionTitle>{labels.levels}</SectionTitle>
                <div className="card-details-levels">
                  {levels.map((level, index) => (
                    <div className="card-details-level" key={`${level.level}-${index}`}>
                      <strong className="card-details-level-badge">LV{level.level}</strong>
                      <span className="card-details-level-cores">
                        <b>{level.cores ?? 0}</b>
                        <small>{language === "en" ? "Cores" : "Cores"}</small>
                      </span>
                      {activeCard.cardType !== "nexus" && level.bp != null && (
                        <span className="card-details-bp">
                          <b>{Number(level.bp).toLocaleString("pt-BR")}</b>
                          <small>BP</small>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="card-details-section card-details-effects-section">
              <SectionTitle>{labels.effect}</SectionTitle>

              {effectEntries.length > 0 ? (
                <div className="card-details-effect-list">
                  {effectEntries.map((entry, index) => (
                    <article className="card-details-effect-entry" key={index}>
                      {entry.badges?.length > 0 && (
                        <div className="card-details-effect-chips">
                          {entry.badges.map((badge, badgeIndex) => (
                            <span
                              className={`card-details-effect-chip ${classifyToken(badge)}`}
                              key={`${badge}-${badgeIndex}`}
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="card-details-effect-text rich">
                        {renderHighlightedText(entry.text)}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <article className="card-details-effect-entry empty">
                  <p className="card-details-effect-text rich">{labels.noEffect}</p>
                </article>
              )}
            </section>

            {relatedCards.length > 0 && (
              <section className="card-details-section card-details-related-section">
                <SectionTitle>{labels.related}</SectionTitle>
                <div className="card-details-related-grid">
                  {relatedCards.map((related) => (
                    <button
                      type="button"
                      className="card-details-related-card"
                      key={related.id}
                      onClick={() => onSelectRelated?.(related)}
                    >
                      <img src={resolveCardImage(related)} alt={cardName(related, language)} loading="lazy" decoding="async" />
                      <span>
                        <b>{cardName(related, language)}</b>
                        <small>{related.id}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
