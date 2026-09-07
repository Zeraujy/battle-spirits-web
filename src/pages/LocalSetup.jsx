import { useState } from "react";
import { getDecks, getProfile } from "../services/storage.js";
import { cardIndex } from "../services/cardRepository.js";
import { createMatch, validateDeck } from "../game/state.js";
import EmptyState from "../components/EmptyState.jsx";
import { useLanguage } from "../i18n.jsx";

export default function LocalSetup({ onBack, onStart }) {
  const { t, language } = useLanguage();
  const decks = getDecks(); const profile = getProfile();
  const [p1Deck, setP1Deck] = useState(decks[0]?.id || "");
  const [p2Deck, setP2Deck] = useState(decks[1]?.id || decks[0]?.id || "");
  const [p1Name, setP1Name] = useState(profile.name || t("player1"));
  const [p2Name, setP2Name] = useState(t("player2"));
  const [first, setFirst] = useState("random"); const [error, setError] = useState("");
  function start() {
    const d1 = decks.find((d) => d.id === p1Deck); const d2 = decks.find((d) => d.id === p2Deck);
    if (!d1 || !d2) return setError(language === "en" ? "Choose two decks." : "Escolha dois decks.");
    const v1 = validateDeck(d1.cards, cardIndex); const v2 = validateDeck(d2.cards, cardIndex);
    if (!v1.ok || !v2.ok) return setError(`${language === "en" ? "Invalid deck." : "Deck inválido."} ${[...v1.errors, ...v2.errors].join(" ")}`);
    const firstPlayerId = first === "random" ? (Math.random() < .5 ? "player1" : "player2") : first;
    onStart(createMatch({ player1:{ name:p1Name, avatar:profile.avatar, deck:d1.cards }, player2:{ name:p2Name, avatar:null, deck:d2.cards }, firstPlayerId, cardIndex }));
  }
  return <main className="standard-page">
    <header className="page-header"><button className="ghost" onClick={onBack}>{t("back")}</button><div><span className="eyebrow">{t("local1v1")}</span><h1>{t("prepareBattle")}</h1></div></header>
    {!decks.length ? <EmptyState title={t("noDecks")}>{language === "en" ? "Create a 40+ card deck first." : "Crie primeiro um deck com 40+ cartas."}</EmptyState> : <section className="panel setup-grid">
      <div className="setup-player"><h2>{t("player1")}</h2><label>{t("name")}<input value={p1Name} onChange={(e)=>setP1Name(e.target.value)} /></label><label>{t("deck")}<select value={p1Deck} onChange={(e)=>setP1Deck(e.target.value)}>{decks.map((d)=><option value={d.id} key={d.id}>{d.name}</option>)}</select></label></div>
      <div className="versus">VS</div>
      <div className="setup-player"><h2>{t("player2")}</h2><label>{t("name")}<input value={p2Name} onChange={(e)=>setP2Name(e.target.value)} /></label><label>{t("deck")}<select value={p2Deck} onChange={(e)=>setP2Deck(e.target.value)}>{decks.map((d)=><option value={d.id} key={d.id}>{d.name}</option>)}</select></label></div>
      <div className="first-player"><label>{t("firstPlayer")}<select value={first} onChange={(e)=>setFirst(e.target.value)}><option value="random">{t("random")}</option><option value="player1">{t("player1")}</option><option value="player2">{t("player2")}</option></select></label></div>
      {error && <div className="error-text setup-error">{error}</div>}<button className="primary-btn big" onClick={start}>{t("startMatch")}</button>
    </section>}
  </main>;
}
