import { useMemo } from "react";
import { getDecks } from "../services/storage.js";
import { cardIndex } from "../services/cardRepository.js";
import { resolveCardImage, getCardName } from "../game/cardAdapter.js";
import { useLanguage } from "../i18n.jsx";

function firstCardId(deck) { return deck.coverCardId || deck.cards?.find((e)=>Number(e.quantity || 0)>0)?.cardId || deck.cards?.[0]?.id; }

export default function Decks({ onBack, onEdit, onNew }) {
  const { t } = useLanguage();
  const decks = useMemo(()=>getDecks(), []);
  return <main className="standard-page decks-page">
    <header className="page-header">
      <button className="ghost" onClick={onBack}>{t("back")}</button>
      <div><span className="eyebrow">DECKS</span><h1>{t("deckLibrary")}</h1></div>
      <button className="primary-btn" onClick={onNew}>+ {t("newDeck")}</button>
    </header>
    {!decks.length ? <section className="panel empty-state"><h2>{t("noDecks")}</h2><button className="primary-btn" onClick={onNew}>{t("createDeck")}</button></section> :
      <section className="deck-library-grid">
        {decks.map((deck)=>{
          const cover = cardIndex.get(firstCardId(deck));
          const size = deck.cards.reduce((s,e)=>s+Number(e.quantity||0),0);
          return <button className="deck-library-card" key={deck.id} onClick={()=>onEdit(deck.id)}>
            <div className="deck-cover-bg" style={{ backgroundImage:`linear-gradient(180deg,rgba(4,10,18,.03),rgba(4,10,18,.95)), url(${resolveCardImage(cover)})` }} />
            <div className="deck-library-card-copy"><span>{size} {t("cards")}</span><strong>{deck.name}</strong><small>{cover ? getCardName(cover) : "Battle Spirits"}</small></div>
          </button>;
        })}
      </section>}
  </main>;
}
