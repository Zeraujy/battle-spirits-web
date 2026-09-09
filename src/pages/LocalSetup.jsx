import { useMemo, useState } from "react";
import { getDecks, getProfile } from "../services/storage.js";
import { cardIndex } from "../services/cardRepository.js";
import { createMatch, validateDeck } from "../game/state.js";
import { getCardName, resolveCardImage } from "../game/cardAdapter.js";
import EmptyState from "../components/EmptyState.jsx";

import "../styles/localSetup.css";


function deckSize(deck) {
  return (
    deck?.cards?.reduce(
      (sum, entry) =>
        sum +
        Number(
          entry.quantity ||
          0
        ),
      0
    ) || 0
  );
}


function getDeckCoverCard(deck) {
  if (!deck) {
    return null;
  }

  const fallbackId =
    deck.cards?.find(
      (entry) =>
        Number(
          entry.quantity ||
          0
        ) > 0
    )?.cardId ||
    deck.cards?.find(
      (entry) =>
        Number(
          entry.quantity ||
          0
        ) > 0
    )?.id ||
    null;

  const coverId =
    deck.coverCardId ||
    fallbackId;

  if (!coverId) {
    return null;
  }

  return (
    cardIndex.get(
      coverId
    ) ||
    null
  );
}


function getInitials(name) {
  const parts =
    String(
      name ||
      "Player"
    )
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (!parts.length) {
    return "P";
  }

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[
      parts.length - 1
    ][0]
  ).toUpperCase();
}


function DuelistPanel({
  side,
  label,
  name,
  setName,
  deckId,
  setDeckId,
  decks,
  deck,
  avatar
}) {
  const coverCard =
    useMemo(
      () =>
        getDeckCoverCard(
          deck
        ),
      [deck]
    );

  const validation =
    useMemo(
      () =>
        deck
          ? validateDeck(
              deck.cards,
              cardIndex
            )
          : null,
      [deck]
    );

  const coverImage =
    coverCard
      ? resolveCardImage(
          coverCard
        )
      : "./images/card-back.png";

  const coverName =
    coverCard
      ? getCardName(
          coverCard
        )
      : "Carta de capa";

  const totalCards =
    deckSize(
      deck
    );

  return (
    <section
      className={
        `local-duelist local-duelist-${side}`
      }
    >
      <div
        className="local-duelist-glow"
        aria-hidden="true"
      />

      <div
        className="local-cover-column"
        aria-hidden="true"
      >
        <div className="local-cover-frame">
          <img
            src={
              coverImage
            }
            alt=""
          />

          <span className="local-cover-shine" />
        </div>

        <span className="local-cover-label">
          DECK COVER
        </span>
      </div>


      <div className="local-duelist-content">

        <header className="local-duelist-header">
          <div className="local-duelist-identity">

            <div className="local-avatar">
              {avatar
                ? (
                  <img
                    src={avatar}
                    alt=""
                  />
                )
                : (
                  <span>
                    {getInitials(
                      name
                    )}
                  </span>
                )}
            </div>


            <div>
              <span className="local-player-kicker">
                {side === "p1"
                  ? "PLAYER 01"
                  : "PLAYER 02"}
              </span>

              <h2>
                {label}
              </h2>
            </div>

          </div>


          <div
            className={
              `local-ready-pill ${
                validation?.ok
                  ? "ready"
                  : "warning"
              }`
            }
          >
            <i />

            <span>
              {validation?.ok
                ? "PRONTO"
                : "REVISAR"}
            </span>
          </div>
        </header>


        <div className="local-duelist-form">

          <label>
            <span>Nome</span>

            <input
              value={
                name
              }
              onChange={(
                event
              ) =>
                setName(
                  event.target.value
                )
              }
              autoComplete="off"
            />
          </label>


          <label>
            <span>Deck</span>

            <select
              value={
                deckId
              }
              onChange={(
                event
              ) =>
                setDeckId(
                  event.target.value
                )
              }
            >
              {decks.map(
                (item) => (
                  <option
                    value={
                      item.id
                    }
                    key={
                      item.id
                    }
                  >
                    {
                      item.name
                    }
                  </option>
                )
              )}
            </select>
          </label>

        </div>


        <footer className="local-deck-info">

          <div>
            <span>DECK</span>

            <strong>
              {deck?.name ||
                "Nenhum deck"}
            </strong>
          </div>


          <div>
            <span>CARTAS</span>

            <strong>
              {totalCards}
            </strong>
          </div>


          <div className="local-cover-name">
            <span>CAPA</span>

            <strong
              title={
                coverName
              }
            >
              {coverName}
            </strong>
          </div>

        </footer>

      </div>
    </section>
  );
}


