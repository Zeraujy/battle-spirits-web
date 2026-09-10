import { useMemo, useRef, useState } from "react";
import CardTile from "../components/CardTile.jsx";
import EmptyState from "../components/EmptyState.jsx";
import CardDetailsModal from "../components/CardDetailsModal.jsx";
import { searchCards, cardIndex } from "../services/cardRepository.js";
import { deleteDeck, getDecks, upsertDeck } from "../services/storage.js";
import { validateDeck } from "../game/state.js";
import { getCardName } from "../game/cardAdapter.js";
import { useLanguage } from "../i18n.jsx";

import "../styles/deckBuilderPagination.css";
import "../styles/deckImportExport.css";


const CARDS_PER_PAGE = 21;

const DECK_FILE_FORMAT =
  "battle-spirits-eternal-deck";

const DECK_FILE_VERSION = 1;


/* =========================================================
   PAGINAÇÃO
========================================================= */

function getPaginationItems(
  currentPage,
  totalPages
) {
  if (totalPages <= 7) {
    return Array.from(
      {
        length:
          totalPages
      },
      (
        _,
        index
      ) =>
        index + 1
    );
  }


  if (
    currentPage <=
    4
  ) {
    return [
      1,
      2,
      3,
      4,
      5,
      "ellipsis-right",
      totalPages
    ];
  }


  if (
    currentPage >=
    totalPages - 3
  ) {
    return [
      1,
      "ellipsis-left",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages
    ];
  }


  return [
    1,
    "ellipsis-left",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis-right",
    totalPages
  ];
}


/* =========================================================
   IMPORT / EXPORT
========================================================= */

