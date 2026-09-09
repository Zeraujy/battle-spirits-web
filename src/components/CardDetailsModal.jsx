import { useEffect, useMemo, useRef, useState } from "react";
import Modal from "./Modal.jsx";
import { resolveCardImage } from "../game/cardAdapter.js";

import "../styles/cardDetailsModal.css";
import "../styles/cardDetailsTilt.css";


const COLOR_LABELS = {
  red: {
    ptBR: "Vermelho",
    en: "Red"
  },
  purple: {
    ptBR: "Roxo",
    en: "Purple"
  },
  green: {
    ptBR: "Verde",
    en: "Green"
  },
  white: {
    ptBR: "Branco",
    en: "White"
  },
  yellow: {
    ptBR: "Amarelo",
    en: "Yellow"
  },
  blue: {
    ptBR: "Azul",
    en: "Blue"
  },
  ultimate: {
    ptBR: "Ultimate",
    en: "Ultimate"
  }
};


const TYPE_LABELS = {
  spirit: {
    ptBR: "Spirit",
    en: "Spirit"
  },
  brave: {
    ptBR: "Brave",
    en: "Brave"
  },
  ultimate: {
    ptBR: "Ultimate",
    en: "Ultimate"
  },
  nexus: {
    ptBR: "Nexus",
    en: "Nexus"
  },
  magic: {
    ptBR: "Magic",
    en: "Magic"
  }
};


