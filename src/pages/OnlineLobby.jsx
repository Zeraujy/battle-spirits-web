import { useEffect, useMemo, useRef, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import { getDecks, getProfile, getSettings, saveSettings } from "../services/storage.js";
import { createOnlineClient } from "../online/socketClient.js";
import { useLanguage } from "../i18n.jsx";

const PLAYER_COLORS = ["#68a8ff","#ff6a73","#79dda8","#f4bd4b","#b88cff","#ff8fd8","#66d9d1","#ff9f5a"];

export default function OnlineLobby({ onBack, onMatch }) {
  const { t, language } = useLanguage();
  const decks=getDecks(); const profile=getProfile(); const initialSettings=getSettings();
  const [serverUrl,setServerUrl]=useState(initialSettings.onlineServerUrl||"http://localhost:3001");
  const [playerColor,setPlayerColor]=useState(initialSettings.preferredPlayerColor||PLAYER_COLORS[0]);
  const [deckId,setDeckId]=useState(decks[0]?.id||""); const [joinCode,setJoinCode]=useState("");
  const [room,setRoom]=useState(null); const [status,setStatus]=useState("disconnected"); const [error,setError]=useState("");
  const client=useMemo(()=>createOnlineClient(serverUrl),[serverUrl]); const handedOffRef=useRef(false);

  useEffect(()=>{const socket=client.socket; const onConnect=()=>{setStatus("connected");setError("");}; const onDisconnect=(reason)=>{setStatus("disconnected");if(!handedOffRef.current&&reason!=="io client disconnect")setError(`${language==="en"?"Disconnected":"Desconectado"}: ${reason}`);}; const onConnectError=(err)=>setError(`${language==="en"?"Connection failed":"Falha na conexão"}: ${err?.message||"unknown"}`); const onState=(state)=>{setRoom(state);if(state.started&&state.match){handedOffRef.current=true;onMatch({match:state.match,onlineClient:client,roomState:state,viewerPlayerId:state.viewerPlayerId});}}; socket.on("connect",onConnect);socket.on("disconnect",onDisconnect);socket.on("connect_error",onConnectError);socket.on("room:state",onState);client.connect();return()=>{socket.off("connect",onConnect);socket.off("disconnect",onDisconnect);socket.off("connect_error",onConnectError);socket.off("room:state",onState);if(!handedOffRef.current)client.disconnect();};},[client,onMatch,language]);
  function selectedDeck(){return decks.find((d)=>d.id===deckId);} function onlineProfile(){return {...profile,name:profile.displayName||profile.name,playerColor};}
  function persist(){saveSettings({...getSettings(),onlineServerUrl:serverUrl,preferredPlayerColor:playerColor});}
  function createRoom(){const deck=selectedDeck();if(!deck)return setError(language==="en"?"Choose a deck.":"Escolha um deck.");persist();setError("");client.createRoom({profile:onlineProfile(),deck:deck.cards},(result)=>result.ok?setRoom(result.state):setError(result.error));}
  function joinRoom(){const deck=selectedDeck();if(!deck)return setError(language==="en"?"Choose a deck.":"Escolha um deck.");persist();setError("");client.joinRoom({code:joinCode.trim().toUpperCase(),profile:onlineProfile(),deck:deck.cards},(result)=>result.ok?setRoom(result.state):setError(result.error));}
  function start(){client.startRoom({firstPlayerId:Math.random()<.5?"player1":"player2"},(r)=>!r.ok&&setError(r.error));}
  if(!decks.length)return <main className="standard-page"><header className="page-header"><button className="ghost" onClick={onBack}>{t("back")}</button><h1>{t("online")}</h1></header><EmptyState title={t("noDecks")}>{t("noDecksOnline")}</EmptyState></main>;
  return <main className="standard-page"><header className="page-header"><button className="ghost" onClick={onBack}>{t("back")}</button><div><span className="eyebrow">{t("online1v1")}</span><h1>{t("roomByCode")}</h1></div><span className={`connection-pill ${status}`}>{status==="connected"?t("connected"):t("disconnected")}</span></header>
    <section className="panel online-panel"><label>{t("server")}<input value={serverUrl} onChange={(e)=>setServerUrl(e.target.value)} disabled={Boolean(room)}/></label><label>{t("deck")}<select value={deckId} onChange={(e)=>setDeckId(e.target.value)} disabled={Boolean(room)}>{decks.map((d)=><option value={d.id} key={d.id}>{d.name}</option>)}</select></label>
      <div className="player-color-picker"><span>{language==="en"?"Your match color":"Sua cor na partida"}</span><div>{PLAYER_COLORS.map((c)=><button key={c} className={playerColor===c?"selected":""} style={{background:c}} disabled={Boolean(room)} onClick={()=>setPlayerColor(c)} title={c}/>)}</div></div>
      {!room?<div className="online-actions"><button className="primary-btn" onClick={createRoom}>{t("createRoom")}</button><div className="join-box"><input placeholder={t("roomCode")} value={joinCode} maxLength={6} onChange={(e)=>setJoinCode(e.target.value.toUpperCase())}/><button onClick={joinRoom}>{t("join")}</button></div></div>:<div className="room-card"><span>{t("roomCode")}</span><strong>{room.code}</strong><div className="room-players">{["player1","player2"].map((id)=><div key={id} style={{"--room-player-color":room.players?.[id]?.profile?.playerColor||"#60728a"}}><i className="room-color-dot"/><b>{room.players?.[id]?.profile?.name||t("waiting")}</b><small>{room.players?.[id]?.connected?t("connected"):t("disconnected")}</small></div>)}</div>{room.viewerPlayerId==="player1"&&!room.started&&<button className="primary-btn big" disabled={!room.players?.player2} onClick={start}>{t("startMatch")}</button>}</div>}
      {error&&<div className="error-text online-error-box">{error}</div>}
    </section></main>;
}
