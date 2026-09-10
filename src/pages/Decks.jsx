import { useMemo, useState } from "react";

import EmptyState from "../components/EmptyState.jsx";

import {
  getDecks,
  upsertDeck
} from "../services/storage.js";

import {
  cards,
  cardIndex
} from "../services/cardRepository.js";

import {
  getCardName,
  resolveCardImage
} from "../game/cardAdapter.js";

import {
  validateDeck
} from "../game/state.js";

import {
  PREBUILT_DECKS,
  buildPrebuiltDeck
} from "../data/prebuiltDecks.js";

import {
  useLanguage
} from "../i18n.jsx";

import "../styles/deckLibrary.css";
import "../styles/prebuiltDecks.css";


const COLOR_ACCENTS = {
  red: "#e45b63",
  purple: "#a56ce4",
  green: "#55c987",
  white: "#d7e4f2",
  yellow: "#f4bd4b",
  blue: "#68a8ff",
  ultimate: "#f4bd4b"
};


function deckSize(deck) {
  return (
    deck?.cards?.reduce(
      (sum, entry) =>
        sum +
        Number(
          entry.quantity ||
          entry.qty ||
          entry.count ||
          0
        ),
      0
    ) || 0
  );
}


function uniqueCards(deck) {
  return (
    deck?.cards?.filter(
      (entry) =>
        Number(
          entry.quantity ||
          entry.qty ||
          entry.count ||
          0
        ) > 0
    ).length || 0
  );
}


function findDeckCover(deck) {
  if (!deck) {
    return null;
  }

  if (deck.coverCardId) {
    const selected =
      cardIndex.get(
        String(
          deck.coverCardId
        )
      );

    if (selected) {
      return selected;
    }
  }

  for (
    const entry of
      deck.cards || []
  ) {
    const quantity =
      Number(
        entry.quantity ||
        entry.qty ||
        entry.count ||
        0
      );

    if (quantity <= 0) {
      continue;
    }

    const id =
      String(
        entry.cardId ||
        entry.id ||
        ""
      );

    const card =
      cardIndex.get(
        id
      );

    if (card) {
      return card;
    }
  }

  return null;
}


function getDeckAccent(card) {
  const color =
    card?.colors?.[0] ||
    card?.color ||
    card?.symbols?.[0] ||
    "";

  return (
    COLOR_ACCENTS[
      String(
        color
      ).toLowerCase()
    ] ||
    "#68a8ff"
  );
}


function safeCoverImage(card) {
  if (!card) {
    return "./images/card-back.png";
  }

  const resolved =
    resolveCardImage(
      card
    );

  return (
    resolved ||
    "./images/card-back.png"
  );
}


function CoverImage({
  card,
  name,
  className = ""
}) {
  const image =
    safeCoverImage(
      card
    );

  function handleError(
    event
  ) {
    const img =
      event.currentTarget;

    if (
      img.dataset.fallback ===
      "true"
    ) {
      return;
    }

    img.dataset.fallback =
      "true";

    img.src =
      "./images/card-back.png";
  }

  return (
    <img
      className={className}
      src={image}
      alt={
        name ||
        "Deck cover"
      }
      draggable="false"
      onError={
        handleError
      }
    />
  );
}


