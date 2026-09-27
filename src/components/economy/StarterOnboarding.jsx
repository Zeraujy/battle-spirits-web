import { useEffect, useMemo, useState } from "react";
import { STARTER_DECK_PRODUCTS } from "../../data/shopCatalog.js";
import { completeStarterOnboarding, getDeckRecipe, loadEconomySnapshot } from "../../services/economyService.js";
import { useLanguage } from "../../i18n.jsx";
import "../../styles/pages/onboardingV421.css";

function DeckArt({ product }) {
  const [failed, setFailed] = useState(false);
  return failed ? <div className="starter-v421-fallback">{product.setCode}</div> : <img src={product.artwork} alt="" onError={() => setFailed(true)} />;
}

export default function StarterOnboarding() {
  const { language } = useLanguage();
  const pt = language !== "en";
  const [snapshot, setSnapshot] = useState(null);
  const [availability, setAvailability] = useState(new Map());
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const next = await loadEconomySnapshot();
      if (!active) return;
      setSnapshot(next);
      if (next.onboardingComplete) { setLoading(false); return; }
      const results = await Promise.all(STARTER_DECK_PRODUCTS.map(async (product) => {
        const recipe = await getDeckRecipe(product);
        return [product.id, Boolean(recipe.ready)];
      }));
      if (active) {
        setAvailability(new Map(results));
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const availableCount = useMemo(() => STARTER_DECK_PRODUCTS.filter((product) => availability.get(product.id)).length, [availability]);
  if (loading || snapshot?.onboardingComplete) return null;

  function toggle(product) {
    if (!availability.get(product.id)) return;
    setError("");
    setSelected((current) => current.includes(product.id)
      ? current.filter((id) => id !== product.id)
      : current.length < 3 ? [...current, product.id] : current);
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
    <div className="starter-v421-overlay" role="dialog" aria-modal="true" aria-label={pt ? "Escolha seus Starter Decks" : "Choose your Starter Decks"}>
      <section className="starter-v421-shell">
        <header>
          <span>BATTLE SPIRITS ETERNAL · PLAYER ONBOARDING</span>
          <h1>{pt ? "Escolha 3 Starter Decks" : "Choose 3 Starter Decks"}</h1>
          <p>{pt ? "Esses três decks serão sua coleção inicial. As cartas entram no CollectionManager e cada deck libera uma Deck Recipe em Ready Decks. Os demais continuam disponíveis na Shop." : "These three decks become your starting collection. Their cards go to CollectionManager and each deck unlocks one Deck Recipe in Ready Decks. The remaining decks stay available in the Shop."}</p>
        </header>

        <div className="starter-v421-counter"><strong>{selected.length}/3</strong><span>{pt ? "selecionados" : "selected"}</span><small>{snapshot?.signedIn ? (pt ? "Conta conectada" : "Account connected") : (pt ? "Guest Mode · reinicia ao fechar" : "Guest Mode · resets on close")}</small></div>

        <div className="starter-v421-grid">
          {STARTER_DECK_PRODUCTS.map((product) => {
            const ready = availability.get(product.id);
            const active = selected.includes(product.id);
            return <button key={product.id} type="button" className={`${active ? "selected" : ""} ${ready === false ? "disabled" : ""}`} disabled={ready === false} onClick={() => toggle(product)}>
              <div className="starter-v421-art"><DeckArt product={product} /></div>
              <div><small>{product.setCode}</small><strong>{product.title}</strong><span>{ready === false ? (pt ? "Lista incompleta" : "Incomplete list") : active ? (pt ? "Selecionado" : "Selected") : (pt ? "Escolher" : "Choose")}</span></div>
            </button>;
          })}
        </div>

        <footer>
          <p>{pt ? `${availableCount} decks possuem lista utilizável na database atual.` : `${availableCount} decks have a usable list in the current database.`}</p>
          {error && <strong className="starter-v421-error">{error}</strong>}
          <button type="button" disabled={selected.length !== 3 || submitting} onClick={confirm}>{submitting ? (pt ? "Preparando coleção…" : "Preparing collection…") : (pt ? "Confirmar 3 Starter Decks" : "Confirm 3 Starter Decks")}</button>
        </footer>
      </section>
    </div>
  );
}
