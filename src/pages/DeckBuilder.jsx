import PointerTiltSurface from "../components/layout/PointerTiltSurface.jsx";
import EternalCinematicBackdrop from "../components/layout/EternalCinematicBackdrop.jsx";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CardTile from "../components/cards/CardTile.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import CardDetailsModal from "../components/cards/CardDetailsModal.jsx";
import { searchCards, cardIndex, catalogMeta, getRelatedCards } from "../services/cardRepository.js";
import { analyzeDeck, COLOR_ORDER, TYPE_ORDER } from "../services/deckAnalytics.js";
import { deleteDeck, getDecks, upsertDeck } from "../services/storage.js";
import { validateDeck } from "../game/state.js";
import { getCardName, resolveCardImage, resolveCardThumbnail } from "../game/cardAdapter.js";
import {
  ETERNAL_OFFICIAL_LIST_DATE,
  copyLimitForCard,
  eternalDeckNameKey,
  officialRestrictionSummary
} from "../game/eternalDeckRules.js";
import { useLanguage } from "../i18n.jsx";

import "../styles/deckbuilder/deckBuilderPagination.css";
import "../styles/deckbuilder/deckImportExport.css";
import "../styles/deckbuilder/deckBuilderV3.css";
import "../styles/deckbuilder/deckBuilderV398.css";
import "../styles/pages/eternalInterfaceV350.css";

const CARDS_PER_PAGE = 21;
const DECK_FILE_FORMAT = "battle-spirits-eternal-deck";
const DECK_FILE_VERSION = 1;

function getPaginationItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis-right", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, "ellipsis-left", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "ellipsis-left", currentPage - 1, currentPage, currentPage + 1, "ellipsis-right", totalPages];
}

function safeFileName(value) {
  const cleaned = String(value || "deck")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 80);

  return cleaned || "deck";
}

function normalizeImportedCards(entries) {
  const merged = new Map();
  let ignored = 0;

  for (const entry of Array.isArray(entries) ? entries : []) {
    const cardId = String(entry?.cardId || entry?.id || "").trim();
    const quantity = Math.floor(Number(entry?.quantity ?? entry?.qty ?? entry?.count ?? 0));

    if (!cardId || !Number.isFinite(quantity) || quantity <= 0) {
      ignored += 1;
      continue;
    }

    if (!cardIndex.has(cardId)) {
      ignored += 1;
      continue;
    }

    merged.set(cardId, (merged.get(cardId) || 0) + quantity);
  }

  return {
    cards: Array.from(merged.entries()).map(([cardId, quantity]) => ({ cardId, quantity })),
    ignored
  };
}