function DeckLibraryCard({
  deck,
  onEdit,
  language
}) {
  const cover =
    findDeckCover(
      deck
    );

  const accent =
    getDeckAccent(
      cover
    );

  const validation =
    validateDeck(
      deck.cards || [],
      cardIndex
    );

  const size =
    deckSize(
      deck
    );

  const unique =
    uniqueCards(
      deck
    );

  const coverName =
    cover
      ? getCardName(
          cover
        )
      : (
        language === "en"
          ? "No cover"
          : "Sem capa"
      );

  const updatedAt =
    deck.updatedAt
      ? new Date(
          deck.updatedAt
        )
      : null;

  const updatedLabel =
    updatedAt &&
    !Number.isNaN(
      updatedAt.getTime()
    )
      ? updatedAt.toLocaleDateString(
          language === "en"
            ? "en-US"
            : "pt-BR",
          {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
          }
        )
      : "—";


  return (
    <article
      className="deck-library-v2-card"
      style={{
        "--deck-accent":
          accent
      }}
    >

      <button
        type="button"
        className="deck-library-v2-open"
        onClick={() =>
          onEdit(
            deck.id
          )
        }
        aria-label={
          language === "en"
            ? `Edit ${deck.name}`
            : `Editar ${deck.name}`
        }
      >

        <div className="deck-library-v2-cover">

          <div className="deck-library-v2-card-image">

            <CoverImage
              card={cover}
              name={coverName}
            />

            <span
              className="deck-library-v2-shine"
              aria-hidden="true"
            />

          </div>


          <span className="deck-library-v2-cover-label">
            DECK COVER
          </span>

        </div>


        <div className="deck-library-v2-content">

          <header className="deck-library-v2-card-header">

            <div>
              <span className="eyebrow">
                {size}{" "}
                {language === "en"
                  ? "CARDS"
                  : "CARTAS"}
              </span>

              <h2>
                {deck.name}
              </h2>
            </div>


            <div
              className={
                `deck-library-v2-status ${
                  validation.ok
                    ? "valid"
                    : "invalid"
                }`
              }
            >
              <i />

              <span>
                {validation.ok
                  ? (
                    language === "en"
                      ? "VALID"
                      : "VÁLIDO"
                  )
                  : (
                    language === "en"
                      ? "REVIEW"
                      : "REVISAR"
                  )}
              </span>
            </div>

          </header>


          <p className="deck-library-v2-cover-name">
            <span>
              {language === "en"
                ? "Cover"
                : "Capa"}
            </span>

            <strong
              title={
                coverName
              }
            >
              {coverName}
            </strong>
          </p>


          <div className="deck-library-v2-meta">

            <div>
              <span>
                {language === "en"
                  ? "UNIQUE"
                  : "ÚNICAS"}
              </span>

              <strong>
                {unique}
              </strong>
            </div>


            <div>
              <span>
                TOTAL
              </span>

              <strong>
                {size}
              </strong>
            </div>


            <div>
              <span>
                {language === "en"
                  ? "UPDATED"
                  : "ATUALIZADO"}
              </span>

              <strong>
                {updatedLabel}
              </strong>
            </div>

          </div>


          <footer className="deck-library-v2-footer">

            <span>
              {language === "en"
                ? "OPEN DECK"
                : "ABRIR DECK"}
            </span>

            <b aria-hidden="true">
              →
            </b>

          </footer>

        </div>

      </button>

    </article>
  );
}


