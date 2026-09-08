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

import "../styles/v230.css";

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

    /*
     * PRIMEIRO JOGADOR DO PAR
     *
     * Ele cria uma sala usando exatamente
     * o mesmo sistema de Criar Sala
     * já utilizado pelo online atual.
     */
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

    /*
     * SEGUNDO JOGADOR DO PAR
     */
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

    /*
     * Quando o host terminou de criar
     * a sala, o segundo jogador entra
     * usando o joinRoom original.
     */
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

    /*
     * Depois que o segundo jogador entrou,
     * o host inicia normalmente a sala.
     */
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
      <main className="standard-page">
        <header className="page-header">
          <button
            className="ghost"
            onClick={onBack}
          >
            ← Voltar
          </button>

          <h1>
            Online
          </h1>
        </header>

        <EmptyState title="Nenhum deck salvo">
          Crie um deck válido antes de entrar no online.
        </EmptyState>
      </main>
    );
  }

  return (
    <main className="standard-page online-v230-page">
      <header className="page-header">
        <button
          className="ghost"
          onClick={onBack}
        >
          ← Voltar
        </button>

        <div>
          <span className="eyebrow">
            ONLINE 1V1
          </span>

          <h1>
            Partida online
          </h1>
        </div>

        <span
          className={`connection-pill ${status}`}
        >
          {status}
        </span>
      </header>

      <section className="panel online-panel online-v230-panel">
        {!room && (
          <>
            <div className="online-setup-grid">
              <label>
                Deck

                <select
                  value={deckId}
                  disabled={
                    searching
                  }
                  onChange={(
                    event
                  ) =>
                    setDeckId(
                      event
                        .target
                        .value
                    )
                  }
                >
                  {decks.map(
                    (deck) => (
                      <option
                        value={
                          deck.id
                        }
                        key={
                          deck.id
                        }
                      >
                        {
                          deck.name
                        }
                      </option>
                    )
                  )}
                </select>
              </label>

              <div className="online-color-picker">
                <span>
                  Cor do jogador
                </span>

                <div>
                  {PLAYER_COLORS.map(
                    (color) => (
                      <button
                        type="button"
                        key={
                          color.value
                        }
                        title={
                          color.label
                        }
                        aria-label={
                          color.label
                        }
                        disabled={
                          searching
                        }
                        className={
                          playerColor ===
                          color.value
                            ? "selected"
                            : ""
                        }
                        style={{
                          background:
                            color.value
                        }}
                        onClick={() =>
                          chooseColor(
                            color.value
                          )
                        }
                      />
                    )
                  )}
                </div>
              </div>
            </div>

            <section className="quick-match-card">
              <div>
                <span className="eyebrow">
                  PARTIDA RÁPIDA
                </span>

                <h2>
                  Procurar partida
                </h2>

                <p>
                  Encontre automaticamente outro jogador disponível.
                </p>
              </div>

              {!searching ? (
                <button
                  className="primary-btn big"
                  disabled={
                    status !==
                    "conectado"
                  }
                  onClick={
                    findRandomMatch
                  }
                >
                  Procurar partida
                </button>
              ) : (
                <div className="matchmaking-searching">
                  <div className="matchmaking-pulse" />

                  <strong>
                    {
                      searchMessage
                    }
                  </strong>

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

            <div className="online-divider">
              <span>
                OU JOGUE COM UM AMIGO
              </span>
            </div>

            <div className="online-room-options">
              <button
                className="primary-btn"
                disabled={
                  searching
                }
                onClick={
                  createRoom
                }
              >
                Criar sala
              </button>

              <div className="join-box">
                <input
                  placeholder="CÓDIGO"
                  value={
                    joinCode
                  }
                  maxLength={6}
                  disabled={
                    searching
                  }
                  onChange={(
                    event
                  ) =>
                    setJoinCode(
                      event
                        .target
                        .value
                        .toUpperCase()
                    )
                  }
                />

                <button
                  disabled={
                    searching
                  }
                  onClick={
                    joinRoom
                  }
                >
                  Entrar
                </button>
              </div>
            </div>
          </>
        )}

        {room && (
          <div className="room-card">
            <span>
              CÓDIGO DA SALA
            </span>

            <strong>
              {room.code}
            </strong>

            <div className="room-players">
              {[
                "player1",
                "player2"
              ].map(
                (id) => {
                  const roomPlayer =
                    room.players?.[
                      id
                    ];

                  const color =
                    roomPlayer
                      ?.profile
                      ?.playerColor ||
                    (id ===
                    "player1"
                      ? "#68a8ff"
                      : "#e45b63");

                  return (
                    <div
                      key={id}
                      style={{
                        "--room-player-color":
                          color
                      }}
                    >
                      <span className="room-color-dot" />

                      <b>
                        {roomPlayer
                          ?.profile
                          ?.name ||
                          "Aguardando..."}
                      </b>

                      <small>
                        {roomPlayer
                          ?.connected
                          ? "conectado"
                          : "offline"}
                      </small>
                    </div>
                  );
                }
              )}
            </div>

            {room.viewerPlayerId ===
              "player1" &&
              !room.started && (
                <button
                  className="primary-btn big"
                  disabled={
                    !room.players
                      ?.player2
                  }
                  onClick={
                    start
                  }
                >
                  Iniciar partida
                </button>
              )}
          </div>
        )}

        {error && (
          <div className="online-error-box">
            {error}
          </div>
        )}
      </section>
    </main>
  );
}