export default function DeckBuilder({ onBack, deckId = null }) {
  const { t, language } = useLanguage();
  const pt = language !== "en";

  const initialDecksRef = useRef(null);
  if (initialDecksRef.current === null) initialDecksRef.current = getDecks();
  const initialDecks = initialDecksRef.current;
  const requested = initialDecks.find((d) => d.id === deckId) || null;

  const [decks, setDecks] = useState(initialDecks);
  const [draft, setDraft] = useState(
    requested || {
      id: null,
      name: t("newDeck"),
      cards: [],
      coverCardId: null
    }
  );
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [type, setType] = useState("");
  const [color, setColor] = useState("");
  const [setCode, setSetCode] = useState("");
  const [rarity, setRarity] = useState("");
  const [family, setFamily] = useState("");
  const [costMin, setCostMin] = useState("");
  const [costMax, setCostMax] = useState("");
  const [reduction, setReduction] = useState("");
  const [symbol, setSymbol] = useState("");
  const [restriction, setRestriction] = useState("");
  const [sort, setSort] = useState("code");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [detailsCard, setDetailsCard] = useState(null);
  const [transferNotice, setTransferNotice] = useState(null);

  const browserRef = useRef(null);
  const importInputRef = useRef(null);

  const results = useMemo(
    () => searchCards(deferredQuery, {
      cardType: type || undefined,
      color: color || undefined,
      set: setCode || undefined,
      rarity: rarity || undefined,
      family: family || undefined,
      costMin,
      costMax,
      reduction: reduction || undefined,
      symbol: symbol || undefined,
      restriction: restriction || undefined,
      sort
    }),
    [deferredQuery, type, color, setCode, rarity, family, costMin, costMax, reduction, symbol, restriction, sort]
  );

  const totalPages = Math.max(1, Math.ceil(results.length / CARDS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageStartIndex = (currentPage - 1) * CARDS_PER_PAGE;

  const pageResults = useMemo(
    () => results.slice(pageStartIndex, pageStartIndex + CARDS_PER_PAGE),
    [results, pageStartIndex]
  );

  const paginationItems = useMemo(
    () => getPaginationItems(currentPage, totalPages),
    [currentPage, totalPages]
  );

  const rangeStart = results.length ? pageStartIndex + 1 : 0;
  const rangeEnd = results.length ? Math.min(pageStartIndex + CARDS_PER_PAGE, results.length) : 0;

  useEffect(() => {
    const nextStart = currentPage * CARDS_PER_PAGE;
    const nextCards = results.slice(nextStart, nextStart + CARDS_PER_PAGE);
    if (!nextCards.length) return undefined;

    const prefetch = () => {
      nextCards.forEach((card) => {
        const image = new Image();
        image.decoding = "async";
        image.src = resolveCardThumbnail(card);
      });
    };

    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(prefetch, { timeout: 2500 });
      return () => window.cancelIdleCallback?.(id);
    }

    const id = window.setTimeout(prefetch, 900);
    return () => window.clearTimeout(id);
  }, [results, currentPage]);

  const validation = useMemo(
    () => validateDeck(draft.cards, cardIndex, { regulation: "eternal" }),
    [draft.cards]
  );
  const officialValidation = useMemo(
    () => validateDeck(draft.cards, cardIndex, { regulation: "official" }),
    [draft.cards]
  );

  const deckQuantityById = useMemo(() => {
    const map = new Map();
    for (const entry of draft.cards) {
      const id = entry.cardId || entry.id;
      if (!id) continue;
      map.set(id, Number(entry.quantity || 0));
    }
    return map;
  }, [draft.cards]);

  const deckCardIds = useMemo(
    () => draft.cards
      .filter((e) => Number(e.quantity || 0) > 0)
      .map((e) => e.cardId || e.id),
    [draft.cards]
  );

  const uniqueCards = deckCardIds.length;
  const coverCard = useMemo(
    () => cardIndex.get(draft.coverCardId || draft.cards[0]?.cardId || draft.cards[0]?.id || ""),
    [draft.coverCardId, draft.cards]
  );
  const hasDeck = draft.cards.length > 0;
  const analytics = useMemo(() => analyzeDeck(draft.cards, cardIndex), [draft.cards]);
  const maxCurve = useMemo(() => Math.max(1, ...analytics.costCurve), [analytics.costCurve]);
  const relatedCards = useMemo(() => getRelatedCards(detailsCard, { limit: 6 }), [detailsCard]);
  const activeAdvancedFilters = [setCode, rarity, family, costMin, costMax, reduction, symbol, restriction].filter((value) => String(value ?? "").trim() !== "").length;

  function qty(cardId) {
    return deckQuantityById.get(cardId) || 0;
  }

  function setQty(cardId, nextQty) {
    const card = cardIndex.get(cardId);
    if (!card) return;

    const sameNameCount = draft.cards.reduce((sum, e) => {
      const c = cardIndex.get(e.cardId || e.id);
      return eternalDeckNameKey(c) === eternalDeckNameKey(card)
        ? sum + Number(e.quantity || 0)
        : sum;
    }, 0) - qty(cardId);

    const cardLimit = copyLimitForCard(card, { official: false, fallbackMaxSameName: 3 });
    const allowed = Math.max(0, Math.min(cardLimit - sameNameCount, nextQty));

    setDraft((d) => {
      const cards = [
        ...d.cards.filter((e) => (e.cardId || e.id) !== cardId),
        ...(allowed ? [{ cardId, quantity: allowed }] : [])
      ];

      const coverCardId = allowed === 0 && d.coverCardId === cardId ? cards[0]?.cardId || null : d.coverCardId;
      return { ...d, cards, coverCardId };
    });
  }

  function save() {
    const id = upsertDeck({
      ...draft,
      coverCardId: draft.coverCardId || draft.cards[0]?.cardId || null
    });

    const next = getDecks();
    setDecks(next);
    setDraft(next.find((d) => d.id === id));
    setTransferNotice({ type: "success", text: pt ? "Deck salvo." : "Deck saved." });
  }

  function fresh() {
    setDraft({ id: null, name: t("newDeck"), cards: [], coverCardId: null });
    setTransferNotice(null);
  }

  function remove() {
    if (!draft.id) return;
    deleteDeck(draft.id);
    setDecks(getDecks());
    fresh();
  }

  function exportDeck() {
    if (!draft.cards.length) {
      setTransferNotice({
        type: "error",
        text: pt ? "Adicione pelo menos uma carta antes de exportar." : "Add at least one card before exporting."
      });
      return;
    }

    const payload = {
      format: DECK_FILE_FORMAT,
      version: DECK_FILE_VERSION,
      simulator: "Battle Spirits Eternal Simulator",
      simulatorVersion: "3.9.9",
      exportedAt: new Date().toISOString(),
      deck: {
        name: String(draft.name || "").trim() || (pt ? "Deck Importado" : "Imported Deck"),
        coverCardId: draft.coverCardId || draft.cards[0]?.cardId || null,
        cards: draft.cards.map((entry) => ({
          cardId: entry.cardId || entry.id,
          quantity: Number(entry.quantity || 0)
        }))
      }
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeFileName(draft.name)}.bsdeck.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);

    setTransferNotice({ type: "success", text: pt ? "Deck exportado com sucesso." : "Deck exported successfully." });
  }

  async function importDeckFile(file) {
    if (!file) return;

    try {
      const rawText = await file.text();
      const parsed = JSON.parse(rawText);
      const imported = parsed?.deck && (parsed.format === DECK_FILE_FORMAT || parsed.deck.cards) ? parsed.deck : parsed;

      if (!imported || !Array.isArray(imported.cards)) {
        throw new Error(pt ? "Este arquivo não contém um deck válido." : "This file does not contain a valid deck.");
      }

      const { cards, ignored } = normalizeImportedCards(imported.cards);

      if (!cards.length) {
        throw new Error(pt ? "Nenhuma carta compatível foi encontrada neste arquivo." : "No compatible cards were found in this file.");
      }

      const importedCoverId = String(imported.coverCardId || "").trim();
      const coverCardId = importedCoverId && cards.some((entry) => entry.cardId === importedCoverId)
        ? importedCoverId
        : cards[0]?.cardId || null;

      const name = String(imported.name || "").trim() || (pt ? "Deck Importado" : "Imported Deck");

      setDraft({ id: null, name, cards, coverCardId });
      setQuery("");
      setType("");
      setColor("");
      setSetCode("");
      setRarity("");
      setFamily("");
      setCostMin("");
      setCostMax("");
      setReduction("");
      setSymbol("");
      setRestriction("");
      setPage(1);

      setTransferNotice({
        type: ignored > 0 ? "warning" : "success",
        text: pt
          ? (ignored > 0
            ? `Deck importado. ${ignored} entrada${ignored === 1 ? "" : "s"} inválida${ignored === 1 ? "" : "s"} ou sem suporte ${ignored === 1 ? "foi ignorada" : "foram ignoradas"}. Revise e clique em Salvar.`
            : "Deck importado. Revise e clique em Salvar.")
          : (ignored > 0
            ? `Deck imported. ${ignored} unsupported or invalid entr${ignored === 1 ? "y was" : "ies were"} ignored. Review it and click Save.`
            : "Deck imported. Review it and click Save.")
      });
    } catch (error) {
      console.error("Falha ao importar deck:", error);
      setTransferNotice({
        type: "error",
        text: pt ? "Não foi possível importar este deck. Verifique o arquivo e tente novamente." : "Could not import this deck. Check the file and try again."
      });
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  function changeQuery(value) {
    setQuery(value);
    setPage(1);
  }

  function changeType(value) {
    setType(value);
    setPage(1);
  }

  function changeColor(value) {
    setColor(value);
    setPage(1);
  }

  function changeFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  function clearFilters() {
    setQuery("");
    setType("");
    setColor("");
    setSetCode("");
    setRarity("");
    setFamily("");
    setCostMin("");
    setCostMax("");
    setReduction("");
    setSymbol("");
    setRestriction("");
    setSort("code");
    setPage(1);
  }

  function goToPage(nextPage) {
    const boundedPage = Math.max(1, Math.min(totalPages, nextPage));
    setPage(boundedPage);
    requestAnimationFrame(() => {
      browserRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  return (
    <main className="deck-page deck-builder-v3-page eternal-page eternal-builder-page">
      <EternalCinematicBackdrop compact />
      <header className="page-header deck-builder-v3-topbar">
        <button className="ghost deck-builder-v3-back eternal-menu-action" onClick={onBack}>
          {t("back")}
        </button>

        <div className="deck-builder-v3-title">
          <span className="eyebrow">{t("deckBuilder")}</span>
          <h1>{t("eternalFormat")}</h1>
          <p>{pt ? "Monte, edite e organize seus decks com mais clareza." : "Build, edit and organize your decks more clearly."}</p>
        </div>

        <div className="row-actions deck-builder-actions deck-builder-v3-actions">
          <input
            ref={importInputRef}
            className="deck-import-input"
            hidden
            type="file"
            accept=".json,.bsdeck.json,application/json"
            onChange={(event) => importDeckFile(event.target.files?.[0])}
          />

          <button className="ghost deck-transfer-btn" onClick={() => importInputRef.current?.click()}>
            {pt ? "Importar Deck" : "Import Deck"}
          </button>

          <button className="ghost deck-transfer-btn" disabled={!draft.cards.length} onClick={exportDeck}>
            {pt ? "Exportar Deck" : "Export Deck"}
          </button>

          <button className="ghost eternal-menu-action compact" onClick={fresh}>{t("newDeck")}</button>
          <button className="primary-btn eternal-menu-action compact active" onClick={save}>{t("save")}</button>
        </div>
      </header>

      {transferNotice && (
        <div className={`deck-transfer-notice ${transferNotice.type}`}>
          <span>{transferNotice.text}</span>
          <button type="button" aria-label={pt ? "Fechar" : "Close"} onClick={() => setTransferNotice(null)}>×</button>
        </div>
      )}

      <div className="deck-layout deck-builder-v3-layout">
        <aside className="panel deck-sidebar deck-builder-v3-sidebar">
          <div className="deck-builder-v3-cover-panel">
            <PointerTiltSurface className="deck-builder-v3-cover-tilt" maxTilt={4.4}>
              <div className="deck-builder-v3-cover-frame">
              {coverCard ? (
                <img
                  src={resolveCardThumbnail(coverCard)}
                  alt={getCardName(coverCard)}
                  draggable="false"
                  loading="lazy"
                  decoding="async"
                  fetchPriority="low"
                  onError={(event) => {
                    if (event.currentTarget.dataset.fullFallback === "true") return;
                    event.currentTarget.dataset.fullFallback = "true";
                    event.currentTarget.src = resolveCardImage(coverCard);
                  }}
                />
              ) : (
                <div className="deck-builder-v3-cover-empty">
                  <span>◇</span>
                  <b>{pt ? "Sem capa" : "No cover"}</b>
                  <small>{pt ? "Adicione cartas para escolher uma capa." : "Add cards to choose a cover."}</small>
                </div>
              )}
              </div>
            </PointerTiltSurface>

            <div className="deck-builder-v3-cover-copy">
              <span>{pt ? "Deck atual" : "Current deck"}</span>
              <strong>{String(draft.name || "").trim() || t("newDeck")}</strong>
              <small>{coverCard ? getCardName(coverCard) : (pt ? "Nenhuma carta de capa definida" : "No cover card selected")}</small>
            </div>
          </div>

          <div className="deck-builder-v3-summary">
            <div>
              <strong>{validation.size}</strong>
              <span>{t("cards")}</span>
            </div>
            <div>
              <strong>{uniqueCards}</strong>
              <span>{pt ? "Únicas" : "Unique"}</span>
            </div>
            <div className={validation.ok ? "ok" : "warn"}>
              <strong>{validation.ok ? (pt ? "OK" : "OK") : (pt ? "REV" : "REV")}</strong>
              <span>{validation.ok ? t("validDeck") : (pt ? "Revisar" : "Review")}</span>
            </div>
          </div>

          <section className="deck-builder-v3-section">
            <div className="deck-builder-v3-section-head">
              <h3>{pt ? "Configuração do deck" : "Deck setup"}</h3>
            </div>

            <label>
              {t("name")}
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>

            <label>
              {t("deckCover")}
              <select
                value={draft.coverCardId || ""}
                onChange={(e) => setDraft({ ...draft, coverCardId: e.target.value || null })}
              >
                <option value="">—</option>
                {deckCardIds.map((id) => (
                  <option key={id} value={id}>{getCardName(cardIndex.get(id))}</option>
                ))}
              </select>
            </label>

            <div className="deck-validation deck-builder-v3-validation">
              <strong>{validation.size} {t("cards")}</strong>
              {validation.ok ? (
                <span className="success-text">✓ Válido no formato Eternal</span>
              ) : (
                validation.errors.map((e) => (
                  <span className="error-text" key={e}>{e}</span>
                ))
              )}
              {validation.ok && (
                <div className={`deck-regulation-status ${officialValidation.ok ? "is-valid" : "is-warning"}`}>
                  <b>{officialValidation.ok ? "✓ Apto ao regulamento oficial" : "Regulamento oficial · revisar"}</b>
                  {!officialValidation.ok && (
                    <>
                      <small>Lista vigente em {ETERNAL_OFFICIAL_LIST_DATE.split("-").reverse().join("/")}</small>
                      {officialValidation.errors.map((error) => <span key={error}>{error}</span>)}
                    </>
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="deck-builder-v3-section deck-builder-v398-analytics">
            <div className="deck-builder-v3-section-head deck-builder-v3-section-head-inline">
              <h3>{pt ? "Análise do deck" : "Deck analysis"}</h3>
              <small>{analytics.averageCost.toFixed(1)} {pt ? "custo médio" : "avg cost"}</small>
            </div>

            <div className="deck-v398-curve" aria-label={pt ? "Curva de custo" : "Cost curve"}>
              {analytics.costCurve.map((count, index) => (
                <div className="deck-v398-curve-col" key={index}>
                  <span className="deck-v398-curve-value">{count}</span>
                  <i style={{ height: `${Math.max(4, (count / maxCurve) * 46)}px` }} />
                  <b>{index === 7 ? "7+" : index}</b>
                </div>
              ))}
            </div>

            <div className="deck-v398-breakdown">
              <div>
                <span>{pt ? "Cores" : "Colors"}</span>
                <div className="deck-v398-color-row">
                  {COLOR_ORDER.filter((entry) => analytics.colors[entry] > 0).map((entry) => (
                    <i key={entry} className={`deck-v398-color-dot ${entry}`} title={`${entry}: ${analytics.colors[entry]}`}>
                      {analytics.colors[entry]}
                    </i>
                  ))}
                  {!analytics.dominantColors.length && <small>—</small>}
                </div>
              </div>
              <div>
                <span>{pt ? "Tipos" : "Types"}</span>
                <div className="deck-v398-type-row">
                  {TYPE_ORDER.filter((entry) => analytics.types[entry] > 0).map((entry) => (
                    <small key={entry}><b>{analytics.types[entry]}</b> {entry}</small>
                  ))}
                  {!analytics.total && <small>—</small>}
                </div>
              </div>
            </div>
          </section>

          <section className="deck-builder-v3-section">
            <div className="deck-builder-v3-section-head deck-builder-v3-section-head-inline">
              <h3>{t("myDecks")}</h3>
              <small>{decks.length}</small>
            </div>

            <div className="saved-decks deck-builder-v3-saved-decks">
              {decks.length ? decks.map((d) => (
                <button
                  key={d.id}
                  className={d.id === draft.id ? "active" : ""}
                  onClick={() => setDraft(d)}
                >
                  <span>
                    <b>{d.name}</b>
                    <small>{d.cards.reduce((s, e) => s + Number(e.quantity || 0), 0)} {t("cards")}</small>
                  </span>
                  <em>{d.cards.length}</em>
                </button>
              )) : (
                <div className="deck-builder-v3-empty-list">{pt ? "Nenhum deck salvo ainda." : "No saved decks yet."}</div>
              )}
            </div>

            {draft.id && (
              <button className="danger ghost deck-builder-v3-delete" onClick={remove}>
                {t("deleteDeck")}
              </button>
            )}
          </section>

          <section className="deck-builder-v3-section deck-builder-v3-current-list-section">
            <div className="deck-builder-v3-section-head deck-builder-v3-section-head-inline">
              <h3>{t("currentList")}</h3>
              <small>{validation.size}</small>
            </div>

            <div className="deck-list deck-builder-v3-current-list">
              {hasDeck ? draft.cards.map((e) => {
                const c = cardIndex.get(e.cardId || e.id);
                return (
                  <button
                    className={`deck-list-row ${draft.coverCardId === (e.cardId || e.id) ? "cover" : ""}`}
                    key={e.cardId || e.id}
                    onClick={() => setDraft({ ...draft, coverCardId: e.cardId || e.id })}
                  >
                    <span>{getCardName(c)}</span>
                    <b>x{e.quantity}</b>
                  </button>
                );
              }) : (
                <div className="deck-builder-v3-empty-list">{pt ? "Adicione cartas para começar seu deck." : "Add cards to start your deck."}</div>
              )}
            </div>
          </section>
        </aside>

        <section ref={browserRef} className="panel card-browser deck-builder-v3-browser">
          <div className="deck-builder-v3-browser-toolbar deck-v398-browser-toolbar">
            <div className="deck-v398-search-row">
              <label className="deck-v398-search">
                <span className="sr-only">{t("searchCards")}</span>
                <input
                  placeholder={pt ? "Buscar por nome, código, família ou efeito..." : "Search name, code, family or effect..."}
                  value={query}
                  onChange={(e) => changeQuery(e.target.value)}
                />
              </label>

              <select value={type} onChange={(e) => changeType(e.target.value)} aria-label={pt ? "Tipo" : "Type"}>
                <option value="">{t("allTypes")}</option>
                <option value="spirit">Spirit</option>
                <option value="brave">Brave</option>
                <option value="ultimate">Ultimate</option>
                <option value="nexus">Nexus</option>
                <option value="magic">Magic</option>
              </select>

              <select value={color} onChange={(e) => changeColor(e.target.value)} aria-label={pt ? "Cor" : "Color"}>
                <option value="">{t("allColors")}</option>
                {["red", "purple", "green", "white", "yellow", "blue"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <button
                type="button"
                className={`ghost deck-v398-filter-toggle ${advancedOpen ? "active" : ""}`}
                onClick={() => setAdvancedOpen((value) => !value)}
                aria-expanded={advancedOpen}
              >
                {pt ? "Filtros" : "Filters"}
                {activeAdvancedFilters > 0 && <b>{activeAdvancedFilters}</b>}
              </button>
            </div>

            {advancedOpen && (
              <div className="deck-v398-advanced">
                <select value={setCode} onChange={(e) => changeFilter(setSetCode, e.target.value)}>
                  <option value="">{pt ? "Todos os sets" : "All sets"}</option>
                  {catalogMeta.sets.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
                <select value={rarity} onChange={(e) => changeFilter(setRarity, e.target.value)}>
                  <option value="">{pt ? "Todas as raridades" : "All rarities"}</option>
                  {catalogMeta.rarities.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
                <select value={family} onChange={(e) => changeFilter(setFamily, e.target.value)}>
                  <option value="">{pt ? "Todas as famílias" : "All families"}</option>
                  {catalogMeta.families.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
                <select value={reduction} onChange={(e) => changeFilter(setReduction, e.target.value)}>
                  <option value="">{pt ? "Qualquer redução" : "Any reduction"}</option>
                  {catalogMeta.reductions.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
                <select value={symbol} onChange={(e) => changeFilter(setSymbol, e.target.value)}>
                  <option value="">{pt ? "Qualquer símbolo" : "Any symbol"}</option>
                  {catalogMeta.symbols.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
                <select value={restriction} onChange={(e) => changeFilter(setRestriction, e.target.value)}>
                  <option value="">{pt ? "Qualquer legalidade" : "Any legality"}</option>
                  <option value="clean">{pt ? "Sem restrição" : "Unrestricted"}</option>
                  <option value="restricted">{pt ? "Proibidas / limitadas" : "Banned / limited"}</option>
                  <option value="banned">{pt ? "Somente proibidas" : "Banned only"}</option>
                </select>
                <div className="deck-v398-cost-range">
                  <span>{pt ? "Custo" : "Cost"}</span>
                  <input type="number" min="0" max="99" placeholder="Min" value={costMin} onChange={(e) => changeFilter(setCostMin, e.target.value)} />
                  <em>—</em>
                  <input type="number" min="0" max="99" placeholder="Max" value={costMax} onChange={(e) => changeFilter(setCostMax, e.target.value)} />
                </div>
                <select value={sort} onChange={(e) => changeFilter(setSort, e.target.value)}>
                  <option value="code">{pt ? "Ordenar por código" : "Sort by code"}</option>
                  <option value="name">{pt ? "Ordenar por nome" : "Sort by name"}</option>
                  <option value="cost">{pt ? "Ordenar por custo" : "Sort by cost"}</option>
                  <option value="rarity">{pt ? "Ordenar por raridade" : "Sort by rarity"}</option>
                </select>
                <button type="button" className="ghost deck-v398-clear" onClick={clearFilters}>{pt ? "Limpar filtros" : "Clear filters"}</button>
              </div>
            )}

            <div className="deck-browser-meta deck-builder-v3-meta">
              <span>
                {pt ? (
                  <>Mostrando <b>{rangeStart}–{rangeEnd}</b> de <b>{results.length}</b> cartas</>
                ) : (
                  <>Showing <b>{rangeStart}–{rangeEnd}</b> of <b>{results.length}</b> cards</>
                )}
              </span>
              <span>{pt ? "Catálogo" : "Catalog"}: <b>{cardIndex.size}</b> · {pt ? "Página" : "Page"} <b>{currentPage}</b> / <b>{totalPages}</b></span>
            </div>
          </div>

          {!results.length ? (
            <EmptyState title={t("noCardsFound")}>{language === "en" ? "Try changing the filters or search." : "Tente alterar os filtros ou a busca."}</EmptyState>
          ) : (
            <>
              <div className="card-grid deck-builder-v3-grid">
                {pageResults.map((card) => (
                  <div className="builder-card deck-builder-v3-card" key={card.id}>
                    {officialRestrictionSummary(card) && (
                      <span className={`deck-official-restriction ${officialRestrictionSummary(card) === "Proibida" ? "is-banned" : "is-limited"}`}>
                        {officialRestrictionSummary(card)}
                      </span>
                    )}
                    <CardTile card={card} imageVariant="thumbnail" loading="lazy" fetchPriority="low" onClick={() => setDetailsCard(card)} />
                    <div className="deck-v398-card-caption">
                      <strong title={getCardName(card)}>{getCardName(card)}</strong>
                      <span>{card.id} · {card.rarity || "—"} · {pt ? "Custo" : "Cost"} {card.cost ?? 0}</span>
                    </div>

                    <div className="qty-control deck-builder-v3-qty-control">
                      <button onClick={() => setQty(card.id, qty(card.id) - 1)}>-</button>
                      <b>{qty(card.id)}</b>
                      <button onClick={() => setQty(card.id, qty(card.id) + 1)}>+</button>
                    </div>

                    {qty(card.id) > 0 && (
                      <button
                        className={`cover-card-btn ${draft.coverCardId === card.id ? "active" : ""}`}
                        onClick={() => setDraft({ ...draft, coverCardId: card.id })}
                      >
                        ★ {t("deckCover")}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <nav className="deck-pagination deck-builder-v3-pagination" aria-label={pt ? "Páginas de cartas" : "Card pages"}>
                  <button
                    className="deck-pagination-arrow"
                    disabled={currentPage === 1}
                    onClick={() => goToPage(currentPage - 1)}
                  >
                    ← <span>{pt ? "Anterior" : "Previous"}</span>
                  </button>

                  <div className="deck-pagination-pages">
                    {paginationItems.map((item, index) => {
                      if (typeof item === "string") {
                        return <span className="deck-pagination-ellipsis" key={`${item}-${index}`}>…</span>;
                      }
                      return (
                        <button
                          key={item}
                          className={`deck-pagination-page ${item === currentPage ? "active" : ""}`}
                          aria-current={item === currentPage ? "page" : undefined}
                          onClick={() => goToPage(item)}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    className="deck-pagination-arrow"
                    disabled={currentPage === totalPages}
                    onClick={() => goToPage(currentPage + 1)}
                  >
                    <span>{pt ? "Próxima" : "Next"}</span> →
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>

      {detailsCard && typeof document !== "undefined" && createPortal(
        <CardDetailsModal
          card={detailsCard}
          initialLanguage={language === "en" ? "en" : "ptBR"}
          relatedCards={relatedCards}
          onSelectRelated={setDetailsCard}
          onClose={() => setDetailsCard(null)}
        />,
        document.body
      )}
    </main>
  );
}
