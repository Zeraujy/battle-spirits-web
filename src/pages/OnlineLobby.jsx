import {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import EmptyState from "../components/common/EmptyState.jsx";

import {
  getDecks,
  getProfile,
  getSettings
} from "../services/storage.js";

import {
  createOnlineClient
} from "../online/socketClient.js";

import {
  ONLINE_SERVER_URL
} from "../config/online.js";

import {
  createOnlinePublicProfile
} from "../online/publicProfile.js";

import {
  DeckPicker,
  MatchMenuButton,
  MatchSetupMenu,
  MatchSetupScreen,
  PlayerBattlePreview,
  VersusMark,
  deckIsValid,
  deckSize,
  getDeckPortrait
} from "../components/match/MatchSetupScreen.jsx";

import "../styles/theme/v230.css";
import "../styles/pages/onlineLobbySafe.css";


export default function OnlineLobby({
  onBack,
  onMatch,
  onDeckBuilder
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
        initialSettings.preferredPlayerColor ||
        "#d8d8d8"
    );

  const [joinCode, setJoinCode] =
    useState("");

  const [room, setRoom] =
    useState(null);

  const [status, setStatus] =
    useState("desconectado");

  const [error, setError] =
    useState("");

  const [panelMode, setPanelMode] = useState("root");
  const [deckPickerOpen, setDeckPickerOpen] = useState(false);

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

  async function currentOnlineProfile() {
    return createOnlinePublicProfile(
      profile || {},
      playerColorRef.current
    );
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

    const onConnectError = (connectionError) => {
      setStatus("erro");
      setError(
        connectionError?.message
          ? `Falha ao conectar ao servidor Online: ${connectionError.message}`
          : "Falha ao conectar ao servidor Online."
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
    const onMatchmakingHost = async (
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
            await currentOnlineProfile(),

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
    const onMatchmakingRoom = async (
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
            await currentOnlineProfile(),

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
      "connect_error",
      onConnectError
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
        "connect_error",
        onConnectError
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

  async function createRoom() {
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
          await currentOnlineProfile(),

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

  async function joinRoom() {
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
          await currentOnlineProfile(),

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

  const selectedDeck = decks.find((deck) => deck.id === deckId) || null;
  const viewerId = room?.viewerPlayerId || null;
  const ownRoomPlayer = viewerId ? room?.players?.[viewerId] : null;
  const opponentId = viewerId === "player1" ? "player2" : viewerId === "player2" ? "player1" : null;
  const opponentRoomPlayer = opponentId ? room?.players?.[opponentId] : null;
  const ownName = ownRoomPlayer?.profile?.name || profile?.displayName || profile?.name || "Jogador";
  const opponentName = searching
    ? "PROCURANDO..."
    : opponentRoomPlayer?.profile?.name || (room ? "AGUARDANDO..." : "AGUARDANDO OPONENTE");
  const opponentConnected = Boolean(opponentRoomPlayer?.connected);

  function copyRoomCode() {
    if (!room?.code) return;
    try { navigator.clipboard?.writeText(room.code); } catch {}
    setSearchMessage(`Código ${room.code} copiado.`);
  }

  const normalMenu = (() => {
    if (room) {
      const isHost = room.viewerPlayerId === "player1";
      return (
        <MatchSetupMenu
          eyebrow="MULTIPLAYER ONLINE"
          titleTop="PARTIDA"
          titleBottom="NORMAL"
          status={`SALA ${room.code} · ${status.toUpperCase()}`}
          badge="ROOM"
        >
          {isHost && !room.started && (
            <MatchMenuButton
              label="Iniciar partida"
              detail={room.players?.player2 ? "Os dois jogadores estão prontos" : "Aguardando o segundo jogador"}
              active={Boolean(room.players?.player2)}
              disabled={!room.players?.player2}
              onClick={start}
            />
          )}
          {!isHost && (
            <MatchMenuButton
              label="Aguardando host"
              detail="O criador da sala inicia a partida"
              active
              disabled
            />
          )}
          <MatchMenuButton label={`Código: ${room.code}`} detail="Copiar código da sala" onClick={copyRoomCode} />
          <MatchMenuButton label="Voltar" detail="Sair desta tela e desconectar" onClick={onBack} />
        </MatchSetupMenu>
      );
    }

    if (searching) {
      return (
        <MatchSetupMenu
          eyebrow="MULTIPLAYER ONLINE"
          titleTop="PARTIDA"
          titleBottom="NORMAL"
          status={searchMessage || "Procurando adversário..."}
          badge={status.toUpperCase()}
        >
          <MatchMenuButton label="Cancelar busca" detail="Sair da fila de matchmaking" active onClick={cancelSearch} />
          <MatchMenuButton label="Voltar" disabled />
        </MatchSetupMenu>
      );
    }

    if (panelMode === "join") {
      return (
        <MatchSetupMenu
          eyebrow="MULTIPLAYER ONLINE"
          titleTop="ENTRAR EM"
          titleBottom="SALA"
          status={`SERVIDOR · ${status.toUpperCase()}`}
        >
          <div className="match-menu-inline">
            <input
              autoFocus
              placeholder="CÓDIGO"
              value={joinCode}
              maxLength={6}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              onKeyDown={(event) => { if (event.key === "Enter") joinRoom(); }}
            />
            <button type="button" onClick={joinRoom}>Entrar</button>
          </div>
          <MatchMenuButton label="Voltar" onClick={() => setPanelMode("root")} />
        </MatchSetupMenu>
      );
    }

    return (
      <MatchSetupMenu
        eyebrow="MULTIPLAYER ONLINE"
        titleTop="TIPO DE"
        titleBottom="PARTIDA"
        status={`SERVIDOR · ${status.toUpperCase()}`}
        badge="NORMAL"
      >
        <MatchMenuButton
          label="Procurar partida"
          detail="Matchmaking rápido"
          active
          disabled={status !== "conectado" || !selectedDeck}
          onClick={findRandomMatch}
        />
        <MatchMenuButton label="Criar sala" detail="Abra uma sala privada" disabled={status !== "conectado" || !selectedDeck} onClick={createRoom} />
        <MatchMenuButton label="Entrar em uma sala" detail="Use um código de convite" disabled={status !== "conectado" || !selectedDeck} onClick={() => setPanelMode("join")} />
        <MatchMenuButton label="Deck Builder" onClick={onDeckBuilder} />
        <MatchMenuButton label="Voltar" onClick={onBack} />
      </MatchSetupMenu>
    );
  })();

  return (
    <>
      <MatchSetupScreen
        className="online-match-setup"
        error={error}
        footer={room ? `ONLINE 1V1 · SALA ${room.code}` : searching ? "ONLINE 1V1 · MATCHMAKING EM ANDAMENTO" : "ONLINE 1V1 · MATCHMAKING, SALAS PRIVADAS E CÓDIGO"}
        menu={normalMenu}
      >
        <div className="match-setup-duel">
          <PlayerBattlePreview
            side="left"
            kicker="VOCÊ"
            name={ownName}
            avatarSrc={profile?.avatar || profile?.avatarUrl || profile?.avatar_url || profile?.photoURL || profile?.photo || null}
            bannerSrc={getDeckPortrait(selectedDeck)}
            deck={selectedDeck}
            deckName={selectedDeck?.name || "Nenhum deck"}
            deckMeta={selectedDeck ? `${deckSize(selectedDeck)} cartas · ${deckIsValid(selectedDeck) ? "pronto" : "revisar"}` : "crie um deck para jogar"}
            onChangeDeck={!room && !searching && decks.length ? () => setDeckPickerOpen(true) : null}
            status={status === "conectado" ? "ONLINE" : status.toUpperCase()}
          />

          <VersusMark />

          <PlayerBattlePreview
            side="right"
            kicker={room ? "OPONENTE" : "MATCHMAKING"}
            name={opponentName}
            avatarSrc={opponentRoomPlayer?.profile?.avatar || opponentRoomPlayer?.profile?.avatarUrl || opponentRoomPlayer?.profile?.avatar_url || null}
            bannerSrc={opponentRoomPlayer ? "./images/card-back.webp" : null}
            deckName={opponentRoomPlayer ? "Deck adversário" : searching ? "Buscando jogador" : "Aguardando conexão"}
            deckMeta={opponentRoomPlayer ? (opponentConnected ? "conectado · identidade pública" : "offline") : "o deck será revelado apenas quando permitido"}
            status={opponentRoomPlayer ? (opponentConnected ? "CONECTADO" : "OFFLINE") : searching ? "BUSCANDO" : "ESPERA"}
            waiting={!opponentRoomPlayer}
          />
        </div>
      </MatchSetupScreen>

      <DeckPicker
        open={deckPickerOpen}
        title="DECK PARA O ONLINE"
        decks={decks}
        selectedId={deckId}
        onSelect={setDeckId}
        onClose={() => setDeckPickerOpen(false)}
        onDeckBuilder={onDeckBuilder}
      />
    </>
  );
}
