import { useMemo } from "react";

import "../styles/selectedCardPanel.css";


const KEYWORD_PATTERN =
  /(\bLV\d(?:\/LV\d)*\b|\[[^\]]+\]|Ultimate Trigger|Ultimate Triger|High Speed|Heavy Armor|Ice Wall|Confront|Curse|Immortality|Flash|Burst|Brave|Ultimate|Nexus|Magic|Spirit|Spirits|Reserve|Trash|Void|Life|Core|Cores|Refresh|Exhaust|Exhausted|BP|Main Step|Attack Step|Flash Timing|When Summoned|When This Spirit Attacks|When This Spirit Blocks|When This Spirit Battles|When This Spirit Is Destroyed|When Destroyed|During Your Attack Step|During Either Attack Step|During the Opponent's Attack Step|At the start of the step|At the end of the battle|Quando Invocado|Quando Este Spirit Ataca|Quando Este Spirit Bloqueia|Quando Este Spirit Batalha|Quando Este Spirit For Destruído|Quando Destruído|Durante o seu Main Step|Durante seu Main Step|Durante o seu Attack Step|Durante seu Attack Step|Durante o Attack Step do Oponente|Durante o Attack Step de qualquer jogador|No início do Step|No fim da batalha|Após Sua Life Diminuir)/gi;


function cleanText(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+\n/g, "\n")
    .trim();
}


function classifyTerm(term) {
  const value = String(term || "").trim();

  if (/^LV\d(?:\/LV\d)*$/i.test(value)) {
    return "level";
  }

  if (
    /^\[.*\]$/.test(value) ||
    /^(Flash|Burst|Confront|Curse|Immortality|High Speed|Heavy Armor|Ice Wall|Ultimate Trigger|Ultimate Triger)$/i.test(value)
  ) {
    return "ability";
  }

  if (
    /(Step|When|During|At the|Quando|Durante|No início|No fim|Após)/i.test(value)
  ) {
    return "timing";
  }

  if (
    /^(Spirit|Spirits|Brave|Ultimate|Nexus|Magic)$/i.test(value)
  ) {
    return "cardtype";
  }

  if (
    /^(Reserve|Trash|Void|Life|Core|Cores|Refresh|Exhaust|Exhausted|BP)$/i.test(value)
  ) {
    return "zone";
  }

  return "keyword";
}


function renderHighlightedText(text) {
  const source = String(text || "");

  if (!source) {
    return null;
  }

  const parts = [];
  let lastIndex = 0;

  for (const match of source.matchAll(KEYWORD_PATTERN)) {
    const index = match.index ?? 0;
    const term = match[0];

    if (index > lastIndex) {
      parts.push(
        <span key={`plain-${lastIndex}`}>
          {source.slice(lastIndex, index)}
        </span>
      );
    }

    parts.push(
      <span
        className={`selected-card-term ${classifyTerm(term)}`}
        key={`term-${index}-${term}`}
      >
        {term}
      </span>
    );

    lastIndex = index + term.length;
  }

  if (lastIndex < source.length) {
    parts.push(
      <span key={`plain-${lastIndex}`}>
        {source.slice(lastIndex)}
      </span>
    );
  }

  return parts;
}


function extractHeader(prefix) {
  let remaining = cleanText(prefix);
  const badges = [];

  const levels = remaining.match(/\bLV\d(?:\/LV\d)*\b/gi);

  if (levels) {
    levels
      .flatMap((entry) => entry.split("/"))
      .map((entry) => entry.trim())
      .filter(Boolean)
      .forEach((entry) => badges.push(entry));

    remaining = remaining.replace(/\bLV\d(?:\/LV\d)*\b/gi, " ");
  }

  const bracketed = remaining.match(/\[[^\]]+\]/g) || [];

  bracketed.forEach((entry) => badges.push(entry));
  remaining = remaining.replace(/\[[^\]]+\]/g, " ");

  remaining = remaining
    .replace(/^[\s:–—-]+/, "")
    .replace(/[\s:–—-]+$/, "")
    .trim();

  if (remaining) {
    badges.push(remaining);
  }

  return badges;
}


function splitIntoEntries(text) {
  const normalized = cleanText(text);

  if (!normalized) {
    return [];
  }

  const rawLines = normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const lines = rawLines.length
    ? rawLines
    : [normalized];

  const entries = [];

  for (const line of lines) {
    /*
     * Quebra somente quando uma nova sentença claramente começa.
     * Evita destruir textos que têm abreviações ou números.
     */
    const chunks = line
      .split(/(?<=\.)\s+(?=(?:LV\d|\[|When |During |At |Quando |Durante |No |Após |Flash|Burst|Confront|Ultimate))/i)
      .map((chunk) => chunk.trim())
      .filter(Boolean);

    for (const chunk of chunks) {
      const colonIndex = chunk.indexOf(":");

      if (colonIndex > 0 && colonIndex < 90) {
        const prefix = chunk.slice(0, colonIndex).trim();
        const body = chunk.slice(colonIndex + 1).trim();

        const looksLikeHeader =
          /\bLV\d|\[|When|During|At the|Quando|Durante|No início|No fim|Após|Flash|Burst|Confront|Curse|Immortality|Ultimate Trigger|Ultimate Triger|High Speed|Heavy Armor|Ice Wall/i.test(prefix);

        if (looksLikeHeader && body) {
          entries.push({
            badges: extractHeader(prefix),
            text: body
          });
          continue;
        }
      }

      entries.push({
        badges: [],
        text: chunk
      });
    }
  }

  return entries;
}


export default function EffectText({
  text,
  emptyText = "—"
}) {
  const entries = useMemo(
    () => splitIntoEntries(text),
    [text]
  );

  if (!entries.length) {
    return (
      <div className="selected-card-effect-panel empty">
        <span className="selected-card-effect-label">
          EFEITO
        </span>

        <p>
          {emptyText}
        </p>
      </div>
    );
  }

  return (
    <section className="selected-card-effect-panel">
      <span className="selected-card-effect-label">
        EFEITO
      </span>

      <div className="selected-card-effect-list">
        {entries.map((entry, index) => (
          <article
            className="selected-card-effect-entry"
            key={`${index}-${entry.text}`}
          >
            {entry.badges.length > 0 && (
              <div className="selected-card-effect-badges">
                {entry.badges.map((badge, badgeIndex) => (
                  <span
                    className={`selected-card-effect-badge ${classifyTerm(badge)}`}
                    key={`${badge}-${badgeIndex}`}
                  >
                    {badge}
                  </span>
                ))}
              </div>
            )}

            <p>
              {renderHighlightedText(entry.text)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
