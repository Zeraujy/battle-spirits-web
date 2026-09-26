import { useEffect, useMemo, useRef, useState } from "react";
import { getDecks, getProfile, getSettings } from "../services/storage.js";
import { createOnlinePublicProfile } from "../online/publicProfile.js";
import { createOnlineClient } from "../online/socketClient.js";
import { ONLINE_SERVER_URL } from "../config/online.js";
import { loadRankedHistory, loadRankedProfile } from "../services/rankedService.js";
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
import "../styles/pages/rankedV370.css";

export default function RankedLobby({ onBack, onAccount, onDeckBuilder, onMatch }) {
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
  const validDeck = deckIsValid(deck);
  const playerName = profile.displayName || profile.name || "Jogador";
  const rankLabel = ranked?.rank?.label || "BRONZE III";
  const rp = Number(ranked?.rp ?? 1000);

  useEffect(() => {
    let active = true;
    Promise.all([loadRankedProfile(), loadRankedHistory({ limit: 8 })]).then(([profileResult, historyResult]) => {
      if (!active) return;
      if (profileResult.ok) {
        setRanked(profileResult.profile);
        setAccessToken(profileResult.accessToken);
      } else {
        setError(profileResult.error || "Ranked indisponível.");
      }
      if (historyResult.ok) setHistory(historyResult.rows || []);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const socket = client.socket;
    const onConnect = () => setStatus("connected");
    const onDisconnect = () => setStatus("disconnected");
    const onConnectError = (err) => {
      setStatus("error");
      setError(err?.message ? `Falha ao conectar ao servidor Ranked: ${err.message}` : "Falha ao conectar ao servidor Ranked.");
    };
    const onStatus = (payload) => {
      if (payload?.status === "searching") {
        searchingRef.current = true;
        setSearching(true);
        setSearchMessage(`Buscando adversário próximo de ${payload.rank || rankLabel} · ${payload.rp ?? rp} RP...`);
      }
    };
    const onMatched = (payload) => {
      client.adoptSession?.(payload);
      setSearchMessage("Adversário encontrado. Preparando duelo...");
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
      setRanked((current) => current ? { ...current, rp: payload.rpAfter, rank: { ...(current.rank || {}), label: payload.rank } } : current);
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
  }, [client, onMatch, rankLabel, rp]);

  async function findRankedMatch() {
    if (!accessToken) {
      setError("Entre na conta e execute a migração v3.7.0 antes de jogar Ranked.");
      return;
    }
    if (!deck) return setError("Escolha um deck.");
    if (!validDeck) return setError("O deck selecionado não é válido para uma partida 1v1.");
    if (status !== "connected") return setError("Aguarde a conexão com o servidor Ranked.");

    setError("");
    searchingRef.current = true;
    setSearching(true);
    setSearchMessage("Entrando na fila competitiva...");
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
        setError(result?.error || "Não foi possível entrar na fila Ranked.");
        return;
      }
      if (result.status === "searching") {
        setSearchMessage(`Buscando adversário · ${result.rank || rankLabel} · ${result.rp ?? rp} RP`);
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

  return (
    <>
      <MatchSetupScreen
        className="ranked-match-setup ranked-v370"
        error={error}
        footer="RANKED · SEASON 0 / PRÉ-TEMPORADA · RP E RESULTADOS VALIDADOS PELO SERVIDOR"
        menu={
          <MatchSetupMenu
            eyebrow="MULTIPLAYER ONLINE"
            titleTop="PARTIDA"
            titleBottom="RANQUEADA"
            status={`${rankLabel} · ${rp} RP · ${validDeck ? "DECK VÁLIDO" : "REVISAR DECK"}`}
            badge="SEASON 0"
          >
            <MatchMenuButton
              label={searching ? "Cancelar busca" : "Buscar partida"}
              detail={searching ? (searchMessage || "Procurando adversário...") : "Matchmaking por RP"}
              active
              disabled={!accessToken || !validDeck || status !== "connected"}
              onClick={searching ? cancelSearch : findRankedMatch}
            />
            {!accessToken && <MatchMenuButton label="Entrar na conta" detail="Conta obrigatória no Ranked" onClick={onAccount} />}
            <MatchMenuButton label="Deck Builder" detail={deck ? `${deck.name} · ${deckSize(deck)} cartas` : "Selecionar deck"} onClick={onDeckBuilder} />
            <MatchMenuButton label="Trocar deck" onClick={() => setPickerOpen(true)} />
            <MatchMenuButton label="Voltar" onClick={onBack} />
          </MatchSetupMenu>
        }
      >
        <div className="match-setup-duel ranked-duel-grid">
          <PlayerBattlePreview
            side="left"
            kicker="RANKED PLAYER"
            name={playerName}
            rank={`${rankLabel} · ${rp} RP`}
            avatarSrc={profile.avatar || profile.avatarUrl || profile.avatar_url || profile.photoURL || profile.photo || null}
            bannerSrc={getDeckPortrait(deck)}
            deck={deck}
            deckName={deck?.name || "Nenhum deck"}
            deckMeta={deck ? `${deckSize(deck)} cartas · ${validDeck ? "válido para Ranked" : "revisar deck"}` : "selecione seu deck ranqueado"}
            onChangeDeck={() => setPickerOpen(true)}
            status={accessToken ? "RANKED READY" : "CONTA NECESSÁRIA"}
          />

          <VersusMark />

          <PlayerBattlePreview
            side="right"
            kicker="RANKED MATCH"
            name={searching ? "PROCURANDO..." : "ADVERSÁRIO"}
            avatarSrc={null}
            bannerSrc={null}
            deckName={searching ? "Matchmaking competitivo ativo" : "Matchmaking por RP"}
            deckMeta={searching ? "a faixa de busca aumenta gradualmente" : "identidade revelada após o pareamento"}
            status={searching ? "EM BUSCA" : "SEASON 0"}
            waiting
          />
        </div>

        <section className="ranked-season-panel" aria-label="Season 0 overview">
          <div><span>RP ATUAL</span><strong>{rp}</strong><small>{rankLabel}</small></div>
          <div><span>PICO</span><strong>{Number(ranked?.peak_rp ?? rp)}</strong><small>Season 0</small></div>
          <div><span>VITÓRIAS</span><strong>{Number(ranked?.wins || 0)}</strong><small>{winRate}% win rate</small></div>
          <div><span>DERROTAS</span><strong>{Number(ranked?.losses || 0)}</strong><small>{totalMatches} partidas</small></div>
        </section>

        {history.length > 0 && (
          <section className="ranked-recent-panel">
            <header><span>HISTÓRICO RANKED</span><strong>Últimas partidas</strong></header>
            <div className="ranked-recent-list">
              {history.slice(0, 5).map((row) => (
                <article key={row.match_uid} className={row.result === "win" ? "win" : "loss"}>
                  <b>{row.result === "win" ? "VITÓRIA" : "DERROTA"}</b>
                  <span>{row.opponent_name || "Oponente"}</span>
                  <em>{Number(row.rp_delta) >= 0 ? "+" : ""}{row.rp_delta} RP</em>
                </article>
              ))}
            </div>
          </section>
        )}
      </MatchSetupScreen>

      <DeckPicker
        open={pickerOpen}
        title="Deck ranqueado"
        decks={decks}
        selectedId={deckId}
        onSelect={setDeckId}
        onClose={() => setPickerOpen(false)}
        onDeckBuilder={onDeckBuilder}
      />
    </>
  );
}