function CreateDeckOverlay({
  language,
  builtTemplates,
  onClose,
  onEmpty,
  onCreatePrebuilt
}) {
  const pt =
    language !== "en";

  const [step, setStep] =
    useState("choice");

  const [selectedId, setSelectedId] =
    useState(
      builtTemplates[0]?.template?.id ||
      ""
    );

  const [error, setError] =
    useState("");

  const selected =
    builtTemplates.find(
      (item) =>
        item.template.id ===
        selectedId
    ) ||
    builtTemplates[0] ||
    null;


  function createSelected() {
    setError("");

    if (!selected?.ready) {
      setError(
        pt
          ? "Este deck ainda não está completo na database atual."
          : "This deck is not complete in the current database yet."
      );
      return;
    }

    onCreatePrebuilt(
      selected
    );
  }


  return (
    <div
      className="deck-create-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={
        pt
          ? "Criar deck"
          : "Create deck"
      }
    >
      <div
        className={
          `deck-create-shell ${
            step === "prebuilt"
              ? "prebuilt-mode"
              : ""
          }`
        }
      >
        <header className="deck-create-header">
          <div>
            <span className="eyebrow">
              {pt
                ? "NOVO DECK"
                : "NEW DECK"}
            </span>

            <h2>
              {step === "choice"
                ? (
                  pt
                    ? "Como você quer começar?"
                    : "How do you want to start?"
                )
                : (
                  pt
                    ? "Escolha um deck pronto"
                    : "Choose a prebuilt deck"
                )}
            </h2>

            <p>
              {step === "choice"
                ? (
                  pt
                    ? "Comece do zero ou use uma lista pré-construída como ponto de partida."
                    : "Start from scratch or use a prebuilt list as your starting point."
                )
                : (
                  pt
                    ? "O deck será copiado para Meus Decks e poderá ser editado normalmente."
                    : "The deck will be copied to My Decks and can be edited normally."
                )}
            </p>
          </div>

          <button
            type="button"
            className="ghost deck-create-close"
            onClick={onClose}
            aria-label={
              pt
                ? "Fechar"
                : "Close"
            }
          >
            ×
          </button>
        </header>


        {step === "choice" ? (
          <div className="deck-create-choice-grid">
            <button
              type="button"
              className="deck-create-option empty"
              onClick={onEmpty}
            >
              <span className="deck-create-option-code">
                EMPTY DECK
              </span>

              <div className="deck-create-option-mark">
                +
              </div>

              <strong>
                {pt
                  ? "Construir do Zero"
                  : "Build from Scratch"}
              </strong>

              <p>
                {pt
                  ? "Abra o Deck Builder com uma lista vazia e monte seu próprio deck."
                  : "Open Deck Builder with an empty list and build your own deck."}
              </p>

              <span className="deck-create-option-action">
                {pt
                  ? "ABRIR DECK BUILDER"
                  : "OPEN DECK BUILDER"}
                <b>→</b>
              </span>
            </button>


            <button
              type="button"
              className="deck-create-option prebuilt"
              onClick={() =>
                setStep(
                  "prebuilt"
                )
              }
            >
              <span className="deck-create-option-code">
                PREBUILT DECKS
              </span>

              <div className="deck-create-option-stack" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>

              <strong>
                {pt
                  ? "Escolher um Pronto"
                  : "Choose a Prebuilt Deck"}
              </strong>

              <p>
                {pt
                  ? "Experimente decks como SD10, SD17, SD19 e SD20 sem precisar montar a lista manualmente."
                  : "Try decks such as SD10, SD17, SD19 and SD20 without building the list manually."}
              </p>

              <span className="deck-create-option-action">
                {pt
                  ? "VER DECKS PRONTOS"
                  : "VIEW PREBUILT DECKS"}
                <b>→</b>
              </span>
            </button>
          </div>
        ) : (
          <div className="prebuilt-browser">
            <aside className="prebuilt-list-panel">
              <button
                type="button"
                className="ghost prebuilt-back-button"
                onClick={() => {
                  setError("");
                  setStep("choice");
                }}
              >
                ← {pt
                  ? "Voltar"
                  : "Back"}
              </button>

              <div className="prebuilt-list-heading">
                <span className="eyebrow">
                  {pt
                    ? "DECKS DISPONÍVEIS"
                    : "AVAILABLE DECKS"}
                </span>
                <strong>
                  {builtTemplates.length}
                </strong>
              </div>

              <div className="prebuilt-template-list">
                {builtTemplates.map(
                  (item) => {
                    const template =
                      item.template;

                    return (
                      <button
                        key={template.id}
                        type="button"
                        className={
                          `prebuilt-template-button ${
                            selected?.template?.id ===
                            template.id
                              ? "active"
                              : ""
                          }`
                        }
                        style={{
                          "--prebuilt-accent":
                            template.accent
                        }}
                        onClick={() => {
                          setError("");
                          setSelectedId(
                            template.id
                          );
                        }}
                      >
                        <span className="prebuilt-template-thumb">
                          <CoverImage
                            card={item.cover}
                            name={template.title}
                          />
                        </span>

                        <span className="prebuilt-template-copy">
                          <small>
                            {template.setCode}
                          </small>
                          <strong>
                            {template.title}
                          </strong>
                          <em>
                            {item.totalCards}{" "}
                            {pt
                              ? "cartas"
                              : "cards"}
                          </em>
                        </span>

                        <b aria-hidden="true">
                          →
                        </b>
                      </button>
                    );
                  }
                )}
              </div>
            </aside>


            {selected && (
              <section
                className="prebuilt-detail"
                style={{
                  "--prebuilt-accent":
                    selected.template.accent
                }}
              >
                <div className="prebuilt-detail-hero">
                  <div className="prebuilt-detail-cover">
                    <CoverImage
                      card={selected.cover}
                      name={selected.template.title}
                    />
                  </div>

                  <div className="prebuilt-detail-copy">
                    <span className="prebuilt-set-code">
                      {selected.template.setCode}
                    </span>

                    <h3>
                      {selected.template.title}
                    </h3>

                    <p>
                      {pt
                        ? selected.template.subtitlePT
                        : selected.template.subtitleEN}
                    </p>

                    <div className="prebuilt-detail-stats">
                      <div>
                        <span>
                          {pt
                            ? "COR"
                            : "COLOR"}
                        </span>
                        <strong>
                          {pt
                            ? selected.template.colorLabelPT
                            : selected.template.colorLabelEN}
                        </strong>
                      </div>

                      <div>
                        <span>
                          {pt
                            ? "NÍVEL"
                            : "LEVEL"}
                        </span>
                        <strong>
                          {pt
                            ? selected.template.difficultyPT
                            : selected.template.difficultyEN}
                        </strong>
                      </div>

                      <div>
                        <span>
                          {pt
                            ? "CARTAS"
                            : "CARDS"}
                        </span>
                        <strong>
                          {selected.totalCards}
                        </strong>
                      </div>

                      <div>
                        <span>
                          {pt
                            ? "ÚNICAS"
                            : "UNIQUE"}
                        </span>
                        <strong>
                          {selected.uniqueCards}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>


                <div className="prebuilt-card-list-block">
                  <header>
                    <div>
                      <span className="eyebrow">
                        DECK LIST
                      </span>
                      <strong>
                        {pt
                          ? "Lista de cartas"
                          : "Card list"}
                      </strong>
                    </div>

                    <span
                      className={
                        `prebuilt-ready-badge ${
                          selected.ready
                            ? "ready"
                            : "incomplete"
                        }`
                      }
                    >
                      {selected.ready
                        ? (
                          pt
                            ? "PRONTO"
                            : "READY"
                        )
                        : (
                          pt
                            ? "INCOMPLETO"
                            : "INCOMPLETE"
                        )}
                    </span>
                  </header>

                  <div className="prebuilt-card-list">
                    {selected.entries.map(
                      (entry) => {
                        const card =
                          cardIndex.get(
                            entry.cardId
                          );

                        return (
                          <div
                            key={entry.cardId}
                            className="prebuilt-card-row"
                          >
                            <span className="prebuilt-card-row-id">
                              {entry.cardId}
                            </span>

                            <strong>
                              {card
                                ? getCardName(card)
                                : entry.cardId}
                            </strong>

                            <b>
                              ×{entry.quantity}
                            </b>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>


                {error && (
                  <div className="prebuilt-error">
                    {error}
                  </div>
                )}


                {!selected.ready && (
                  <div className="prebuilt-warning">
                    {pt
                      ? `A lista precisa ter ${selected.template.expectedSize} cartas disponíveis na database para ser criada.`
                      : `The list needs ${selected.template.expectedSize} cards available in the database before it can be created.`}
                  </div>
                )}


                <footer className="prebuilt-detail-footer">
                  <p>
                    {pt
                      ? "Uma cópia normal será adicionada à sua biblioteca. Você poderá renomear, editar, trocar a capa e exportar o deck."
                      : "A normal copy will be added to your library. You can rename, edit, change the cover and export the deck."}
                  </p>

                  <button
                    type="button"
                    className="primary-btn prebuilt-create-button"
                    disabled={!selected.ready}
                    onClick={createSelected}
                  >
                    <span>
                      {pt
                        ? "Criar este Deck"
                        : "Create this Deck"}
                    </span>
                    <b aria-hidden="true">
                      →
                    </b>
                  </button>
                </footer>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


export default function Decks({
  onBack,
  onNew,
  onEdit
}) {
  const {
    language
  } =
    useLanguage();

  const decks =
    getDecks();

  const [
    query,
    setQuery
  ] =
    useState("");

  const [
    createOpen,
    setCreateOpen
  ] =
    useState(false);


  const builtTemplates =
    useMemo(
      () =>
        PREBUILT_DECKS.map(
          (template) => ({
            template,
            ...buildPrebuiltDeck(
              template,
              cards,
              cardIndex
            )
          })
        ),
      []
    );


  const filteredDecks =
    useMemo(
      () => {
        const q =
          query
            .trim()
            .toLocaleLowerCase(
              language === "en"
                ? "en-US"
                : "pt-BR"
            );

        if (!q) {
          return decks;
        }

        return decks.filter(
          (deck) => {
            const cover =
              findDeckCover(
                deck
              );

            const haystack =
              [
                deck.name,
                cover
                  ? getCardName(
                      cover
                    )
                  : ""
              ]
                .join(" ")
                .toLocaleLowerCase(
                  language === "en"
                    ? "en-US"
                    : "pt-BR"
                );

            return haystack.includes(
              q
            );
          }
        );
      },
      [
        decks,
        query,
        language
      ]
    );


  const stats =
    useMemo(
      () => {
        let totalCards =
          0;

        let validDecks =
          0;

        for (
          const deck of decks
        ) {
          totalCards +=
            deckSize(
              deck
            );

          if (
            validateDeck(
              deck.cards || [],
              cardIndex
            ).ok
          ) {
            validDecks +=
              1;
          }
        }

        return {
          totalCards,
          validDecks
        };
      },
      [
        decks
      ]
    );


  const copy =
    language === "en"
      ? {
          eyebrow:
            "DECKS",

          title:
            "My Decks",

          subtitle:
            "Manage your saved Eternal decks and choose one to edit.",

          newDeck:
            "+ New Deck",

          search:
            "Search deck or cover card...",

          decks:
            "Decks",

          valid:
            "Valid",

          cards:
            "Cards",

          library:
            "LIBRARY",

          result:
            "saved decks",

          none:
            "No decks found",

          noneBody:
            "Create a new deck or start with a prebuilt deck.",

          noSearch:
            "No deck matches your search.",

          clear:
            "Clear search"
        }
      : {
          eyebrow:
            "DECKS",

          title:
            "Meus Decks",

          subtitle:
            "Gerencie seus decks salvos do formato Eternal e escolha um para editar.",

          newDeck:
            "+ Novo Deck",

          search:
            "Buscar deck ou carta de capa...",

          decks:
            "Decks",

          valid:
            "Válidos",

          cards:
            "Cartas",

          library:
            "BIBLIOTECA",

          result:
            "decks salvos",

          none:
            "Nenhum deck salvo",

          noneBody:
            "Crie um deck do zero ou comece com um deck pré-construído.",

          noSearch:
            "Nenhum deck corresponde à sua busca.",

          clear:
            "Limpar busca"
        };


  function createPrebuilt(
    built
  ) {
    const template =
      built.template;

    if (!built.ready) {
      return;
    }

    const id =
      upsertDeck({
        id: null,
        name:
          `${template.setCode} — ${template.title}`,
        cards:
          built.entries.map(
            (entry) => ({
              ...entry
            })
          ),
        coverCardId:
          built.cover?.id ||
          template.coverCardId ||
          built.entries[0]?.cardId ||
          null,
        createdFromPrebuilt:
          true,
        prebuiltTemplateId:
          template.id,
        prebuiltSetCode:
          template.setCode
      });

    setCreateOpen(
      false
    );

    onEdit(
      id
    );
  }


  function startEmptyDeck() {
    setCreateOpen(
      false
    );

    onNew();
  }


  return (
    <main className="standard-page deck-library-v2-page">

      <header className="deck-library-v2-topbar">

        <button
          className="ghost deck-library-v2-back"
          onClick={
            onBack
          }
        >
          <span aria-hidden="true">
            ←
          </span>

          {language === "en"
            ? "Back"
            : "Voltar"}
        </button>


        <div className="deck-library-v2-title">

          <span className="eyebrow">
            {copy.eyebrow}
          </span>

          <h1>
            {copy.title}
          </h1>

          <p>
            {copy.subtitle}
          </p>

        </div>


        <button
          className="primary-btn deck-library-v2-new"
          onClick={() =>
            setCreateOpen(
              true
            )
          }
        >
          <span>
            {copy.newDeck}
          </span>

          <b aria-hidden="true">
            →
          </b>
        </button>

      </header>


      <section className="deck-library-v2-summary">

        <div className="deck-library-v2-stat">
          <span>
            {copy.decks}
          </span>

          <strong>
            {decks.length}
          </strong>
        </div>


        <div className="deck-library-v2-stat valid">
          <span>
            {copy.valid}
          </span>

          <strong>
            {stats.validDecks}
          </strong>
        </div>


        <div className="deck-library-v2-stat">
          <span>
            {copy.cards}
          </span>

          <strong>
            {stats.totalCards}
          </strong>
        </div>


        <label className="deck-library-v2-search">

          <span aria-hidden="true">
            ⌕
          </span>

          <input
            value={
              query
            }
            placeholder={
              copy.search
            }
            onChange={(
              event
            ) =>
              setQuery(
                event.target.value
              )
            }
          />

          {query && (
            <button
              type="button"
              title={
                copy.clear
              }
              aria-label={
                copy.clear
              }
              onClick={() =>
                setQuery("")
              }
            >
              ×
            </button>
          )}

        </label>

      </section>


      <section className="deck-library-v2-library">

        <header className="deck-library-v2-library-heading">

          <div>
            <span className="eyebrow">
              {copy.library}
            </span>

            <h2>
              {filteredDecks.length}{" "}
              {copy.result}
            </h2>
          </div>


          <span className="deck-library-v2-line" />

        </header>


        {!decks.length ? (
          <div className="deck-library-v2-empty">

            <EmptyState
              title={
                copy.none
              }
            >
              {copy.noneBody}
            </EmptyState>


            <button
              className="primary-btn"
              onClick={() =>
                setCreateOpen(
                  true
                )
              }
            >
              {copy.newDeck}
            </button>

          </div>
        ) : !filteredDecks.length ? (
          <div className="deck-library-v2-no-results">

            <span>
              ⌕
            </span>

            <strong>
              {copy.noSearch}
            </strong>

            <button
              className="ghost"
              onClick={() =>
                setQuery("")
              }
            >
              {copy.clear}
            </button>

          </div>
        ) : (
          <div className="deck-library-v2-grid">

            {filteredDecks.map(
              (deck) => (
                <DeckLibraryCard
                  key={
                    deck.id
                  }
                  deck={
                    deck
                  }
                  onEdit={
                    onEdit
                  }
                  language={
                    language
                  }
                />
              )
            )}


            <button
              type="button"
              className="deck-library-v2-add-card"
              onClick={() =>
                setCreateOpen(
                  true
                )
              }
            >
              <span>
                +
              </span>

              <strong>
                {language === "en"
                  ? "Create new deck"
                  : "Criar novo deck"}
              </strong>

              <small>
                {language === "en"
                  ? "Empty deck or prebuilt list"
                  : "Deck vazio ou lista pré-construída"}
              </small>
            </button>

          </div>
        )}

      </section>


      {createOpen && (
        <CreateDeckOverlay
          language={language}
          builtTemplates={builtTemplates}
          onClose={() =>
            setCreateOpen(
              false
            )
          }
          onEmpty={
            startEmptyDeck
          }
          onCreatePrebuilt={
            createPrebuilt
          }
        />
      )}

    </main>
  );
}