function localized(value, language) {
  if (value == null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

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
  if (card.set) {
    return card.set;
  }

  return String(card.id || "").split("-")[0];
}


function colorLabel(color, language) {
  return COLOR_LABELS[color]?.[language] || color;
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


function splitSentences(text) {
  const lines = normalizeSpaces(text)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.flatMap((line) => {
    const chunks = line.split(". ");

    return chunks
      .map((chunk, index) => {
        const clean = chunk.trim();

        if (!clean) {
          return "";
        }

        return index < chunks.length - 1 ? `${clean}.` : clean;
      })
      .filter(Boolean);
  });
}


function uniqueStrings(items) {
  const seen = new Set();

  return items.filter((item) => {
    const key = String(item).toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}


function extractBadges(prefix) {
  if (!prefix) {
    return [];
  }

  let rest = normalizeSpaces(prefix);
  const badges = [];

  const levelMatch = rest.match(/LV\d(?:\/LV\d)*/gi);

  if (levelMatch) {
    levelMatch
      .flatMap((item) => item.split("/").map((part) => part.trim()))
      .filter(Boolean)
      .forEach((item) => badges.push(item));

    rest = rest.replace(/LV\d(?:\/LV\d)*/gi, " ");
  }

  const bracketMatches = rest.match(/\[[^\]]+\]/g) || [];
  bracketMatches.forEach((item) => badges.push(item));

  rest = rest.replace(/\[[^\]]+\]/g, " ");
  rest = rest.replace(/^\s*[-–—:]+\s*/g, "");
  rest = normalizeSpaces(rest);

  if (rest) {
    badges.push(rest);
  }

  return uniqueStrings(badges);
}


function classifyBadge(text) {
  const badge = String(text || "").trim();

  if (/^LV\d$/i.test(badge)) {
    return "level";
  }

  if (
    /^\[.*\]$/.test(badge) ||
    /^(Flash|Burst|Confront|Curse|Immortality|High Speed|Ice Wall|Heavy Armor|Ultimate Trigger)$/i.test(badge)
  ) {
    return "ability";
  }

  if (
    /(Step|Quando|During|When|At the start|At the end|No início|No fim|Após|Before)/i.test(badge)
  ) {
    return "timing";
  }

  return "generic";
}


function parseRawEffectSegments(text) {
  return splitSentences(text)
    .map((segment) => {
      const clean = normalizeSpaces(segment);

      if (!clean) {
        return null;
      }

      const colonIndex = clean.indexOf(":");

      if (colonIndex >= 0) {
        const prefix = clean.slice(0, colonIndex);
        const body = clean.slice(colonIndex + 1).trim();

        return {
          badges: extractBadges(prefix),
          text: body
        };
      }

      return {
        badges: [],
        text: clean
      };
    })
    .filter(Boolean);
}


function parseStructuredEffect(effect, language) {
  const title = normalizeSpaces(localized(effect.title, language));
  const text = normalizeSpaces(localized(effect.text, language));

  if (!title && !text) {
    return null;
  }

  if (title && !text) {
    const rawEntries = parseRawEffectSegments(title);
    return rawEntries.length ? rawEntries : null;
  }

  const titleParts = title
    ? title.split(":").map((part) => part.trim()).filter(Boolean)
    : [];

  const badges = uniqueStrings(
    titleParts.flatMap((part) => extractBadges(part))
  );

  return {
    badges,
    text
  };
}


function getEffectEntries(card, language) {
  const structuredEffects = Array.isArray(card.effects) ? card.effects : [];

  const fromStructured = structuredEffects.flatMap((effect) => {
    const parsed = parseStructuredEffect(effect, language);

    if (!parsed) {
      return [];
    }

    return Array.isArray(parsed) ? parsed : [parsed];
  });

  if (fromStructured.length) {
    return fromStructured;
  }

  const fallbackText =
    language === "en"
      ? localized(card.effectText, "en") || card.textEN || card.textPT || ""
      : localized(card.effectText, "ptBR") || card.textPT || card.textEN || "";

  return parseRawEffectSegments(fallbackText);
}


function getTermClass(token) {
  if (/^LV\d(?:\/LV\d)*$/i.test(token)) {
    return "level";
  }

  if (/^\[.*\]$/.test(token)) {
    return "ability";
  }

  if (
    /(During|Quando|When|At the start|At the end|No início|No fim|After|Antes)/i.test(token)
  ) {
    return "timing";
  }

  if (
    /(Flash|Burst|Confront|Curse|Immortality|High Speed|Ice Wall|Heavy Armor|Brave|Ultimate Trigger|Ultimate|Nexus|Magic|Spirit|Reserve|Trash|Void|Life|Core|Cores|Refresh|Exhausted)/i.test(token)
  ) {
    return "keyword";
  }

  return "keyword";
}


const HIGHLIGHT_REGEX =
  /(\bLV\d(?:\/LV\d)*\b|\[[^\]]+\]|Ultimate Trigger|High Speed|Heavy Armor|Ice Wall|Confront|Curse|Immortality|Flash|Burst|Brave|Ultimate|Nexus|Magic|Spirit|Reserve|Trash|Void|Life|Core|Cores|Refresh|Exhausted|When Summoned|When This Spirit Attacks|When This Spirit Battles|When This Spirit Is Destroyed|When Destroyed|During Your [A-Za-z' ]+ Step|During the Opponent's [A-Za-z' ]+ Step|During Either Attack Step|During Your Attack Step|At the start of the step|At the end of the battle|Quando Invocado|Quando Este Spirit Ataca|Quando Este Spirit Batalha|Quando Este Spirit For Destruído|Quando Destruído|Durante o seu [A-Za-zÀ-ÿ ]+ Step|Durante o Attack Step do Oponente|Durante o Attack Step de qualquer jogador|No início do Step|No fim da batalha)/gi;


function renderHighlightedText(text) {
  const source = String(text || "");

  if (!source) {
    return null;
  }

  const parts = [];
  let lastIndex = 0;

  for (const match of source.matchAll(HIGHLIGHT_REGEX)) {
    const index = match.index || 0;
    const token = match[0];

    if (index > lastIndex) {
      parts.push(source.slice(lastIndex, index));
    }

    parts.push(
      <span
        className={`card-term ${getTermClass(token)}`}
        key={`${token}-${index}`}
      >
        {token}
      </span>
    );

    lastIndex = index + token.length;
  }

  if (lastIndex < source.length) {
    parts.push(source.slice(lastIndex));
  }

  return parts.map((part, index) =>
    typeof part === "string"
      ? <span key={index}>{part}</span>
      : part
  );
}


function normalizeRarity(rarity) {
  return String(rarity || "")
    .toUpperCase()
    .replace(/\s+/g, "");
}


function hasSpecialNameGlow(card) {
  const rarity = normalizeRarity(card?.rarity);

  if (!rarity) {
    return false;
  }

  if (rarity === "M") {
    return false;
  }

  if (
    rarity === "X" ||
    rarity === "XX" ||
    rarity === "10THX" ||
    rarity === "XV" ||
    rarity === "NX" ||
    rarity === "AX" ||
    rarity === "PX" ||
    rarity === "PXV" ||
    rarity === "転醒X" ||
    rarity === "契約X"
  ) {
    return true;
  }

  return rarity.endsWith("X");
}


function getGlowTheme(card) {
  const symbols = Array.isArray(card?.symbols) ? card.symbols : [];
  const colors = Array.isArray(card?.colors) ? card.colors : [];

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


function SectionTitle({ children }) {
  return (
    <h3 className="card-details-section-title">
      {children}
    </h3>
  );
}


export default function CardDetailsModal({
  card,
  onClose,
  initialLanguage = "ptBR"
}) {
  const [language, setLanguage] = useState(
    initialLanguage === "en" ? "en" : "ptBR"
  );

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

    if (!element) {
      return;
    }

    element.style.setProperty(
      "--card-tilt-x",
      `${rotateX.toFixed(2)}deg`
    );

    element.style.setProperty(
      "--card-tilt-y",
      `${rotateY.toFixed(2)}deg`
    );

    element.style.setProperty(
      "--card-pointer-x",
      `${pointerX.toFixed(2)}%`
    );

    element.style.setProperty(
      "--card-pointer-y",
      `${pointerY.toFixed(2)}%`
    );

    element.style.setProperty(
      "--card-shadow-x",
      `${shadowX.toFixed(2)}px`
    );

    element.style.setProperty(
      "--card-shadow-y",
      `${shadowY.toFixed(2)}px`
    );
  }


  function handleCardPointerEnter(event) {
    if (event.pointerType === "touch") {
      return;
    }

    cardTiltRef.current?.classList.add(
      "is-tilting"
    );
  }


  function handleCardPointerMove(event) {
    if (
      event.pointerType === "touch" ||
      !cardTiltRef.current
    ) {
      return;
    }

    const element =
      cardTiltRef.current;

    const rect =
      element.getBoundingClientRect();

    if (
      !rect.width ||
      !rect.height
    ) {
      return;
    }

    const localX =
      Math.min(
        Math.max(
          event.clientX - rect.left,
          0
        ),
        rect.width
      );

    const localY =
      Math.min(
        Math.max(
          event.clientY - rect.top,
          0
        ),
        rect.height
      );

    const percentX =
      localX /
      rect.width;

    const percentY =
      localY /
      rect.height;

    const normalizedX =
      percentX * 2 - 1;

    const normalizedY =
      percentY * 2 - 1;

    /*
     * Mantemos a inclinação relativamente pequena para
     * parecer uma carta física sem dificultar a leitura.
     */
    const maxTilt =
      9;

    const rotateY =
      normalizedX *
      maxTilt;

    const rotateX =
      normalizedY *
      -maxTilt;

    const shadowX =
      normalizedX *
      -11;

    const shadowY =
      18 +
      Math.abs(
        normalizedY
      ) *
      7;

    if (
      tiltFrameRef.current
    ) {
      cancelAnimationFrame(
        tiltFrameRef.current
      );
    }

    tiltFrameRef.current =
      requestAnimationFrame(
        () => {
          setTiltVariables({
            rotateX,
            rotateY,
            pointerX:
              percentX * 100,
            pointerY:
              percentY * 100,
            shadowX,
            shadowY
          });
        }
      );
  }


  function handleCardPointerLeave() {
    if (
      tiltFrameRef.current
    ) {
      cancelAnimationFrame(
        tiltFrameRef.current
      );

      tiltFrameRef.current =
        null;
    }

    cardTiltRef.current?.classList.remove(
      "is-tilting"
    );

    setTiltVariables();
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );

      if (
        tiltFrameRef.current
      ) {
        cancelAnimationFrame(
          tiltFrameRef.current
        );
      }
    };
  }, [onClose]);

  const image = useMemo(
    () => card?.image || resolveCardImage(card),
    [card]
  );

  const name = cardName(card, language);

  const effectEntries = useMemo(
    () => getEffectEntries(card, language),
    [card, language]
  );

  const reductions = Array.isArray(card.reduction) ? card.reduction : [];
  const symbols = Array.isArray(card.symbols) ? card.symbols : [];
  const colors = Array.isArray(card.colors) ? card.colors : [];
  const families = Array.isArray(card.families) ? card.families : [];
  const subtypes = Array.isArray(card.subtypes) ? card.subtypes : [];
  const levels = Array.isArray(card.levels) ? card.levels : [];

  const specialGlow = hasSpecialNameGlow(card);
  const glowTheme = getGlowTheme(card);

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
          levels: "Levels",
          cores: "Cores",
          effect: "Effect",
          noEffect: "This card has no effect.",
          noReduction: "None",
          noSymbol: "None"
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
          levels: "Levels",
          cores: "Cores",
          effect: "Efeito",
          noEffect: "Esta carta não possui efeito.",
          noReduction: "Nenhuma",
          noSymbol: "Nenhum"
        };

  return (
    <Modal
      title={labels.title}
      onClose={onClose}
      className="card-details-shell"
    >
      <div className="card-details-modal">
        <section className="card-details-hero">
          <div className="card-details-image-column">
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
                <img
                  src={image}
                  alt={name}
                  draggable="false"
                />

                <span
                  className="card-details-tilt-glare"
                  aria-hidden="true"
                />

                <span
                  className="card-details-tilt-sheen"
                  aria-hidden="true"
                />
              </div>
            </div>

            <div className="card-details-language-switch">
              <button
                className={language === "ptBR" ? "active" : ""}
                onClick={() => setLanguage("ptBR")}
              >
                PT-BR
              </button>

              <button
                className={language === "en" ? "active" : ""}
                onClick={() => setLanguage("en")}
              >
                EN
              </button>
            </div>
          </div>

          <div className="card-details-info">
            <div className="card-details-heading">
              <div>
                <span className="card-details-id">
                  {card.id}
                </span>

                <h2
                  className={`card-details-name ${
                    specialGlow ? `rarity-glow ${glowTheme}` : ""
                  }`}
                >
                  {name}
                </h2>
              </div>

              <span className="card-details-rarity">
                {card.rarity || "—"}
              </span>
            </div>

            <div className="card-details-primary-chips">
              <span>
                {typeLabel(card.cardType, language)}
              </span>

              <span>
                {labels.set}: <b>{getSetName(card)}</b>
              </span>

              <span>
                {labels.rarity}: <b>{card.rarity || "—"}</b>
              </span>
            </div>

            <div className="card-details-stats-grid">
              <div className="card-details-stat">
                <small>{labels.cost}</small>
                <strong>{card.cost ?? "—"}</strong>
              </div>

              <div className="card-details-stat card-details-stat-wide">
                <small>{labels.colors}</small>

                <div className="card-details-color-row">
                  {colors.length ? colors.map((color, index) => (
                    <span
                      key={`${color}-${index}`}
                      className={`card-detail-color ${color}`}
                    >
                      <i />
                      {colorLabel(color, language)}
                    </span>
                  )) : (
                    <span>—</span>
                  )}
                </div>
              </div>

              <div className="card-details-stat card-details-stat-wide">
                <small>{labels.reduction}</small>

                <div className="card-details-icon-row">
                  {reductions.length ? reductions.map((color, index) => (
                    <span
                      className={`card-detail-symbol ${color}`}
                      title={colorLabel(color, language)}
                      key={`${color}-${index}`}
                    >
                      ◆
                    </span>
                  )) : (
                    <em>{labels.noReduction}</em>
                  )}
                </div>
              </div>

              <div className="card-details-stat card-details-stat-wide">
                <small>{labels.symbols}</small>

                <div className="card-details-icon-row">
                  {symbols.length ? symbols.map((symbol, index) => (
                    <span
                      className={`card-detail-symbol ${symbol}`}
                      title={colorLabel(symbol, language)}
                      key={`${symbol}-${index}`}
                    >
                      ◆
                    </span>
                  )) : (
                    <em>{labels.noSymbol}</em>
                  )}
                </div>
              </div>
            </div>

            {families.length > 0 && (
              <section className="card-details-section">
                <SectionTitle>{labels.families}</SectionTitle>

                <div className="card-details-tag-list">
                  {families.map((family) => (
                    <span key={family}>
                      {family}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {subtypes.length > 0 && (
              <section className="card-details-section">
                <SectionTitle>{labels.subtypes}</SectionTitle>

                <div className="card-details-tag-list secondary">
                  {subtypes.map((subtype) => (
                    <span key={subtype}>
                      {subtype}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {levels.length > 0 && (
              <section className="card-details-section">
                <SectionTitle>{labels.levels}</SectionTitle>

                <div className="card-details-levels">
                  {levels.map((level, index) => (
                    <div
                      className="card-details-level"
                      key={`${level.level}-${index}`}
                    >
                      <strong>
                        LV{level.level}
                      </strong>

                      <span>
                        <b>{level.cores ?? 0}</b> {labels.cores}
                      </span>

                      {card.cardType !== "nexus" && level.bp != null && (
                        <span className="card-details-bp">
                          <b>{Number(level.bp).toLocaleString("en-US")}</b> BP
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </section>

        <section className="card-details-effect-panel">
          <SectionTitle>{labels.effect}</SectionTitle>

          {effectEntries.length > 0 ? (
            <div className="card-details-effect-list">
              {effectEntries.map((entry, index) => (
                <article
                  className="card-details-effect-entry"
                  key={index}
                >
                  {entry.badges?.length > 0 && (
                    <div className="card-details-effect-chips">
                      {entry.badges.map((badge, badgeIndex) => (
                        <span
                          className={`card-details-effect-chip ${classifyBadge(badge)}`}
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
            <p className="card-details-effect-text rich">
              {labels.noEffect}
            </p>
          )}
        </section>
      </div>
    </Modal>
  );
}