export default function LocalSetup({
  onBack,
  onStart
}) {
  const decks =
    getDecks();

  const profile =
    getProfile();

  const [
    p1Deck,
    setP1Deck
  ] =
    useState(
      decks[0]?.id ||
      ""
    );

  const [
    p2Deck,
    setP2Deck
  ] =
    useState(
      decks[1]?.id ||
      decks[0]?.id ||
      ""
    );

  const [
    p1Name,
    setP1Name
  ] =
    useState(
      profile.name ||
      "Jogador 1"
    );

  const [
    p2Name,
    setP2Name
  ] =
    useState(
      "Jogador 2"
    );

  const [
    first,
    setFirst
  ] =
    useState(
      "random"
    );

  const [
    error,
    setError
  ] =
    useState(
      ""
    );


  const selectedP1Deck =
    useMemo(
      () =>
        decks.find(
          (deck) =>
            deck.id ===
            p1Deck
        ) ||
        null,
      [
        decks,
        p1Deck
      ]
    );


  const selectedP2Deck =
    useMemo(
      () =>
        decks.find(
          (deck) =>
            deck.id ===
            p2Deck
        ) ||
        null,
      [
        decks,
        p2Deck
      ]
    );


  function start() {
    const d1 =
      decks.find(
        (deck) =>
          deck.id ===
          p1Deck
      );

    const d2 =
      decks.find(
        (deck) =>
          deck.id ===
          p2Deck
      );


    if (
      !d1 ||
      !d2
    ) {
      setError(
        "Escolha dois decks."
      );

      return;
    }


    const v1 =
      validateDeck(
        d1.cards,
        cardIndex
      );

    const v2 =
      validateDeck(
        d2.cards,
        cardIndex
      );


    if (
      !v1.ok ||
      !v2.ok
    ) {
      setError(
        `Deck inválido. ${
          [
            ...v1.errors,
            ...v2.errors
          ].join(
            " "
          )
        }`
      );

      return;
    }


    setError(
      ""
    );


    const firstPlayerId =
      first ===
      "random"
        ? (
          Math.random() <
          .5
            ? "player1"
            : "player2"
        )
        : first;


    onStart(
      createMatch({
        player1: {
          name:
            p1Name.trim() ||
            "Jogador 1",

          avatar:
            profile.avatar,

          deck:
            d1.cards
        },

        player2: {
          name:
            p2Name.trim() ||
            "Jogador 2",

          avatar:
            null,

          deck:
            d2.cards
        },

        firstPlayerId,

        cardIndex
      })
    );
  }


  return (
    <main className="standard-page local-setup-page">

      <header className="local-setup-topbar">

        <button
          className="ghost local-back-button"
          onClick={
            onBack
          }
        >
          <span aria-hidden="true">
            ←
          </span>

          Voltar
        </button>


        <div className="local-setup-title">

          <span className="eyebrow">
            LOCAL 1V1
          </span>

          <h1>
            Preparar batalha
          </h1>

          <p>
            Escolha os duelistas, os decks e quem começa a partida.
          </p>

        </div>


        <div className="local-mode-status">
          <i />

          <div>
            <span>MODO</span>

            <strong>
              LOCAL
            </strong>
          </div>
        </div>

      </header>


      {!decks.length
        ? (
          <EmptyState
            title="Você ainda não tem decks"
          >
            Volte ao Deck Builder,
            importe seu `src/data`
            e salve pelo menos
            um deck de 40+
            cartas.
          </EmptyState>
        )
        : (
          <section className="local-battle-shell">

            <div className="local-duelists-row">

              <DuelistPanel
                side="p1"
                label="Jogador 1"
                name={
                  p1Name
                }
                setName={
                  setP1Name
                }
                deckId={
                  p1Deck
                }
                setDeckId={
                  setP1Deck
                }
                decks={
                  decks
                }
                deck={
                  selectedP1Deck
                }
                avatar={
                  profile.avatar
                }
              />


              <div
                className="local-versus-column"
                aria-hidden="true"
              >

                <span className="local-versus-line" />

                <div className="local-versus-emblem">
                  <small>
                    BATTLE
                  </small>

                  <strong>
                    VS
                  </strong>

                  <span>
                    SPIRITS
                  </span>
                </div>

                <span className="local-versus-line" />

              </div>


              <DuelistPanel
                side="p2"
                label="Jogador 2"
                name={
                  p2Name
                }
                setName={
                  setP2Name
                }
                deckId={
                  p2Deck
                }
                setDeckId={
                  setP2Deck
                }
                decks={
                  decks
                }
                deck={
                  selectedP2Deck
                }
                avatar={
                  null
                }
              />

            </div>


            <section className="local-first-player">

              <div className="local-first-copy">

                <span className="eyebrow">
                  INICIATIVA
                </span>

                <div>
                  <h3>
                    Primeiro jogador
                  </h3>

                  <p>
                    Escolha manualmente
                    ou deixe o simulador
                    decidir.
                  </p>
                </div>

              </div>


              <div
                className="local-first-options"
                role="group"
                aria-label="Primeiro jogador"
              >

                <button
                  type="button"
                  className={
                    first ===
                    "random"
                      ? "active"
                      : ""
                  }
                  aria-pressed={
                    first ===
                    "random"
                  }
                  onClick={() =>
                    setFirst(
                      "random"
                    )
                  }
                >
                  <span>
                    ◈
                  </span>

                  <div>
                    <b>
                      Aleatório
                    </b>

                    <small>
                      Sorteio automático
                    </small>
                  </div>
                </button>


                <button
                  type="button"
                  className={
                    first ===
                    "player1"
                      ? "active p1"
                      : ""
                  }
                  aria-pressed={
                    first ===
                    "player1"
                  }
                  onClick={() =>
                    setFirst(
                      "player1"
                    )
                  }
                >
                  <span>
                    01
                  </span>

                  <div>
                    <b>
                      Jogador 1
                    </b>

                    <small>
                      {
                        p1Name ||
                        "Jogador 1"
                      }
                    </small>
                  </div>
                </button>


                <button
                  type="button"
                  className={
                    first ===
                    "player2"
                      ? "active p2"
                      : ""
                  }
                  aria-pressed={
                    first ===
                    "player2"
                  }
                  onClick={() =>
                    setFirst(
                      "player2"
                    )
                  }
                >
                  <span>
                    02
                  </span>

                  <div>
                    <b>
                      Jogador 2
                    </b>

                    <small>
                      {
                        p2Name ||
                        "Jogador 2"
                      }
                    </small>
                  </div>
                </button>

              </div>

            </section>


            {error && (
              <div className="local-setup-error">
                <strong>
                  Não foi possível iniciar
                </strong>

                <span>
                  {error}
                </span>
              </div>
            )}


            <footer className="local-start-row">

              <div className="local-start-hint">
                <i />

                <span>
                  Os dois decks serão
                  validados antes do início.
                </span>
              </div>


              <button
                className="primary-btn big local-start-button"
                onClick={
                  start
                }
              >
                <span>
                  Iniciar partida
                </span>

                <b aria-hidden="true">
                  →
                </b>
              </button>

            </footer>

          </section>
        )}

    </main>
  );
}