function safeFileName(
  value
) {
  const cleaned =
    String(
      value ||
      "deck"
    )
      .trim()
      .replace(
        /[<>:"/\\|?*\u0000-\u001F]/g,
        "-"
      )
      .replace(
        /\s+/g,
        " "
      )
      .slice(
        0,
        80
      );

  return (
    cleaned ||
    "deck"
  );
}


function normalizeImportedCards(
  entries
) {
  const merged =
    new Map();

  let ignored =
    0;


  for (
    const entry of
      Array.isArray(
        entries
      )
        ? entries
        : []
  ) {
    const cardId =
      String(
        entry?.cardId ||
        entry?.id ||
        ""
      )
        .trim();


    const quantity =
      Math.floor(
        Number(
          entry?.quantity ??
          entry?.qty ??
          entry?.count ??
          0
        )
      );


    if (
      !cardId ||
      !Number.isFinite(
        quantity
      ) ||
      quantity <=
        0
    ) {
      ignored +=
        1;

      continue;
    }


    if (
      !cardIndex.has(
        cardId
      )
    ) {
      ignored +=
        1;

      continue;
    }


    merged.set(
      cardId,

      (
        merged.get(
          cardId
        ) ||
        0
      ) +
      quantity
    );
  }


  return {
    cards:
      Array.from(
        merged.entries()
      )
        .map(
          (
            [
              cardId,
              quantity
            ]
          ) => ({
            cardId,
            quantity
          })
        ),

    ignored
  };
}


export default function DeckBuilder({
  onBack,
  deckId = null
}) {
  const {
    t,
    language
  } =
    useLanguage();


  const initialDecks =
    getDecks();


  const requested =
    initialDecks.find(
      (d) =>
        d.id ===
        deckId
    ) ||
    null;


  const [
    decks,
    setDecks
  ] =
    useState(
      initialDecks
    );


  const [
    draft,
    setDraft
  ] =
    useState(
      requested || {
        id:
          null,

        name:
          t(
            "newDeck"
          ),

        cards:
          [],

        coverCardId:
          null
      }
    );


  const [
    query,
    setQuery
  ] =
    useState(
      ""
    );


  const [
    type,
    setType
  ] =
    useState(
      ""
    );


  const [
    color,
    setColor
  ] =
    useState(
      ""
    );


  const [
    page,
    setPage
  ] =
    useState(
      1
    );


  const [
    detailsCard,
    setDetailsCard
  ] =
    useState(
      null
    );


  const [
    transferNotice,
    setTransferNotice
  ] =
    useState(
      null
    );


  const browserRef =
    useRef(
      null
    );


  const importInputRef =
    useRef(
      null
    );


  /* =======================================================
     RESULTADOS
  ======================================================= */

  const results =
    useMemo(
      () =>
        searchCards(
          query,
          {
            cardType:
              type ||
              undefined,

            color:
              color ||
              undefined
          }
        ),
      [
        query,
        type,
        color
      ]
    );


  const totalPages =
    Math.max(
      1,
      Math.ceil(
        results.length /
        CARDS_PER_PAGE
      )
    );


  const currentPage =
    Math.min(
      page,
      totalPages
    );


  const pageStartIndex =
    (
      currentPage -
      1
    ) *
    CARDS_PER_PAGE;


  const pageResults =
    useMemo(
      () =>
        results.slice(
          pageStartIndex,
          pageStartIndex +
            CARDS_PER_PAGE
        ),
      [
        results,
        pageStartIndex
      ]
    );


  const paginationItems =
    useMemo(
      () =>
        getPaginationItems(
          currentPage,
          totalPages
        ),
      [
        currentPage,
        totalPages
      ]
    );


  const rangeStart =
    results.length
      ? pageStartIndex +
        1
      : 0;


  const rangeEnd =
    results.length
      ? Math.min(
          pageStartIndex +
            CARDS_PER_PAGE,
          results.length
        )
      : 0;


  /* =======================================================
     VALIDAÇÃO DO DECK
  ======================================================= */

  const validation =
    validateDeck(
      draft.cards,
      cardIndex
    );


  const deckCardIds =
    draft.cards
      .filter(
        (e) =>
          Number(
            e.quantity ||
            0
          ) >
          0
      )
      .map(
        (e) =>
          e.cardId ||
          e.id
      );


  /* =======================================================
     QUANTIDADE
  ======================================================= */

  function qty(
    cardId
  ) {
    return (
      draft.cards.find(
        (e) =>
          (
            e.cardId ||
            e.id
          ) ===
          cardId
      )?.quantity ||
      0
    );
  }


  function setQty(
    cardId,
    nextQty
  ) {
    const card =
      cardIndex.get(
        cardId
      );


    if (!card) {
      return;
    }


    const sameNameCount =
      draft.cards.reduce(
        (
          sum,
          e
        ) => {
          const c =
            cardIndex.get(
              e.cardId ||
              e.id
            );


          return (
            getCardName(
              c
            )
              .toLowerCase() ===
            getCardName(
              card
            )
              .toLowerCase()
          )
            ? sum +
                Number(
                  e.quantity ||
                  0
                )
            : sum;
        },
        0
      ) -
      qty(
        cardId
      );


    const allowed =
      Math.max(
        0,
        Math.min(
          3 -
            sameNameCount,
          nextQty
        )
      );


    setDraft(
      (d) => {
        const cards = [
          ...d.cards.filter(
            (e) =>
              (
                e.cardId ||
                e.id
              ) !==
              cardId
          ),

          ...(
            allowed
              ? [
                  {
                    cardId,

                    quantity:
                      allowed
                  }
                ]
              : []
          )
        ];


        const coverCardId =
          allowed ===
            0 &&
          d.coverCardId ===
            cardId
            ? (
                cards[0]
                  ?.cardId ||
                null
              )
            : d.coverCardId;


        return {
          ...d,
          cards,
          coverCardId
        };
      }
    );
  }


  /* =======================================================
     DECK
  ======================================================= */

  function save() {
    const id =
      upsertDeck({
        ...draft,

        coverCardId:
          draft.coverCardId ||
          draft.cards[0]
            ?.cardId ||
          null
      });


    const next =
      getDecks();


    setDecks(
      next
    );


    setDraft(
      next.find(
        (d) =>
          d.id ===
          id
      )
    );


    setTransferNotice({
      type:
        "success",

      text:
        language ===
        "en"
          ? "Deck saved."
          : "Deck salvo."
    });
  }


  function fresh() {
    setDraft({
      id:
        null,

      name:
        t(
          "newDeck"
        ),

      cards:
        [],

      coverCardId:
        null
    });


    setTransferNotice(
      null
    );
  }


  function remove() {
    if (
      !draft.id
    ) {
      return;
    }


    deleteDeck(
      draft.id
    );


    setDecks(
      getDecks()
    );


    fresh();
  }


  /* =======================================================
     EXPORTAR
  ======================================================= */

  function exportDeck() {
    if (
      !draft.cards.length
    ) {
      setTransferNotice({
        type:
          "error",

        text:
          language ===
          "en"
            ? "Add at least one card before exporting."
            : "Adicione pelo menos uma carta antes de exportar."
      });

      return;
    }


    const payload = {
      format:
        DECK_FILE_FORMAT,

      version:
        DECK_FILE_VERSION,

      simulator:
        "Battle Spirits Eternal Simulator",

      simulatorVersion:
        "2.4.0",

      exportedAt:
        new Date()
          .toISOString(),

      deck: {
        name:
          String(
            draft.name ||
            ""
          )
            .trim() ||
          (
            language ===
            "en"
              ? "Imported Deck"
              : "Deck Importado"
          ),

        coverCardId:
          draft.coverCardId ||
          draft.cards[0]
            ?.cardId ||
          null,

        cards:
          draft.cards.map(
            (entry) => ({
              cardId:
                entry.cardId ||
                entry.id,

              quantity:
                Number(
                  entry.quantity ||
                  0
                )
            })
          )
      }
    };


    const blob =
      new Blob(
        [
          JSON.stringify(
            payload,
            null,
            2
          )
        ],
        {
          type:
            "application/json;charset=utf-8"
        }
      );


    const url =
      URL.createObjectURL(
        blob
      );


    const anchor =
      document.createElement(
        "a"
      );


    anchor.href =
      url;


    anchor.download =
      `${safeFileName(
        draft.name
      )}.bsdeck.json`;


    document.body
      .appendChild(
        anchor
      );


    anchor.click();


    anchor.remove();


    setTimeout(
      () =>
        URL.revokeObjectURL(
          url
        ),
      0
    );


    setTransferNotice({
      type:
        "success",

      text:
        language ===
        "en"
          ? "Deck exported successfully."
          : "Deck exportado com sucesso."
    });
  }


  /* =======================================================
     IMPORTAR
  ======================================================= */

  async function importDeckFile(
    file
  ) {
    if (!file) {
      return;
    }


    try {
      const rawText =
        await file.text();


      const parsed =
        JSON.parse(
          rawText
        );


      const imported =
        parsed?.deck &&
        (
          parsed.format ===
            DECK_FILE_FORMAT ||
          parsed.deck.cards
        )
          ? parsed.deck
          : parsed;


      if (
        !imported ||
        !Array.isArray(
          imported.cards
        )
      ) {
        throw new Error(
          language ===
          "en"
            ? "This file does not contain a valid deck."
            : "Este arquivo não contém um deck válido."
        );
      }


      const {
        cards,
        ignored
      } =
        normalizeImportedCards(
          imported.cards
        );


      if (
        !cards.length
      ) {
        throw new Error(
          language ===
          "en"
            ? "No compatible cards were found in this file."
            : "Nenhuma carta compatível foi encontrada neste arquivo."
        );
      }


      const importedCoverId =
        String(
          imported.coverCardId ||
          ""
        )
          .trim();


      const coverCardId =
        importedCoverId &&
        cards.some(
          (entry) =>
            entry.cardId ===
            importedCoverId
        )
          ? importedCoverId
          : cards[0]
              ?.cardId ||
            null;


      const name =
        String(
          imported.name ||
          ""
        )
          .trim() ||
        (
          language ===
          "en"
            ? "Imported Deck"
            : "Deck Importado"
        );


      setDraft({
        id:
          null,

        name,

        cards,

        coverCardId
      });


      setQuery(
        ""
      );


      setType(
        ""
      );


      setColor(
        ""
      );


      setPage(
        1
      );


      setTransferNotice({
        type:
          ignored >
          0
            ? "warning"
            : "success",

        text:
          language ===
          "en"
            ? (
                ignored >
                0
                  ? `Deck imported. ${ignored} unsupported or invalid entr${ignored === 1 ? "y was" : "ies were"} ignored. Review it and click Save.`
                  : "Deck imported. Review it and click Save."
              )
            : (
                ignored >
                0
                  ? `Deck importado. ${ignored} entrada${ignored === 1 ? "" : "s"} inválida${ignored === 1 ? "" : "s"} ou sem suporte ${ignored === 1 ? "foi ignorada" : "foram ignoradas"}. Revise e clique em Salvar.`
                  : "Deck importado. Revise e clique em Salvar."
              )
      });
    } catch (
      error
    ) {
      console.error(
        "Falha ao importar deck:",
        error
      );


      setTransferNotice({
        type:
          "error",

        text:
          error?.message ||
          (
            language ===
            "en"
              ? "Could not import this deck."
              : "Não foi possível importar este deck."
          )
      });
    } finally {
      if (
        importInputRef.current
      ) {
        importInputRef.current.value =
          "";
      }
    }
  }


  /* =======================================================
     FILTROS
  ======================================================= */

  function changeQuery(
    value
  ) {
    setQuery(
      value
    );

    setPage(
      1
    );
  }


  function changeType(
    value
  ) {
    setType(
      value
    );

    setPage(
      1
    );
  }


  function changeColor(
    value
  ) {
    setColor(
      value
    );

    setPage(
      1
    );
  }


  /* =======================================================
     TROCA DE PÁGINA
  ======================================================= */

  function goToPage(
    nextPage
  ) {
    const boundedPage =
      Math.max(
        1,
        Math.min(
          totalPages,
          nextPage
        )
      );


    setPage(
      boundedPage
    );


    requestAnimationFrame(
      () => {
        browserRef.current
          ?.scrollIntoView({
            behavior:
              "smooth",

            block:
              "start"
          });
      }
    );
  }


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="deck-page">

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="page-header">

        <button
          className="ghost"
          onClick={
            onBack
          }
        >
          {t(
            "back"
          )}
        </button>


        <div>
          <span className="eyebrow">
            {t(
              "deckBuilder"
            )}
          </span>

          <h1>
            {t(
              "eternalFormat"
            )}
          </h1>
        </div>


        <div className="row-actions deck-builder-actions">

          <input
            ref={
              importInputRef
            }
            className="deck-import-input"
            hidden
            type="file"
            accept=".json,.bsdeck.json,application/json"
            onChange={(
              event
            ) =>
              importDeckFile(
                event.target.files?.[0]
              )
            }
          />


          <button
            className="ghost deck-transfer-btn"
            onClick={() =>
              importInputRef.current
                ?.click()
            }
          >
            {language ===
            "en"
              ? "Import Deck"
              : "Importar Deck"}
          </button>


          <button
            className="ghost deck-transfer-btn"
            disabled={
              !draft.cards.length
            }
            onClick={
              exportDeck
            }
          >
            {language ===
            "en"
              ? "Export Deck"
              : "Exportar Deck"}
          </button>


          <button
            className="ghost"
            onClick={
              fresh
            }
          >
            {t(
              "newDeck"
            )}
          </button>


          <button
            className="primary-btn"
            onClick={
              save
            }
          >
            {t(
              "save"
            )}
          </button>

        </div>

      </header>


      {transferNotice && (
        <div
          className={
            `deck-transfer-notice ${
              transferNotice.type
            }`
          }
        >
          <span>
            {transferNotice.text}
          </span>

          <button
            type="button"
            aria-label={
              language ===
              "en"
                ? "Close"
                : "Fechar"
            }
            onClick={() =>
              setTransferNotice(
                null
              )
            }
          >
            ×
          </button>
        </div>
      )}


      <div className="deck-layout">

        {/* =================================================
            SIDEBAR
        ================================================= */}

        <aside className="panel deck-sidebar">

          <label>
            {t(
              "name"
            )}

            <input
              value={
                draft.name
              }

              onChange={(
                e
              ) =>
                setDraft({
                  ...draft,

                  name:
                    e.target.value
                })
              }
            />
          </label>


          <label>
            {t(
              "deckCover"
            )}

            <select
              value={
                draft.coverCardId ||
                ""
              }

              onChange={(
                e
              ) =>
                setDraft({
                  ...draft,

                  coverCardId:
                    e.target.value ||
                    null
                })
              }
            >
              <option value="">
                —
              </option>

              {deckCardIds.map(
                (id) => (
                  <option
                    key={
                      id
                    }
                    value={
                      id
                    }
                  >
                    {getCardName(
                      cardIndex.get(
                        id
                      )
                    )}
                  </option>
                )
              )}
            </select>
          </label>


          <div className="deck-validation">

            <strong>
              {
                validation.size
              }{" "}
              {t(
                "cards"
              )}
            </strong>


            {validation.ok
              ? (
                <span className="success-text">
                  {t(
                    "validDeck"
                  )}
                </span>
              )
              : validation.errors.map(
                  (e) => (
                    <span
                      className="error-text"
                      key={
                        e
                      }
                    >
                      {e}
                    </span>
                  )
                )}

          </div>


          <h3>
            {t(
              "myDecks"
            )}
          </h3>


          <div className="saved-decks">

            {decks.map(
              (d) => (
                <button
                  key={
                    d.id
                  }

                  className={
                    d.id ===
                    draft.id
                      ? "active"
                      : ""
                  }

                  onClick={() =>
                    setDraft(
                      d
                    )
                  }
                >
                  {
                    d.name
                  }

                  <small>
                    {d.cards.reduce(
                      (
                        s,
                        e
                      ) =>
                        s +
                        Number(
                          e.quantity ||
                          0
                        ),
                      0
                    )}{" "}
                    {t(
                      "cards"
                    )}
                  </small>

                </button>
              )
            )}

          </div>


          {draft.id && (
            <button
              className="danger ghost"
              onClick={
                remove
              }
            >
              {t(
                "deleteDeck"
              )}
            </button>
          )}


          <h3>
            {t(
              "currentList"
            )}
          </h3>


          <div className="deck-list">

            {draft.cards.map(
              (e) => {
                const c =
                  cardIndex.get(
                    e.cardId ||
                    e.id
                  );


                return (
                  <button
                    className={
                      `deck-list-row ${
                        draft.coverCardId ===
                        (
                          e.cardId ||
                          e.id
                        )
                          ? "cover"
                          : ""
                      }`
                    }

                    key={
                      e.cardId ||
                      e.id
                    }

                    onClick={() =>
                      setDraft({
                        ...draft,

                        coverCardId:
                          e.cardId ||
                          e.id
                      })
                    }
                  >
                    <span>
                      {getCardName(
                        c
                      )}
                    </span>

                    <b>
                      x
                      {
                        e.quantity
                      }
                    </b>
                  </button>
                );
              }
            )}

          </div>

        </aside>


        {/* =================================================
            CARD BROWSER
        ================================================= */}

        <section
          ref={
            browserRef
          }
          className="panel card-browser"
        >

          {/* ===============================================
              FILTROS
          =============================================== */}

          <div className="filters">

            <input
              placeholder={
                t(
                  "searchCards"
                )
              }

              value={
                query
              }

              onChange={(
                e
              ) =>
                changeQuery(
                  e.target.value
                )
              }
            />


            <select
              value={
                type
              }

              onChange={(
                e
              ) =>
                changeType(
                  e.target.value
                )
              }
            >
              <option value="">
                {t(
                  "allTypes"
                )}
              </option>

              <option value="spirit">
                Spirit
              </option>

              <option value="brave">
                Brave
              </option>

              <option value="ultimate">
                Ultimate
              </option>

              <option value="nexus">
                Nexus
              </option>

              <option value="magic">
                Magic
              </option>
            </select>


            <select
              value={
                color
              }

              onChange={(
                e
              ) =>
                changeColor(
                  e.target.value
                )
              }
            >
              <option value="">
                {t(
                  "allColors"
                )}
              </option>

              {[
                "red",
                "purple",
                "green",
                "white",
                "yellow",
                "blue"
              ].map(
                (c) => (
                  <option
                    key={
                      c
                    }
                    value={
                      c
                    }
                  >
                    {c}
                  </option>
                )
              )}
            </select>

          </div>


          {/* ===============================================
              RESULTADOS
          =============================================== */}

          {!results.length
            ? (
              <EmptyState
                title={
                  t(
                    "noCardsFound"
                  )
                }
              >
                src/data
              </EmptyState>
            )
            : (
              <>

                {/* =========================================
                    CONTADOR
                ========================================= */}

                <div className="deck-browser-meta">

                  <span>
                    {language ===
                    "en"
                      ? (
                        <>
                          Showing{" "}
                          <b>
                            {
                              rangeStart
                            }–
                            {
                              rangeEnd
                            }
                          </b>{" "}
                          of{" "}
                          <b>
                            {
                              results.length
                            }
                          </b>{" "}
                          cards
                        </>
                      )
                      : (
                        <>
                          Mostrando{" "}
                          <b>
                            {
                              rangeStart
                            }–
                            {
                              rangeEnd
                            }
                          </b>{" "}
                          de{" "}
                          <b>
                            {
                              results.length
                            }
                          </b>{" "}
                          cartas
                        </>
                      )}
                  </span>


                  <span>
                    {language ===
                    "en"
                      ? "Page"
                      : "Página"}{" "}
                    <b>
                      {
                        currentPage
                      }
                    </b>
                    {" / "}
                    <b>
                      {
                        totalPages
                      }
                    </b>
                  </span>

                </div>


                {/* =========================================
                    GRADE DE CARTAS
                ========================================= */}

                <div className="card-grid">

                  {pageResults.map(
                    (card) => (
                      <div
                        className="builder-card"
                        key={
                          card.id
                        }
                      >

                        <CardTile
                          card={
                            card
                          }
                          onClick={() =>
                            setDetailsCard(
                              card
                            )
                          }
                        />


                        <div className="qty-control">

                          <button
                            onClick={() =>
                              setQty(
                                card.id,

                                qty(
                                  card.id
                                ) -
                                1
                              )
                            }
                          >
                            -
                          </button>


                          <b>
                            {qty(
                              card.id
                            )}
                          </b>


                          <button
                            onClick={() =>
                              setQty(
                                card.id,

                                qty(
                                  card.id
                                ) +
                                1
                              )
                            }
                          >
                            +
                          </button>

                        </div>


                        {qty(
                          card.id
                        ) >
                          0 && (
                          <button
                            className={
                              `cover-card-btn ${
                                draft.coverCardId ===
                                card.id
                                  ? "active"
                                  : ""
                              }`
                            }

                            onClick={() =>
                              setDraft({
                                ...draft,

                                coverCardId:
                                  card.id
                              })
                            }
                          >
                            ★{" "}
                            {t(
                              "deckCover"
                            )}
                          </button>
                        )}

                      </div>
                    )
                  )}

                </div>


                {/* =========================================
                    PAGINAÇÃO
                ========================================= */}

                {totalPages >
                  1 && (
                  <nav
                    className="deck-pagination"

                    aria-label={
                      language ===
                      "en"
                        ? "Card pages"
                        : "Páginas de cartas"
                    }
                  >

                    <button
                      className="deck-pagination-arrow"

                      disabled={
                        currentPage ===
                        1
                      }

                      onClick={() =>
                        goToPage(
                          currentPage -
                          1
                        )
                      }
                    >
                      ←{" "}
                      <span>
                        {language ===
                        "en"
                          ? "Previous"
                          : "Anterior"}
                      </span>
                    </button>


                    <div className="deck-pagination-pages">

                      {paginationItems.map(
                        (
                          item,
                          index
                        ) => {

                          if (
                            typeof item ===
                            "string"
                          ) {
                            return (
                              <span
                                className="deck-pagination-ellipsis"

                                key={
                                  `${item}-${index}`
                                }
                              >
                                …
                              </span>
                            );
                          }


                          return (
                            <button
                              key={
                                item
                              }

                              className={
                                `deck-pagination-page ${
                                  item ===
                                  currentPage
                                    ? "active"
                                    : ""
                                }`
                              }

                              aria-current={
                                item ===
                                currentPage
                                  ? "page"
                                  : undefined
                              }

                              onClick={() =>
                                goToPage(
                                  item
                                )
                              }
                            >
                              {
                                item
                              }
                            </button>
                          );
                        }
                      )}

                    </div>


                    <button
                      className="deck-pagination-arrow"

                      disabled={
                        currentPage ===
                        totalPages
                      }

                      onClick={() =>
                        goToPage(
                          currentPage +
                          1
                        )
                      }
                    >
                      <span>
                        {language ===
                        "en"
                          ? "Next"
                          : "Próxima"}
                      </span>
                      {" "}→
                    </button>

                  </nav>
                )}

              </>
            )}

        </section>

      </div>


      {detailsCard && (
        <CardDetailsModal
          card={
            detailsCard
          }
          initialLanguage={
            language === "en"
              ? "en"
              : "ptBR"
          }
          onClose={() =>
            setDetailsCard(
              null
            )
          }
        />
      )}

    </main>
  );
}
