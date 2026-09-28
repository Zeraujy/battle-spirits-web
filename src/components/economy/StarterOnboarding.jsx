import { useEffect, useMemo, useRef, useState } from "react";
import { ONBOARDING_DECK_PRODUCTS } from "../../data/shopCatalog.js";
import { completeStarterOnboarding, getDeckRecipe, loadEconomySnapshot } from "../../services/economyService.js";
import { cardIndex } from "../../services/cardRepository.js";
import CardDetailsModal from "../cards/CardDetailsModal.jsx";
import { getCardName, resolveCardImage } from "../../game/cardAdapter.js";
import { useLanguage } from "../../i18n.jsx";
import "../../styles/pages/onboardingV450.css";

function DeckArt({ product }) {
  const [failed, setFailed] = useState(false);
  return failed ? <div className="starter-v450-fallback">{product.setCode}</div> : <img src={product.artwork} alt="" draggable="false" onError={() => setFailed(true)} />;
}

function CoverCard({ recipe, product }) {
  const card = recipe?.cover || cardIndex.get(recipe?.entries?.[0]?.cardId);
  if (!card) return <DeckArt product={product} />;
  return <img src={resolveCardImage(card)} alt={getCardName(card)} draggable="false" />;
}

export default function StarterOnboarding() {
  const { language } = useLanguage();
  const pt = language !== "en";
  const railRef = useRef(null);
  const [snapshot, setSnapshot] = useState(null);
  const [recipes, setRecipes] = useState(new Map());
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [decklistProductId, setDecklistProductId] = useState(null);
  const [detailCard, setDetailCard] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const next = await loadEconomySnapshot();
      if (!active) return;
      setSnapshot(next);
      if (next.onboardingComplete) { setLoading(false); return; }
      const results = await Promise.all(ONBOARDING_DECK_PRODUCTS.map(async (product) => [product.id, await getDeckRecipe(product)]));
      if (active) {
        setRecipes(new Map(results));
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const availableCount = useMemo(
    () => ONBOARDING_DECK_PRODUCTS.filter((product) => recipes.get(product.id)?.ready).length,
    [recipes]
  );

  const activeDecklistProduct = useMemo(
    () => ONBOARDING_DECK_PRODUCTS.find((product) => product.id === decklistProductId) || null,
    [decklistProductId]
  );
  const activeDecklistRecipe = activeDecklistProduct ? recipes.get(activeDecklistProduct.id) : null;
  const decklistCards = useMemo(() => {
    if (!activeDecklistRecipe?.entries) return [];
    return activeDecklistRecipe.entries
      .map((entry) => ({ entry, card: cardIndex.get(entry.cardId) }))
      .filter((item) => item.card);
  }, [activeDecklistRecipe]);

  if (loading || snapshot?.onboardingComplete) return null;

  function toggle(product) {
    if (!recipes.get(product.id)?.ready) return;
    setError("");
    setSelected((current) => current.includes(product.id)
      ? current.filter((id) => id !== product.id)
      : current.length < 3 ? [...current, product.id] : current);
  }

  function scrollRail(direction) {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * Math.max(280, rail.clientWidth * 0.72), behavior: "smooth" });
  }

  async function confirm() {
    if (selected.length !== 3) return;
    setSubmitting(true);
    setError("");
    const result = await completeStarterOnboarding(selected);
    if (!result.ok) {
      setError(pt ? "Não foi possível preparar seus Starter Decks agora. Tente novamente em instantes." : "Could not prepare your Starter Decks right now. Please try again in a moment.");
      setSubmitting(false);
      return;
    }
    setSnapshot(result.snapshot || { onboardingComplete: true });
    window.dispatchEvent(new CustomEvent("bs:economy-changed"));
    setSubmitting(false);
  }

  return (
    <div className="starter-v450-overlay" role="dialog" aria-modal="true" aria-label={pt ? "Escolha seus Starter Decks" : "Choose your Starter Decks"}>
      <section className="starter-v450-shell">
        <header className="starter-v450-header">
          <div>
            <span>BATTLE SPIRITS ETERNAL · PLAYER ONBOARDING</span>
            <h1>{pt ? "Escolha 3 Starter Decks" : "Choose 3 Starter Decks"}</h1>
            <p>{pt ? "Explore cada deck, veja a lista completa e leia as cartas antes de escolher. Deslize horizontalmente no celular ou use as setas em telas grandes." : "Explore each deck, inspect the full decklist and read every card before choosing. Swipe horizontally on mobile or use the arrows on larger screens."}</p>
          </div>
          <div className="starter-v450-counter">
            <strong>{selected.length}/3</strong>
            <span>{pt ? "selecionados" : "selected"}</span>
            <small>{snapshot?.signedIn ? (pt ? "Conta conectada" : "Account connected") : (pt ? "Guest Mode" : "Guest Mode")}</small>
          </div>
        </header>

        <div className="starter-v450-carousel-wrap">
          <button className="starter-v450-arrow prev" type="button" onClick={() => scrollRail(-1)} aria-label={pt ? "Deck anterior" : "Previous deck"}>‹</button>
          <div className="starter-v450-rail" ref={railRef}>
            {ONBOARDING_DECK_PRODUCTS.map((product) => {
              const recipe = recipes.get(product.id);
              const ready = Boolean(recipe?.ready);
              const active = selected.includes(product.id);
              return (
                <article key={product.id} className={`starter-v450-deck-card ${active ? "selected" : ""} ${!ready ? "disabled" : ""}`}>
                  <div className="starter-v450-product-art"><DeckArt product={product} /></div>
                  <div className="starter-v450-cover-stage">
                    <span>{pt ? "CARTA CAPA" : "COVER CARD"}</span>
                    <div className="starter-v450-cover"><CoverCard recipe={recipe} product={product} /></div>
                  </div>
                  <div className="starter-v450-copy">
                    <small>{product.setCode}</small>
                    <h2>{product.title}</h2>
                    <p>{ready ? `${recipe?.totalCards || 0} ${pt ? "cartas na lista" : "cards in decklist"}` : (pt ? "Lista indisponível na database atual." : "Decklist unavailable in the current database.")}</p>
                  </div>
                  <div className="starter-v450-actions">
                    <button type="button" className="ghost" disabled={!ready} onClick={() => setDecklistProductId(product.id)}>{pt ? "Ver Decklist" : "View Decklist"}</button>
                    <button type="button" className={active ? "selected" : "primary"} disabled={!ready} onClick={() => toggle(product)}>
                      {active ? (pt ? "Selecionado ✓" : "Selected ✓") : (pt ? "Selecionar este Deck" : "Select this Deck")}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          <button className="starter-v450-arrow next" type="button" onClick={() => scrollRail(1)} aria-label={pt ? "Próximo deck" : "Next deck"}>›</button>
        </div>

        <footer className="starter-v450-footer">
          <p>{pt ? `${availableCount} decks disponíveis · escolha exatamente 3 para continuar.` : `${availableCount} decks available · choose exactly 3 to continue.`}</p>
          {error && <strong className="starter-v450-error">{error}</strong>}
          <button type="button" className="starter-v450-confirm" disabled={selected.length !== 3 || submitting} onClick={confirm}>
            {submitting ? (pt ? "Preparando coleção…" : "Preparing collection…") : (pt ? "Confirmar Escolha" : "Confirm Selection")}
          </button>
        </footer>
      </section>

      {activeDecklistProduct && (
        <div className="starter-v450-decklist-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setDecklistProductId(null)}>
          <section className="starter-v450-decklist" role="dialog" aria-modal="true" aria-label={`${pt ? "Decklist" : "Decklist"}: ${activeDecklistProduct.title}`}>
            <header>
              <div><small>{activeDecklistProduct.setCode}</small><h2>{activeDecklistProduct.title}</h2><p>{pt ? "Toque ou clique em qualquer carta para abrir os detalhes completos." : "Tap or click any card to open its complete details."}</p></div>
              <button type="button" onClick={() => setDecklistProductId(null)} aria-label={pt ? "Fechar" : "Close"}>×</button>
            </header>
            <div className="starter-v450-decklist-grid">
              {decklistCards.map(({ entry, card }) => (
                <button type="button" key={card.id} className="starter-v450-decklist-card" onClick={() => setDetailCard(card)}>
                  <img src={resolveCardImage(card)} alt={getCardName(card)} draggable="false" />
                  <span><strong>{entry.quantity}×</strong><b>{getCardName(card)}</b><small>{card.id}</small></span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {detailCard && (
        <CardDetailsModal card={detailCard} initialLanguage={pt ? "ptBR" : "en"} onClose={() => setDetailCard(null)} />
      )}
    </div>
  );
}
