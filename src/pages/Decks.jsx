import { useMemo, useState } from "react";

import EmptyState from "../components/EmptyState.jsx";

import {
  getDecks
} from "../services/storage.js";

import {
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
  useLanguage
} from "../i18n.jsx";

import "../styles/deckLibrary.css";


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

  /*
   * 1) Prioriza exatamente a carta escolhida
   *    como capa no Deck Builder.
   */
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


  /*
   * 2) Fallback:
   *    primeira carta válida do deck.
   *
   * Isso também evita cards vazios caso um
   * deck antigo possua um coverCardId que
   * não existe mais na database atual.
   */
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

    if (
      quantity <= 0
    ) {
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

  /*
   * IMPORTANTE:
   * Não usamos card.image diretamente aqui.
   *
   * resolveCardImage() é o mesmo resolvedor
   * utilizado pelo CardTile do simulador e
   * trata os formatos/caminhos diferentes
   * existentes entre as coleções antigas
   * e novas.
   */
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
  name
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
                {language === "en"
                  ? "TOTAL"
                  : "TOTAL"}
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
            "Create a new deck to start your library.",

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
            "Crie um novo deck para começar sua biblioteca.",

          noSearch:
            "Nenhum deck corresponde à sua busca.",

          clear:
            "Limpar busca"
        };


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
          onClick={
            onNew
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
              onClick={
                onNew
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
              onClick={
                onNew
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
                  ? "Start an empty Eternal deck"
                  : "Comece um deck Eternal vazio"}
              </small>
            </button>

          </div>
        )}

      </section>

    </main>
  );
}
