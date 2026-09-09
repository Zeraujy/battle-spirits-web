import {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import EmptyState from "../components/EmptyState.jsx";

import {
  getDecks,
  getProfile,
  getSettings,
  saveSettings
} from "../services/storage.js";

import {
  createOnlineClient
} from "../online/socketClient.js";

import {
  ONLINE_SERVER_URL
} from "../config/online.js";

import {
  cardIndex
} from "../services/cardRepository.js";

import {
  getCardName,
  resolveCardImage
} from "../game/cardAdapter.js";

import "../styles/v230.css";
import "../styles/onlineLobby.css";


const PLAYER_COLORS = [
  {
    value: "#e45b63",
    label: "Vermelho"
  },
  {
    value: "#a56ce4",
    label: "Roxo"
  },
  {
    value: "#55c987",
    label: "Verde"
  },
  {
    value: "#d7e4f2",
    label: "Branco"
  },
  {
    value: "#f4bd4b",
    label: "Amarelo"
  },
  {
    value: "#68a8ff",
    label: "Azul"
  }
];


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


function RoomPlayerCard({
  id,
  roomPlayer
}) {
  const color =
    roomPlayer
      ?.profile
      ?.playerColor ||
    (
      id === "player1"
        ? "#68a8ff"
        : "#e45b63"
    );

  const name =
    roomPlayer
      ?.profile
      ?.name ||
    "Aguardando...";

  const avatar =
    roomPlayer
      ?.profile
      ?.avatar ||
    null;

  return (
    <div
      className={
        `online-room-player ${
          roomPlayer
            ? "occupied"
            : "waiting"
        }`
      }
      style={{
        "--online-player-color":
          color
      }}
    >
      <span
        className="online-room-player-index"
      >
        {id === "player1"
          ? "01"
          : "02"}
      </span>

      <div className="online-room-avatar">
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

      <div className="online-room-player-copy">
        <small>
          {id === "player1"
            ? "PLAYER 01"
            : "PLAYER 02"}
        </small>

        <strong>
          {name}
        </strong>

        <span>
          {roomPlayer
            ?.connected
            ? "Conectado"
            : roomPlayer
              ? "Offline"
              : "Aguardando jogador"}
        </span>
      </div>

      <i
        className={
          roomPlayer
            ?.connected
            ? "online"
            : ""
        }
      />
    </div>
  );
}


export default function OnlineLobby({
  onBack,
  onMatch
}) {
  const decks = getDecks();
  const profile = getProfile();
  const initialSettings = getSettings();

  const [deckId, setDeckId] = useState(
    decks[0]?.id || ""
  );

  const [playerColor, setPlayerColor] =
    useState(
      initialSettings.onlinePlayerColor ||
        "#68a8ff"
    );

  const [joinCode, setJoinCode] =
    useState("");

  const [room, setRoom] =
    useState(null);

  const [status, setStatus] =
    useState("desconectado");

  const [error, setError] =
    useState("");

  const [
    searching,
    setSearching
  ] = useState(false);

  const [
    searchMessage,
    setSearchMessage
  ] = useState("");

  const handedOffRef =
    useRef(false);

  const searchingRef =
    useRef(false);

  const deckIdRef =
    useRef(deckId);

  const playerColorRef =
    useRef(playerColor);

  const matchmakingPairRef =
    useRef(null);

  const client = useMemo(
    () =>
      createOnlineClient(
        ONLINE_SERVER_URL
      ),
    []
  );

  const selectedDeck =
    useMemo(
      () =>
        decks.find(
          (deck) =>
            deck.id ===
            deckId
        ) ||
        null,
      [
        decks,
        deckId
      ]
    );

  const coverCard =
    useMemo(
      () =>
        getDeckCoverCard(
          selectedDeck
        ),
      [
        selectedDeck
      ]
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
      selectedDeck
    );

  useEffect(() => {
    deckIdRef.current =
      deckId;
  }, [deckId]);

  useEffect(() => {
    playerColorRef.current =
      playerColor;
  }, [playerColor]);

  function updateSearching(
    value,
    message = ""
  ) {
    searchingRef.current =
      value;

    setSearching(value);
    setSearchMessage(message);
  }

  function currentDeck() {
    return decks.find(
      (deck) =>
        deck.id ===
        deckIdRef.current
    );
  }

  function currentProfile() {
    return {
      ...(profile || {}),
      playerColor:
        playerColorRef.current
    };
  }

  function abortMatchmaking(
    pairId,
    reason
  ) {
    client.socket.emit(
      "matchmaking:abort",
      {
        pairId,
        reason
      }
    );

    matchmakingPairRef.current =
      null;

    updateSearching(false);

    if (reason) {
      setError(reason);
    }
  }

  useEffect(() => {
    const socket =
      client.socket;

    const onConnect = () => {
      setStatus("conectado");
    };

    const onDisconnect = () => {
      setStatus(
        "desconectado"
      );
    };

    const onState = (
      state
    ) => {
      setRoom(state);

      if (
        state.started &&
        state.match
      ) {
        handedOffRef.current =
          true;

        updateSearching(
          false
        );

        onMatch({
          match:
            state.match,

          onlineClient:
            client,

          roomState:
            state,

          viewerPlayerId:
            state.viewerPlayerId
        });
      }
    };

    const onMatchmakingStatus = (
      payload
    ) => {
      if (
        payload?.status ===
        "searching"
      ) {
        updateSearching(
          true,
          "Procurando outro jogador..."
        );
      }
    };

    const onMatchmakingHost = (
      payload
    ) => {
      const pairId =
        payload?.pairId;

      if (!pairId) {
        return;
      }

      matchmakingPairRef.current =
        pairId;

      updateSearching(
        true,
        "Adversário encontrado. Preparando a sala..."
      );

      const deck =
        currentDeck();

      if (!deck) {
        abortMatchmaking(
          pairId,
          "O deck selecionado não foi encontrado."
        );

        return;
      }

      client.createRoom(
        {
          profile:
            currentProfile(),

          deck:
            deck.cards
        },
        (result) => {
          if (!result?.ok) {
            abortMatchmaking(
              pairId,
              result?.error ||
                "Não foi possível criar a sala da partida."
            );

            return;
          }

          setRoom(
            result.state
          );

          socket.emit(
            "matchmaking:roomReady",
            {
              pairId,
              code:
                result.code
            },
            (reply) => {
              if (
                !reply?.ok
              ) {
                abortMatchmaking(
                  pairId,
                  reply?.error ||
                    "Não foi possível preparar a partida."
                );
              }
            }
          );
        }
      );
    };

    const onMatchmakingGuest = (
      payload
    ) => {
      matchmakingPairRef.current =
        payload?.pairId ||
        null;

      updateSearching(
        true,
        "Adversário encontrado. Aguardando a sala..."
      );
    };

    const onMatchmakingRoom = (
      payload
    ) => {
      const pairId =
        payload?.pairId;

      const roomCode =
        String(
          payload?.code ||
            ""
        )
          .trim()
          .toUpperCase();

      if (
        !pairId ||
        !roomCode
      ) {
        return;
      }

      const deck =
        currentDeck();

      if (!deck) {
        abortMatchmaking(
          pairId,
          "O deck selecionado não foi encontrado."
        );

        return;
      }

      updateSearching(
        true,
        "Entrando na partida..."
      );

      client.joinRoom(
        {
          code:
            roomCode,

          profile:
            currentProfile(),

          deck:
            deck.cards
        },
        (result) => {
          if (!result?.ok) {
            abortMatchmaking(
              pairId,
              result?.error ||
                "Não foi possível entrar na sala encontrada."
            );

            return;
          }

          setRoom(
            result.state
          );

          socket.emit(
            "matchmaking:joined",
            {
              pairId
            },
            (reply) => {
              if (
                !reply?.ok
              ) {
                abortMatchmaking(
                  pairId,
                  reply?.error ||
                    "Não foi possível confirmar a partida."
                );
              }
            }
          );
        }
      );
    };

    const onMatchmakingStart = (
      payload
    ) => {
      const pairId =
        payload?.pairId;

      updateSearching(
        true,
        "Iniciando partida..."
      );

      client.startRoom(
        {
          firstPlayerId:
            Math.random() <
            0.5
              ? "player1"
              : "player2"
        },
        (result) => {
          if (!result?.ok) {
            abortMatchmaking(
              pairId,
              result?.error ||
                "Não foi possível iniciar a partida."
            );
          }
        }
      );
    };

    const onMatchmakingFailed = (
      payload
    ) => {
      matchmakingPairRef.current =
        null;

      updateSearching(
        false
      );

      setError(
        payload?.error ||
          "A busca foi interrompida."
      );
    };

    socket.on(
      "connect",
      onConnect
    );

    socket.on(
      "disconnect",
      onDisconnect
    );

    socket.on(
      "room:state",
      onState
    );

    socket.on(
      "matchmaking:status",
      onMatchmakingStatus
    );

    socket.on(
      "matchmaking:host",
      onMatchmakingHost
    );

    socket.on(
      "matchmaking:guest",
      onMatchmakingGuest
    );

    socket.on(
      "matchmaking:room",
      onMatchmakingRoom
    );

    socket.on(
      "matchmaking:start",
      onMatchmakingStart
    );

    socket.on(
      "matchmaking:failed",
      onMatchmakingFailed
    );

    client.connect();

    return () => {
      socket.off(
        "connect",
        onConnect
      );

      socket.off(
        "disconnect",
        onDisconnect
      );

      socket.off(
        "room:state",
        onState
      );

      socket.off(
        "matchmaking:status",
        onMatchmakingStatus
      );

      socket.off(
        "matchmaking:host",
        onMatchmakingHost
      );

      socket.off(
        "matchmaking:guest",
        onMatchmakingGuest
      );

      socket.off(
        "matchmaking:room",
        onMatchmakingRoom
      );

      socket.off(
        "matchmaking:start",
        onMatchmakingStart
      );

      socket.off(
        "matchmaking:failed",
        onMatchmakingFailed
      );

      if (
        searchingRef.current
      ) {
        socket.emit(
          "matchmaking:cancel"
        );
      }

      if (
        !handedOffRef.current
      ) {
        client.disconnect();
      }
    };
  }, [
    client,
    onMatch
  ]);

  function chooseColor(
    color
  ) {
    setPlayerColor(color);

    saveSettings({
      ...getSettings(),

      onlinePlayerColor:
        color
    });
  }

  function cancelSearch() {
    client.socket.emit(
      "matchmaking:cancel",
      {},
      () => {}
    );

    matchmakingPairRef.current =
      null;

    updateSearching(false);
    setError("");
  }

  function findRandomMatch() {
    const deck =
      currentDeck();

    if (!deck) {
      setError(
        "Escolha um deck."
      );

      return;
    }

    if (
      status !==
      "conectado"
    ) {
      setError(
        "Aguarde a conexão com o servidor."
      );

      return;
    }

    setError("");

    updateSearching(
      true,
      "Procurando outro jogador..."
    );

    client.socket.emit(
      "matchmaking:join",
      {},
      (result) => {
        if (!result?.ok) {
          updateSearching(
            false
          );

          setError(
            result?.error ||
              "Não foi possível iniciar a busca."
          );
        }
      }
    );
  }

  function createRoom() {
    const deck =
      currentDeck();

    if (!deck) {
      setError(
        "Escolha um deck."
      );

      return;
    }

    if (
      searchingRef.current
    ) {
      cancelSearch();
    }

    setError("");

    client.createRoom(
      {
        profile:
          currentProfile(),

        deck:
          deck.cards
      },
      (result) => {
        if (
          result?.ok
        ) {
          setRoom(
            result.state
          );
        } else {
          setError(
            result?.error ||
              "Não foi possível criar a sala."
          );
        }
      }
    );
  }

  function joinRoom() {
    const deck =
      currentDeck();

    if (!deck) {
      setError(
        "Escolha um deck."
      );

      return;
    }

    const code =
      joinCode
        .trim()
        .toUpperCase();

    if (!code) {
      setError(
        "Digite o código da sala."
      );

      return;
    }

    if (
      searchingRef.current
    ) {
      cancelSearch();
    }

    setError("");

    client.joinRoom(
      {
        code,

        profile:
          currentProfile(),

        deck:
          deck.cards
      },
      (result) => {
        if (
          result?.ok
        ) {
          setRoom(
            result.state
          );
        } else {
          setError(
            result?.error ||
              "Não foi possível entrar na sala."
          );
        }
      }
    );
  }

  function start() {
    client.startRoom(
      {
        firstPlayerId:
          Math.random() <
          0.5
            ? "player1"
            : "player2"
      },
      (result) => {
        if (
          !result?.ok
        ) {
          setError(
            result?.error ||
              "Não foi possível iniciar a partida."
          );
        }
      }
    );
  }

  if (!decks.length) {
    return (
      <main className="standard-page online-lobby-page">
        <header className="online-lobby-topbar">
          <button
            className="ghost online-back-button"
            onClick={onBack}
          >
            <span aria-hidden="true">←</span>
            Voltar
          </button>

          <div className="online-lobby-title">
            <span className="eyebrow">
              ONLINE 1V1
            </span>

            <h1>
              Partida online
            </h1>

            <p>
              Prepare seu deck antes de entrar no servidor.
            </p>
          </div>
        </header>

        <EmptyState title="Nenhum deck salvo">
          Crie um deck válido antes de entrar no online.
        </EmptyState>
      </main>
    );
  }

  return (
    <main className="standard-page online-lobby-page">

      <header className="online-lobby-topbar">

        <button
          className="ghost online-back-button"
          onClick={onBack}
        >
          <span aria-hidden="true">
            ←
          </span>

          Voltar
        </button>


        <div className="online-lobby-title">
          <span className="eyebrow">
            ONLINE 1V1
          </span>

          <h1>
            Partida online
          </h1>

          <p>
            Encontre um oponente ou jogue diretamente com um amigo.
          </p>
        </div>


        <div
          className={
            `online-connection-card ${
              status
            }`
          }
        >
          <i />

          <div>
            <span>
              SERVIDOR
            </span>

            <strong>
              {status === "conectado"
                ? "ONLINE"
                : "OFFLINE"}
            </strong>
          </div>
        </div>

      </header>


      {!room ? (
        <section className="online-lobby-shell">

          <section
            className="online-player-setup"
            style={{
              "--online-player-color":
                playerColor
            }}
          >

            <div className="online-cover-column">
              <div className="online-cover-frame">
                <img
                  src={coverImage}
                  alt=""
                />

                <span className="online-cover-shine" />
              </div>

              <span>
                DECK COVER
              </span>
            </div>


            <div className="online-player-main">

              <header className="online-player-header">

                <div className="online-player-identity">

                  <div className="online-player-avatar">
                    {profile?.avatar
                      ? (
                        <img
                          src={profile.avatar}
                          alt=""
                        />
                      )
                      : (
                        <span>
                          {getInitials(
                            profile?.name ||
                            "Jogador"
                          )}
                        </span>
                      )}
                  </div>


                  <div>
                    <span className="online-player-kicker">
                      SEU DUELISTA
                    </span>

                    <h2>
                      {profile?.name ||
                        "Jogador"}
                    </h2>
                  </div>

                </div>


                <div className="online-player-status">
                  <i />

                  <span>
                    {status === "conectado"
                      ? "PRONTO"
                      : "AGUARDANDO"}
                  </span>
                </div>

              </header>


              <div className="online-deck-select-row">

                <label>
                  <span>
                    Deck
                  </span>

                  <select
                    value={deckId}
                    disabled={searching}
                    onChange={(
                      event
                    ) =>
                      setDeckId(
                        event.target.value
                      )
                    }
                  >
                    {decks.map(
                      (deck) => (
                        <option
                          value={deck.id}
                          key={deck.id}
                        >
                          {deck.name}
                        </option>
                      )
                    )}
                  </select>
                </label>


                <div className="online-color-section">

                  <div className="online-color-heading">
                    <span>
                      Cor do jogador
                    </span>

                    <small>
                      Identidade visual na mesa
                    </small>
                  </div>


                  <div className="online-color-options">
                    {PLAYER_COLORS.map(
                      (color) => (
                        <button
                          type="button"
                          key={color.value}
                          title={color.label}
                          aria-label={color.label}
                          disabled={searching}
                          className={
                            playerColor ===
                            color.value
                              ? "selected"
                              : ""
                          }
                          style={{
                            "--picker-color":
                              color.value,
                            background:
                              color.value
                          }}
                          onClick={() =>
                            chooseColor(
                              color.value
                            )
                          }
                        >
                          <span />
                        </button>
                      )
                    )}
                  </div>

                </div>

              </div>


              <footer className="online-deck-meta">

                <div>
                  <span>
                    DECK
                  </span>

                  <strong>
                    {selectedDeck?.name ||
                      "Nenhum"}
                  </strong>
                </div>


                <div>
                  <span>
                    CARTAS
                  </span>

                  <strong>
                    {totalCards}
                  </strong>
                </div>


                <div className="online-deck-cover-name">
                  <span>
                    CAPA
                  </span>

                  <strong title={coverName}>
                    {coverName}
                  </strong>
                </div>

              </footer>

            </div>

          </section>


          <section
            className={
              `online-matchmaking-card ${
                searching
                  ? "searching"
                  : ""
              }`
            }
          >

            <div className="online-matchmaking-copy">

              <div className="online-matchmaking-icon">
                <span>
                  VS
                </span>
              </div>


              <div>
                <span className="eyebrow">
                  PARTIDA RÁPIDA
                </span>

                <h2>
                  {searching
                    ? "Buscando oponente"
                    : "Procurar partida"}
                </h2>

                <p>
                  {searching
                    ? (
                      searchMessage ||
                      "Procurando outro jogador..."
                    )
                    : "Encontre automaticamente outro jogador disponível e entre direto na batalha."}
                </p>
              </div>

            </div>


            {!searching ? (
              <button
                className="primary-btn big online-matchmaking-button"
                disabled={
                  status !==
                  "conectado"
                }
                onClick={
                  findRandomMatch
                }
              >
                <span>
                  Procurar partida
                </span>

                <b aria-hidden="true">
                  →
                </b>
              </button>
            ) : (
              <div className="online-searching-actions">

                <div className="online-search-pulse">
                  <i />
                  <i />
                  <i />
                </div>


                <button
                  className="ghost"
                  onClick={
                    cancelSearch
                  }
                >
                  Cancelar busca
                </button>

              </div>
            )}

          </section>


          <div className="online-friends-divider">
            <span />

            <b>
              OU JOGUE COM UM AMIGO
            </b>

            <span />
          </div>


          <section className="online-friends-grid">

            <article className="online-friend-card create">

              <div className="online-friend-icon">
                +
              </div>


              <div className="online-friend-copy">
                <span className="eyebrow">
                  NOVA SALA
                </span>

                <h3>
                  Criar sala
                </h3>

                <p>
                  Gere um código e envie para seu amigo entrar.
                </p>
              </div>


              <button
                className="primary-btn"
                disabled={searching}
                onClick={createRoom}
              >
                Criar sala
              </button>

            </article>


            <article className="online-friend-card join">

              <div className="online-friend-icon">
                #
              </div>


              <div className="online-friend-copy">
                <span className="eyebrow">
                  CÓDIGO
                </span>

                <h3>
                  Entrar em sala
                </h3>

                <p>
                  Digite o código recebido para entrar na partida.
                </p>
              </div>


              <div className="online-join-row">

                <input
                  placeholder="CÓDIGO"
                  value={joinCode}
                  maxLength={6}
                  disabled={searching}
                  onChange={(
                    event
                  ) =>
                    setJoinCode(
                      event.target.value
                        .toUpperCase()
                    )
                  }
                  onKeyDown={(
                    event
                  ) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      joinRoom();
                    }
                  }}
                />


                <button
                  disabled={searching}
                  onClick={joinRoom}
                >
                  Entrar
                </button>

              </div>

            </article>

          </section>


          {error && (
            <div className="online-lobby-error">
              <strong>
                Não foi possível continuar
              </strong>

              <span>
                {error}
              </span>
            </div>
          )}

        </section>
      ) : (
        <section className="online-room-shell">

          <header className="online-room-heading">

            <div>
              <span className="eyebrow">
                SALA PRIVADA
              </span>

              <h2>
                Aguardando batalha
              </h2>

              <p>
                Compartilhe o código com seu adversário.
              </p>
            </div>


            <div className="online-room-code">
              <span>
                CÓDIGO DA SALA
              </span>

              <strong>
                {room.code}
              </strong>
            </div>

          </header>


          <div className="online-room-duel">

            <RoomPlayerCard
              id="player1"
              roomPlayer={
                room.players?.player1
              }
            />


            <div className="online-room-vs">
              <span>
                VS
              </span>
            </div>


            <RoomPlayerCard
              id="player2"
              roomPlayer={
                room.players?.player2
              }
            />

          </div>


          <footer className="online-room-footer">

            <div className="online-room-hint">
              <i />

              <span>
                {room.players?.player2
                  ? "Os dois jogadores estão na sala."
                  : "Aguardando o segundo jogador entrar."}
              </span>
            </div>


            {room.viewerPlayerId ===
              "player1" &&
              !room.started && (
                <button
                  className="primary-btn big online-room-start"
                  disabled={
                    !room.players?.player2
                  }
                  onClick={start}
                >
                  <span>
                    Iniciar partida
                  </span>

                  <b aria-hidden="true">
                    →
                  </b>
                </button>
              )}

          </footer>


          {error && (
            <div className="online-lobby-error">
              <strong>
                Não foi possível continuar
              </strong>

              <span>
                {error}
              </span>
            </div>
          )}

        </section>
      )}

    </main>
  );
}
