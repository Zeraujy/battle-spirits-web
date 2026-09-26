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
  deckValidationOptionsForSettings
} from "../online/customMatchSettings.js";

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

  const [joinPassword, setJoinPassword] = useState("");
  const [roomTitle, setRoomTitle] = useState(`${profile?.displayName || profile?.name || "Jogador"} · Casual`);
  const [roomVisibility, setRoomVisibility] = useState("public");
  const [roomPassword, setRoomPassword] = useState("");
  const [spectatorsAllowed, setSpectatorsAllowed] = useState(false);
  const [firstPlayerMode, setFirstPlayerMode] = useState("random");
  const [turnTimerSeconds, setTurnTimerSeconds] = useState(0);
  const [mulliganEnabled, setMulliganEnabled] = useState(true);
  const [roomRuleset, setRoomRuleset] = useState("eternal");
  const [lobbySnapshot, setLobbySnapshot] = useState({ rooms: [], players: [], counts: {} });
  const [roomFilter, setRoomFilter] = useState("open");

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

    const onConnect = async () => {
      setStatus("conectado");
      setError("");
      try {
        socket.emit("lobby:identify", { profile: await currentOnlineProfile() }, (result) => {
          if (result?.snapshot) setLobbySnapshot(result.snapshot);
        });
      } catch {}
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
          ? `Não foi possível conectar ao Online: ${connectionError.message}`
          : "Não foi possível conectar ao Online."
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

    const onLobbySnapshot = (snapshot) => {
      if (snapshot) setLobbySnapshot(snapshot);
    };

    socket.on("lobby:snapshot", onLobbySnapshot);

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
      socket.off("lobby:snapshot", onLobbySnapshot);

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

    if (!deckIsValid(deck, deckValidationOptionsForSettings({ ruleset: roomRuleset }))) {
      setError(roomRuleset === "official"
        ? "Este deck precisa estar apto ao regulamento oficial atual."
        : roomRuleset === "lab"
          ? "Revise o deck antes de criar a sala LAB."
          : "Este deck precisa estar válido no formato Eternal.");
      return;
    }

    if (
      status !==
      "conectado"
    ) {
      setError(
        "Aguarde a conexão Online."
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
          deck.cards,

        settings: {
          title: roomTitle,
          visibility: roomVisibility,
          password: roomPassword,
          spectatorsAllowed,
          firstPlayerMode,
          turnTimerSeconds,
          mulliganEnabled,
          ruleset: roomRuleset
        }
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
          deck.cards,

        password:
          joinPassword
      },
      (result) => {
        if (
          result?.ok
        ) {
          setRoom(
            result.state
          );
          setJoinPassword("");
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
      {},
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

  function refreshLobby() {
    client.socket.emit("lobby:list", {}, (result) => {
      if (result?.snapshot) setLobbySnapshot(result.snapshot);
    });
  }

  function choosePublicRoom(entry) {
    if (!entry?.code) return;
    setJoinCode(entry.code);
    setJoinPassword("");
    setPanelMode("join");
    setError("");
  }

  const visibleRooms = (lobbySnapshot.rooms || []).filter((entry) => {
    if (roomFilter === "all") return true;
    return !entry.started && Number(entry.players || 0) < Number(entry.capacity || 2);
  });

  const normalMenu = (() => {
    if (room) {
      const isHost = room.viewerPlayerId === "player1";
      return (
        <MatchSetupMenu
          eyebrow="MULTIPLAYER ONLINE"
          titleTop="PARTIDA"
          titleBottom="NORMAL"
          status={`${room.settings?.title || `SALA ${room.code}`} · ${status.toUpperCase()}`}
          badge={room.settings?.visibility === "public" ? "PUBLIC" : "PRIVATE"}
        >
          <div className="online-custom-summary">
            <span><b>Início</b>{room.settings?.firstPlayerMode === "host" ? "Host" : room.settings?.firstPlayerMode === "guest" ? "Convidado" : "Aleatório"}</span>
            <span><b>Turno</b>{room.settings?.turnTimerSeconds ? `${room.settings.turnTimerSeconds}s` : "Sem limite"}</span>
            <span><b>Mulligan</b>{room.settings?.mulliganEnabled === false ? "Desativado" : "Ativo"}</span>
            <span><b>Regras</b>{room.settings?.ruleset === "lab" ? "LAB" : room.settings?.ruleset === "official" ? "Eternal Oficial" : "Eternal"}</span>
          </div>
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

    if (panelMode === "create") {
      return (
        <MatchSetupMenu
          eyebrow="MULTIPLAYER ONLINE"
          titleTop="CRIAR"
          titleBottom="SALA"
          status={`ONLINE · ${status.toUpperCase()}`}
          badge={roomVisibility === "public" ? "PUBLIC" : "PRIVATE"}
        >
          <div className="online-lobby2-form">
            <label>
              <span>Nome da sala</span>
              <input value={roomTitle} maxLength={48} onChange={(event) => setRoomTitle(event.target.value)} placeholder="Minha sala" />
            </label>
            <label>
              <span>Visibilidade</span>
              <select value={roomVisibility} onChange={(event) => setRoomVisibility(event.target.value)}>
                <option value="public">Pública · aparece no lobby</option>
                <option value="private">Privada · somente por código</option>
              </select>
            </label>
            <label>
              <span>Senha opcional</span>
              <input type="password" value={roomPassword} maxLength={64} onChange={(event) => setRoomPassword(event.target.value)} placeholder="Sem senha" />
            </label>
            <div className="online-custom-settings">
              <div className="online-custom-settings-heading">
                <span>CONFIGURAÇÕES DA PARTIDA</span>
                <small>Somente Online Normal · Ranked ignora estas opções</small>
              </div>
              <label>
                <span>Primeiro jogador</span>
                <select value={firstPlayerMode} onChange={(event) => setFirstPlayerMode(event.target.value)}>
                  <option value="random">Aleatório a cada partida</option>
                  <option value="host">Host começa</option>
                  <option value="guest">Convidado começa</option>
                </select>
              </label>
              <label>
                <span>Tempo por turno</span>
                <select value={turnTimerSeconds} onChange={(event) => setTurnTimerSeconds(Number(event.target.value))}>
                  <option value={0}>Sem limite</option>
                  <option value={60}>60 segundos</option>
                  <option value={90}>90 segundos</option>
                  <option value={120}>120 segundos</option>
                  <option value={180}>180 segundos</option>
                </select>
              </label>
              <label>
                <span>Regras do deck</span>
                <select value={roomRuleset} onChange={(event) => setRoomRuleset(event.target.value)}>
                  <option value="eternal">Eternal · partida casual</option>
                  <option value="official">Eternal · regulamento oficial</option>
                  <option value="lab">LAB · teste de decks</option>
                </select>
                {roomRuleset === "official" && <small className="online-custom-warning">Usa a lista oficial de cartas proibidas e limitadas vigente.</small>}
                {roomRuleset === "lab" && <small className="online-custom-warning">LAB permite decks a partir de 1 carta e até 99 cópias pelo mesmo nome. Use apenas para testes.</small>}
              </label>
              <label className="online-lobby2-check">
                <input type="checkbox" checked={mulliganEnabled} onChange={(event) => setMulliganEnabled(event.target.checked)} />
                <span>Permitir Mulligan no início da partida</span>
              </label>
            </div>
            <label className="online-lobby2-check">
              <input type="checkbox" checked={spectatorsAllowed} onChange={(event) => setSpectatorsAllowed(event.target.checked)} />
              <span>Permitir espectadores quando o modo estiver disponível</span>
            </label>
          </div>
          <MatchMenuButton label="Criar sala" detail={roomVisibility === "public" ? "Publicar no Lobby Online" : "Gerar código privado"} active disabled={status !== "conectado" || !selectedDeck || !deckIsValid(selectedDeck, deckValidationOptionsForSettings({ ruleset: roomRuleset }))} onClick={createRoom} />
          <MatchMenuButton label="Voltar" onClick={() => setPanelMode("root")} />
        </MatchSetupMenu>
      );
    }

    if (panelMode === "join") {
      return (
        <MatchSetupMenu
          eyebrow="MULTIPLAYER ONLINE"
          titleTop="ENTRAR EM"
          titleBottom="SALA"
          status={`ONLINE · ${status.toUpperCase()}`}
        >
          <div className="online-lobby2-form">
            <label>
              <span>Código da sala</span>
              <input
                autoFocus
                placeholder="ABC123"
                value={joinCode}
                maxLength={6}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                onKeyDown={(event) => { if (event.key === "Enter") joinRoom(); }}
              />
            </label>
            <label>
              <span>Senha, se necessária</span>
              <input type="password" placeholder="Senha da sala" value={joinPassword} maxLength={64} onChange={(event) => setJoinPassword(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") joinRoom(); }} />
            </label>
          </div>
          <MatchMenuButton label="Entrar" detail="Conectar usando código da sala" active disabled={!joinCode.trim()} onClick={joinRoom} />
          <MatchMenuButton label="Voltar" onClick={() => setPanelMode("root")} />
        </MatchSetupMenu>
      );
    }

    return (
      <MatchSetupMenu
        eyebrow="MULTIPLAYER ONLINE"
        titleTop="TIPO DE"
        titleBottom="PARTIDA"
        status={`ONLINE · ${status.toUpperCase()}`}
        badge="NORMAL"
      >
        <MatchMenuButton
          label="Procurar partida"
          detail="Matchmaking rápido"
          active
          disabled={status !== "conectado" || !selectedDeck}
          onClick={findRandomMatch}
        />
        <MatchMenuButton label="Criar sala" detail="Pública, privada ou protegida por senha" disabled={status !== "conectado" || !selectedDeck} onClick={() => setPanelMode("create")} />
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
        {room || searching ? (
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
        ) : (
          <div className="online-lobby2-dashboard">
            <header className="online-lobby2-hero">
              <div>
                <span>CUSTOM MATCH · ONLINE LOBBY</span>
                <h2>ENCONTRE SUA PRÓXIMA BATALHA</h2>
                <p>Salas públicas, convites privados e jogadores conectados em uma única tela.</p>
              </div>
              <button type="button" onClick={refreshLobby}>Atualizar lobby</button>
            </header>

            <div className="online-lobby2-stats">
              <article><strong>{lobbySnapshot.counts?.online || 0}</strong><span>Jogadores online</span></article>
              <article><strong>{lobbySnapshot.counts?.available || 0}</strong><span>Disponíveis</span></article>
              <article><strong>{lobbySnapshot.counts?.publicRooms || 0}</strong><span>Salas públicas</span></article>
              <article><strong>{lobbySnapshot.counts?.activeMatches || 0}</strong><span>Partidas ativas</span></article>
            </div>

            <div className="online-lobby2-grid">
              <section className="online-lobby2-card rooms">
                <header>
                  <div><span>SALAS</span><h3>Partidas públicas</h3></div>
                  <div className="online-lobby2-tabs">
                    <button type="button" className={roomFilter === "open" ? "active" : ""} onClick={() => setRoomFilter("open")}>Abertas</button>
                    <button type="button" className={roomFilter === "all" ? "active" : ""} onClick={() => setRoomFilter("all")}>Todas</button>
                  </div>
                </header>
                <div className="online-lobby2-room-list">
                  {visibleRooms.length ? visibleRooms.map((entry) => (
                    <button type="button" key={entry.code} className="online-lobby2-room" disabled={entry.started || entry.players >= entry.capacity} onClick={() => choosePublicRoom(entry)}>
                      <span className="online-lobby2-room-main">
                        <b>{entry.title}</b>
                        <small>{entry.host?.name || "Jogador"}{entry.host?.username ? ` · @${entry.host.username}` : ""}</small>
                      </span>
                      <span className="online-lobby2-room-tags">
                        {entry.locked && <em>LOCK</em>}
                        {entry.spectatorsAllowed && <em>WATCH</em>}
                        {entry.custom?.turnTimerSeconds > 0 && <em>{entry.custom.turnTimerSeconds}s</em>}
                        {entry.custom?.ruleset === "official" && <em>OFICIAL</em>}
                        {entry.custom?.ruleset === "lab" && <em>LAB</em>}
                        {entry.custom?.firstPlayerMode !== "random" && <em>{entry.custom.firstPlayerMode === "host" ? "HOST 1ST" : "GUEST 1ST"}</em>}
                        <em>{entry.started ? "EM JOGO" : `${entry.players}/${entry.capacity}`}</em>
                      </span>
                      <i>{entry.code}</i>
                    </button>
                  )) : (
                    <div className="online-lobby2-empty">Nenhuma sala pública aberta agora. Você pode criar a primeira.</div>
                  )}
                </div>
              </section>

              <section className="online-lobby2-card players">
                <header><div><span>PRESENÇA</span><h3>Jogadores conectados</h3></div></header>
                <div className="online-lobby2-player-list">
                  {(lobbySnapshot.players || []).slice(0, 12).map((entry) => (
                    <div className="online-lobby2-player" key={entry.id}>
                      <div className="online-lobby2-avatar">
                        {entry.profile?.avatar ? <img src={entry.profile.avatar} alt="" /> : <span>{String(entry.profile?.name || "P").slice(0, 1).toUpperCase()}</span>}
                      </div>
                      <span><b>{entry.profile?.name || "Jogador"}</b><small>{entry.profile?.username ? `@${entry.profile.username}` : "Jogador Online"}</small></span>
                      <em className={`status-${entry.status}`}>{entry.status === "available" ? "DISPONÍVEL" : entry.status === "searching" ? "BUSCANDO" : entry.status === "in_room" ? "EM SALA" : entry.status === "in_match" ? "EM PARTIDA" : "RANKED"}</em>
                    </div>
                  ))}
                  {!(lobbySnapshot.players || []).length && <div className="online-lobby2-empty">Conectando à presença do lobby...</div>}
                </div>
              </section>
            </div>

            <footer className="online-lobby2-deck">
              <div>
                <span>DECK ATUAL</span>
                <strong>{selectedDeck?.name || "Nenhum deck selecionado"}</strong>
                <small>{selectedDeck ? `${deckSize(selectedDeck)} cartas · ${deckIsValid(selectedDeck) ? "PRONTO" : "REVISAR"}` : "Selecione um deck antes de jogar"}</small>
              </div>
              <button type="button" disabled={!decks.length} onClick={() => setDeckPickerOpen(true)}>Trocar deck</button>
            </footer>
          </div>
        )}
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
