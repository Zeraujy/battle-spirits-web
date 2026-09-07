import { useEffect, useMemo, useRef, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import { getDecks, getProfile, getSettings, saveSettings } from "../services/storage.js";
import { createOnlineClient } from "../online/socketClient.js";

const PLAYER_COLORS = [
  { id: "blue", value: "#68a8ff", label: "Azul" },
  { id: "red", value: "#ee6c78", label: "Vermelho" },
  { id: "green", value: "#79dda8", label: "Verde" },
  { id: "yellow", value: "#f4bd4b", label: "Amarelo" },
  { id: "purple", value: "#a78bfa", label: "Roxo" },
  { id: "pink", value: "#f28acb", label: "Rosa" },
  { id: "cyan", value: "#5ed6e5", label: "Ciano" },
  { id: "orange", value: "#f59e58", label: "Laranja" }
];

export default function OnlineLobby({ onBack, onMatch }) {
  const decks = getDecks();
  const profile = getProfile();
  const initialSettings = getSettings();
  const [serverUrl, setServerUrl] = useState(initialSettings.onlineServerUrl || "http://localhost:3001");
  const [deckId, setDeckId] = useState(decks[0]?.id || "");
  const [joinCode, setJoinCode] = useState("");
  const [playerColor, setPlayerColor] = useState(initialSettings.onlinePlayerColor || PLAYER_COLORS[0].value);
  const [room, setRoom] = useState(null);
  const [status, setStatus] = useState("desconectado");
  const [error, setError] = useState("");
  const client = useMemo(() => createOnlineClient(serverUrl), [serverUrl]);
  const handedOffRef = useRef(false);

  useEffect(() => {
    const socket = client.socket;
    const onConnect = () => setStatus("conectado");
    const onDisconnect = () => setStatus("desconectado");
    const onState = (state) => {
      setRoom(state);
      if (state.started && state.match) {
        handedOffRef.current = true;
        onMatch({ match: state.match, onlineClient: client, roomState: state, viewerPlayerId: state.viewerPlayerId });
      }
    };
    socket.on("connect", onConnect); socket.on("disconnect", onDisconnect); socket.on("room:state", onState);
    client.connect();
    return () => {
      socket.off("connect", onConnect); socket.off("disconnect", onDisconnect); socket.off("room:state", onState);
      if (!handedOffRef.current) client.disconnect();
    };
  }, [client, onMatch]);

  function selectedDeck() { return decks.find((d) => d.id === deckId); }

  function persistOnlinePreferences() {
    saveSettings({ ...getSettings(), onlineServerUrl: serverUrl, onlinePlayerColor: playerColor });
  }

  function createRoom() {
    const deck = selectedDeck(); if (!deck) return setError("Escolha um deck.");
    persistOnlinePreferences(); setError("");
    client.createRoom({ profile, deck: deck.cards, playerColor }, (result) => result.ok ? setRoom(result.state) : setError(result.error));
  }

  function joinRoom() {
    const deck = selectedDeck(); if (!deck) return setError("Escolha um deck.");
    persistOnlinePreferences(); setError("");
    client.joinRoom({ code: joinCode.trim().toUpperCase(), profile, deck: deck.cards, playerColor }, (result) => result.ok ? setRoom(result.state) : setError(result.error));
  }

  function start() { client.startRoom({ firstPlayerId: Math.random() < .5 ? "player1" : "player2" }, (r) => !r.ok && setError(r.error)); }

  if (!decks.length) return <main className="standard-page"><header className="page-header"><button className="ghost" onClick={onBack}>← Voltar</button><h1>Online</h1></header><EmptyState title="Nenhum deck salvo">Crie um deck válido antes de entrar no online.</EmptyState></main>;

  return <main className="standard-page">
    <header className="page-header"><button className="ghost" onClick={onBack}>← Voltar</button><div><span className="eyebrow">ONLINE 1V1</span><h1>Sala por código</h1></div><span className={`connection-pill ${status}`}>{status}</span></header>
    <section className="panel online-panel">
      <label>Servidor público<input value={serverUrl} onChange={(e)=>setServerUrl(e.target.value)} disabled={Boolean(room)} /></label>
      <small>Para jogar sem Tailscale, este endereço precisa apontar para o `server/index.mjs` hospedado na internet com HTTPS/WSS.</small>
      <label>Deck<select value={deckId} onChange={(e)=>setDeckId(e.target.value)} disabled={Boolean(room)}>{decks.map((d)=><option value={d.id} key={d.id}>{d.name}</option>)}</select></label>

      <div className="player-color-picker">
        <span>Sua cor na partida</span>
        <div>
          {PLAYER_COLORS.map((color) => <button
            key={color.id}
            type="button"
            className={playerColor === color.value ? "selected" : ""}
            style={{ background: color.value }}
            title={color.label}
            aria-label={color.label}
            disabled={Boolean(room)}
            onClick={() => setPlayerColor(color.value)}
          />)}
        </div>
        <small>Essa cor identifica seu HUD e destaca os Steps quando for o seu turno.</small>
      </div>

      {!room ? <div className="online-actions"><button className="primary-btn" onClick={createRoom}>Criar sala</button><div className="join-box"><input placeholder="CÓDIGO" value={joinCode} maxLength={6} onChange={(e)=>setJoinCode(e.target.value.toUpperCase())}/><button onClick={joinRoom}>Entrar</button></div></div> : <div className="room-card"><span>CÓDIGO DA SALA</span><strong>{room.code}</strong><div className="room-players">{["player1","player2"].map((id)=>{
        const roomPlayer = room.players?.[id];
        const color = roomPlayer?.playerColor || (id === "player1" ? "#68a8ff" : "#ee6c78");
        return <div key={id} style={{ "--room-player-color": color }}><span className="room-color-dot"/><b>{roomPlayer?.profile?.name || "Aguardando..."}</b><small>{roomPlayer?.connected ? "conectado" : "offline"}</small></div>;
      })}</div>{room.viewerPlayerId === "player1" && !room.started && <button className="primary-btn big" disabled={!room.players?.player2} onClick={start}>Iniciar partida</button>}</div>}
      {error && <div className="error-text">{error}</div>}
    </section>
  </main>;
}
