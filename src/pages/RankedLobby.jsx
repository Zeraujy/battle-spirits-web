import { useEffect, useMemo, useRef, useState } from "react";
import { getDecks, getProfile, getSettings } from "../services/storage.js";
import { createOnlinePublicProfile } from "../online/publicProfile.js";
import { createOnlineClient } from "../online/socketClient.js";
import { ONLINE_SERVER_URL } from "../config/online.js";
import { loadRankedHistory, loadRankedProfile } from "../services/rankedService.js";
import { useLanguage } from "../i18n.jsx";
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
import "../styles/pages/rankedV400.css";

function rankTheme(rank) {
  const value = String(rank || "").toLowerCase();
  if (value.includes("master")) return "master";
  if (value.includes("diamond")) return "diamond";
  if (value.includes("platinum") || value.includes("platina")) return "platinum";
  if (value.includes("gold") || value.includes("ouro")) return "gold";
  if (value.includes("silver") || value.includes("prata")) return "silver";
  return "bronze";
}

function formatMatchDate(value, locale) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit" }).format(date);
}

export default function RankedLobby({ onBack, onAccount, onDeckBuilder, onMatch }) {
  const { language } = useLanguage();
  const pt = language !== "en";
  const locale = pt ? "pt-BR" : "en-US";
  const decks = useMemo(() => getDecks(), []);
  const profile = useMemo(() => getProfile() || {}, []);
  const settings = useMemo(() => getSettings() || {}, []);
  const [deckId, setDeckId] = useState(decks[0]?.id || "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [status, setStatus] = useState("connecting");
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const [error, setError] = useState("");
  const [ranked, setRanked] = useState(null);
  const [history, setHistory] = useState([]);
  const [accessToken, setAccessToken] = useState(null);
  const handedOffRef = useRef(false);
  const searchingRef = useRef(false);
  const client = useMemo(() => createOnlineClient(ONLINE_SERVER_URL), []);

  const deck = decks.find((item) => item.id === deckId) || null;
  const validDeck = deckIsValid(deck, { regulation: "official" });
  const playerName = profile.displayName || profile.name || (pt ? "Jogador" : "Player");
  const rankLabel = ranked?.rank?.label || "BRONZE III";
  const rp = Number(ranked?.rp ?? 1000);
  const rankClass = rankTheme(rankLabel);

  useEffect(() => {
    let active = true;
    Promise.all([loadRankedProfile(), loadRankedHistory({ limit: 8 })]).then(([profileResult, historyResult]) => {
      if (!active) return;
      if (profileResult.ok) {
        setRanked(profileResult.profile);
        setAccessToken(profileResult.accessToken);
      } else {
        setError(pt ? "Ranked indisponível no momento." : "Ranked is unavailable right now.");
      }
      if (historyResult.ok) setHistory(historyResult.rows || []);
    });
    return () => { active = false; };
  }, [pt]);

  useEffect(() => {
    const socket = client.socket;
    const onConnect = () => setStatus("connected");
    const onDisconnect = () => setStatus("disconnected");
    const onConnectError = (err) => {
      setStatus("error");
      console.error("Falha ao conectar ao Ranked:", err);
      setError(pt ? "Não foi possível conectar ao Ranked agora." : "Could not connect to Ranked right now.");
    };
    const onStatus = (payload) => {
      if (payload?.status === "searching") {
        searchingRef.current = true;
        setSearching(true);
        setSearchMessage(
          pt
            ? `Buscando adversário próximo de ${payload.rank || rankLabel} · ${payload.rp ?? rp} RP...`
            : `Searching near ${payload.rank || rankLabel} · ${payload.rp ?? rp} RP...`
        );
      }
    };
    const onMatched = (payload) => {
      client.adoptSession?.(payload);
      setSearchMessage(pt ? "Adversário encontrado. Preparando duelo..." : "Opponent found. Preparing duel...");
    };
    const onState = (state) => {
      if (!state?.started || !state?.match || !state?.ranked) return;
      handedOffRef.current = true;
      searchingRef.current = false;
      setSearching(false);
      onMatch({ match: state.match, onlineClient: client, roomState: state, viewerPlayerId: state.viewerPlayerId });
    };
    const onResult = (payload) => {
      if (!payload) return;
      setRanked((current) => current
        ? { ...current, rp: payload.rpAfter, rank: { ...(current.rank || {}), label: payload.rank } }
        : current);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("ranked:status", onStatus);
    socket.on("ranked:matched", onMatched);
    socket.on("ranked:result", onResult);
    socket.on("room:state", onState);
    client.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("ranked:status", onStatus);
      socket.off("ranked:matched", onMatched);
      socket.off("ranked:result", onResult);
      socket.off("room:state", onState);
      if (searchingRef.current) socket.emit("ranked:cancel");
      if (!handedOffRef.current) client.disconnect();
    };
  }, [client, onMatch, pt, rankLabel, rp]);

  async function findRankedMatch() {
    if (!accessToken) {
      setError(pt
        ? "Entre na sua conta para acessar o Ranked."
        : "Sign in to your account to access Ranked.");
      return;
    }
    if (!deck) return setError(pt ? "Escolha um deck." : "Choose a deck.");
    if (!validDeck) return setError(pt ? "O deck selecionado não está apto ao Ranked." : "The selected deck is not eligible for Ranked.");
    if (status !== "connected") return setError(pt ? "Aguarde a conexão com o Ranked." : "Wait for the Ranked connection.");

    setError("");
    searchingRef.current = true;
    setSearching(true);
    setSearchMessage(pt ? "Entrando na fila competitiva..." : "Joining the competitive queue...");
    const playerColor = settings.onlinePlayerColor || settings.preferredPlayerColor || "#d8d8d8";
    const publicProfile = await createOnlinePublicProfile(profile, playerColor);

    client.socket.emit("ranked:join", {
      accessToken,
      profile: publicProfile,
      deck: deck.cards,
      deckId: deck.id || null,
      deckName: deck.name || "Deck"
    }, (result) => {
      if (!result?.ok) {
        searchingRef.current = false;
        setSearching(false);
        setError(pt ? "Não foi possível entrar na fila Ranked." : "Could not join the Ranked queue.");
        return;
      }
      if (result.status === "searching") {
        setSearchMessage(
          pt
            ? `Buscando adversário · ${result.rank || rankLabel} · ${result.rp ?? rp} RP`
            : `Searching for opponent · ${result.rank || rankLabel} · ${result.rp ?? rp} RP`
        );
      }
    });
  }

  function cancelSearch() {
    client.socket.emit("ranked:cancel", {}, () => {});
    searchingRef.current = false;
    setSearching(false);
    setSearchMessage("");
  }

  const totalMatches = Number(ranked?.wins || 0) + Number(ranked?.losses || 0);
  const winRate = totalMatches ? Math.round((Number(ranked?.wins || 0) / totalMatches) * 100) : 0;
  const peakRp = Number(ranked?.peak_rp ?? rp);
  const connectionLabel = status === "connected"
    ? (pt ? "Conectado" : "Connected")
    : status === "connecting"
      ? (pt ? "Conectando" : "Connecting")
      : (pt ? "Offline" : "Offline");
  const readyToQueue = Boolean(accessToken && validDeck && status === "connected");

  return (
    <>
      <MatchSetupScreen
        className="ranked-match-setup ranked-v400"
        error={error}
        footer={pt ? "RANKED · SEASON 0 / PRÉ-TEMPORADA" : "RANKED · SEASON 0 / PRE-SEASON"}
        menu={
          <MatchSetupMenu
            eyebrow={pt ? "MULTIPLAYER ONLINE" : "ONLINE MULTIPLAYER"}
            titleTop={pt ? "PARTIDA" : "RANKED"}
            titleBottom={pt ? "RANQUEADA" : "MATCH"}
            status={`${rankLabel} · ${rp} RP`}
            badge="SEASON 0"
          >
            <MatchMenuButton
              label={searching ? (pt ? "Cancelar busca" : "Cancel search") : (pt ? "Buscar partida" : "Find match")}
              detail={searching
                ? (searchMessage || (pt ? "Procurando adversário..." : "Searching for opponent..."))
                : readyToQueue
                  ? (pt ? "Pronto para entrar na fila" : "Ready to join the queue")
                  : (pt ? "Revise os requisitos abaixo" : "Check the requirements below")}
              active
              disabled={!readyToQueue && !searching}
              onClick={searching ? cancelSearch : findRankedMatch}
            />
            {!accessToken && (
              <MatchMenuButton
                label={pt ? "Entrar na conta" : "Sign in"}
                detail={pt ? "Conta necessária para jogar Ranked" : "An account is required for Ranked"}
                onClick={onAccount}
              />
            )}
            <MatchMenuButton
              label={pt ? "Deck ranqueado" : "Ranked deck"}
              detail={deck
                ? `${deck.name} · ${deckSize(deck)} ${pt ? "cartas" : "cards"} · ${validDeck ? (pt ? "apto" : "eligible") : (pt ? "revisar" : "review")}`
                : (pt ? "Selecionar deck" : "Select deck")}
              onClick={() => setPickerOpen(true)}
            />
            {!validDeck && deck && (
              <MatchMenuButton
                label={pt ? "Corrigir deck" : "Fix deck"}
                detail={pt ? "Abrir no Deck Builder" : "Open in Deck Builder"}
                onClick={onDeckBuilder}
              />
            )}
            <MatchMenuButton label={pt ? "Voltar" : "Back"} onClick={onBack} />
          </MatchSetupMenu>
        }
      >
        <div className="ranked-v400-content">
          <section className={`ranked-v400-header rank-${rankClass}`} aria-label={pt ? "Resumo competitivo" : "Competitive summary"}>
            <div className="ranked-v400-season-copy">
              <span>SEASON 0</span>
              <strong>{rankLabel}</strong>
              <small>{pt ? "Pré-temporada competitiva" : "Competitive pre-season"}</small>
            </div>
            <div className="ranked-v400-rp">
              <strong>{rp}</strong>
              <span>RP</span>
            </div>
            <div className={`ranked-v400-connection is-${status}`}>
              <i aria-hidden="true" />
              <span>{connectionLabel}</span>
            </div>
          </section>

          <div className="match-setup-duel ranked-duel-grid">
            <PlayerBattlePreview
              side="left"
              kicker={pt ? "SEU PERFIL" : "YOUR PROFILE"}
              name={playerName}
              rank={`${rankLabel} · ${rp} RP`}
              avatarSrc={profile.avatar || profile.avatarUrl || profile.avatar_url || profile.photoURL || profile.photo || null}
              bannerSrc={getDeckPortrait(deck)}
              deck={deck}
              deckName={deck?.name || (pt ? "Nenhum deck" : "No deck")}
              deckMeta={deck
                ? `${deckSize(deck)} ${pt ? "cartas" : "cards"} · ${validDeck ? (pt ? "apto ao Ranked" : "Ranked eligible") : (pt ? "revisar deck" : "review deck")}`
                : (pt ? "selecione seu deck ranqueado" : "select your Ranked deck")}
              status={accessToken ? (validDeck ? "RANKED READY" : "REVIEW DECK") : "SIGN IN"}
            />

            <VersusMark />

            <PlayerBattlePreview
              side="right"
              kicker={pt ? "MATCHMAKING" : "MATCHMAKING"}
              name={searching ? (pt ? "PROCURANDO..." : "SEARCHING...") : (pt ? "ADVERSÁRIO" : "OPPONENT")}
              avatarSrc={null}
              bannerSrc={null}
              deckName={searching ? (pt ? "Fila competitiva ativa" : "Competitive queue active") : (pt ? "Matchmaking por RP" : "RP matchmaking")}
              deckMeta={searching
                ? (pt ? "a faixa de busca aumenta gradualmente" : "search range expands gradually")
                : (pt ? "o adversário aparece após o pareamento" : "opponent appears after matching")}
              status={searching ? (pt ? "EM BUSCA" : "SEARCHING") : "SEASON 0"}
              waiting
            />
          </div>

          <section className="ranked-season-panel" aria-label={pt ? "Estatísticas da Season 0" : "Season 0 statistics"}>
            <div><span>{pt ? "RP ATUAL" : "CURRENT RP"}</span><strong>{rp}</strong><small>{rankLabel}</small></div>
            <div><span>{pt ? "PICO" : "PEAK"}</span><strong>{peakRp}</strong><small>Season 0</small></div>
            <div><span>{pt ? "VITÓRIAS" : "WINS"}</span><strong>{Number(ranked?.wins || 0)}</strong><small>{winRate}% win rate</small></div>
            <div><span>{pt ? "PARTIDAS" : "MATCHES"}</span><strong>{totalMatches}</strong><small>{Number(ranked?.losses || 0)} {pt ? "derrotas" : "losses"}</small></div>
          </section>

          <section className="ranked-recent-panel">
            <header>
              <div>
                <span>{pt ? "HISTÓRICO RANKED" : "RANKED HISTORY"}</span>
                <strong>{pt ? "Últimas partidas" : "Recent matches"}</strong>
              </div>
              <small>{history.length ? `${Math.min(history.length, 5)} / ${history.length}` : "SEASON 0"}</small>
            </header>

            {history.length > 0 ? (
              <div className="ranked-recent-list">
                {history.slice(0, 5).map((row) => {
                  const win = row.result === "win";
                  const delta = Number(row.rp_delta || 0);
                  return (
                    <article key={row.match_uid} className={win ? "win" : "loss"}>
                      <b>{win ? (pt ? "VITÓRIA" : "WIN") : (pt ? "DERROTA" : "LOSS")}</b>
                      <span>{row.opponent_name || (pt ? "Oponente" : "Opponent")}</span>
                      <small>{formatMatchDate(row.created_at || row.finished_at, locale)}</small>
                      <em>{delta >= 0 ? "+" : ""}{delta} RP</em>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="ranked-v400-empty-history">
                <strong>{pt ? "Sua jornada competitiva começa aqui." : "Your competitive journey starts here."}</strong>
                <span>{pt ? "As partidas da Season 0 aparecerão neste espaço." : "Season 0 matches will appear here."}</span>
              </div>
            )}
          </section>
        </div>
      </MatchSetupScreen>

      <DeckPicker
        open={pickerOpen}
        title={pt ? "Deck ranqueado" : "Ranked deck"}
        decks={decks}
        selectedId={deckId}
        onSelect={setDeckId}
        onClose={() => setPickerOpen(false)}
        onDeckBuilder={onDeckBuilder}
      />
    </>
  );
}
