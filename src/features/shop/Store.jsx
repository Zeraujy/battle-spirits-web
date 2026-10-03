import { useEffect, useMemo, useState } from "react";
import EternalCinematicBackdrop from "../../components/layout/EternalCinematicBackdrop.jsx";
import CardDetailsModal from "../../components/cards/CardDetailsModal.jsx";
import { useLanguage } from "../../localization/i18n.jsx";
import { SHOP_CATEGORIES, SHOP_PRODUCTS } from "../../data/catalog/shop-catalog.js";
import { sagaForProduct, sagaGroupsForProducts } from "../../data/catalog/shop-sagas.js";
import { cardIndex } from "../../services/cards/cardRepository.js";
import {
  MAX_OWNED_COPIES,
  collectionQuantityMap,
  craftCard,
  craftCostForCard,
  formatCoins,
  getDeckRecipe,
  getProductCardPool,
  loadEconomySnapshot,
  purchaseShopProduct,
  summarizeCollection
} from "../../services/economy/economyService.js";
import "../../styles/pages/storeV420.css";

function CurrencyChip({ kind, amount, pt }) {
  const craft = kind === "craft";
  return (
    <div className={`store-v420-currency ${craft ? "craft" : "spirit"}`}>
      <span className="store-v420-currency-mark">{craft ? "CC" : "SC"}</span>
      <span className="store-v420-currency-copy"><strong>{formatCoins(amount)}</strong><small>{craft ? "Craft Coins" : "Spirit Coins"}</small></span>
      <span className="store-v420-currency-purpose">{craft ? "Crafting" : (pt ? "Loja" : "Store")}</span>
    </div>
  );
}

function Artwork({ product }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [product?.artwork]);
  if (!product?.artwork || failed) {
    return <div className="store-v420-art-fallback"><span>{product?.setCode || product?.title?.slice(0, 3) || "BS"}</span></div>;
  }
  return <img src={product.artwork} alt="" loading="lazy" onError={() => setFailed(true)} />;
}

function ProductCard({ product, selected, onSelect, pt }) {
  const unavailable = product.status !== "active";
  const saga = sagaForProduct(product);
  return (
    <button type="button" className={`store-v420-product ${selected ? "selected" : ""} ${unavailable ? "unavailable" : ""}`} onClick={() => onSelect(product)}>
      <div className="store-v420-product-art"><Artwork product={product} /></div>
      <div className="store-v420-product-meta">
        <small>{pt ? product.subtitlePT : product.subtitleEN}</small>
        <strong>{product.title}</strong>
        <em className="store-v422-product-saga">{pt ? saga.labelPT : saga.labelEN}</em>
        {product.spiritPrice != null ? <span><b>SC</b>{formatCoins(product.spiritPrice)}</span> : <span className="store-v420-unavailable-label">{pt ? "INDISPONÍVEL" : "UNAVAILABLE"}</span>}
        {product.status === "catalog-only" && <span className="store-v421-data-pending">{pt ? "DADOS PENDENTES" : "DATA PENDING"}</span>}
      </div>
    </button>
  );
}

function CollectionPanel({ collection, pt }) {
  const summary = useMemo(() => summarizeCollection(collection), [collection]);
  const entries = useMemo(() => collection.map((entry) => ({ ...entry, card: cardIndex.get(entry.cardId) }))
    .sort((a, b) => String(a.cardId).localeCompare(String(b.cardId), undefined, { numeric: true })), [collection]);
  return (
    <section className="store-v420-collection">
      <div className="store-v420-collection-summary">
        <article><small>{pt ? "Cartas diferentes" : "Unique cards"}</small><strong>{summary.uniqueCards}</strong></article>
        <article><small>{pt ? "Total de cópias" : "Total copies"}</small><strong>{summary.totalCopies}</strong></article>
        <article><small>{pt ? "Cópias repetidas" : "Duplicate copies"}</small><strong>{summary.duplicateCopies}</strong></article>
      </div>
      {entries.length ? <div className="store-v420-collection-grid">{entries.map((entry) => (
        <article className="store-v420-owned-card" key={entry.cardId}>
          <div className="store-v420-owned-art">{entry.card?.image ? <img src={entry.card.image} alt="" loading="lazy" /> : <span>{entry.cardId}</span>}</div>
          <div><strong>{entry.card?.namePT || entry.card?.nameEN || entry.card?.name || entry.cardId}</strong><small>{entry.cardId}</small></div>
          <b>{entry.quantity}/{MAX_OWNED_COPIES}</b>
        </article>
      ))}</div> : <div className="store-v420-empty"><span className="store-v420-empty-mark">◇</span><strong>{pt ? "Sua coleção começa aqui" : "Your collection starts here"}</strong><p>{pt ? "Escolha seus 3 Starter Decks e abra produtos da Loja para preencher sua coleção." : "Choose your 3 Starter Decks and open Store products to build your collection."}</p></div>}
    </section>
  );
}

function purchaseError(error, pt) {
  const value = String(error || "");
  if (value.includes("INSUFFICIENT_SPIRIT_COINS")) return pt ? "Spirit Coins insuficientes." : "Not enough Spirit Coins.";
  if (value.includes("DECK_DATA_INCOMPLETE")) return pt ? "A lista completa deste deck ainda não está disponível." : "This deck's complete list is not available yet.";
  if (value.includes("EMPTY_PRODUCT_POOL")) return pt ? "Este produto ainda não possui um pool de cartas válido." : "This product does not have a valid card pool yet.";
  return pt ? "Não foi possível concluir a compra." : "Could not complete the purchase.";
}

function productDescription(product, pt) {
  if (product.status === "catalog-only") return pt ? product.dataNotePT : product.dataNoteEN;
  if (product.productType === "booster") return pt
    ? `${product.packSize} cartas por pacote. O Card Preview mostra o pool completo deste produto.`
    : `${product.packSize} cards per pack. Card Preview shows this product's complete pool.`;
  if (product.productType === "card-set") return pt
    ? "Premium Card Set de conteúdo fixo. A compra concede uma cópia de cada carta física listada no produto."
    : "Fixed-content Premium Card Set. The purchase grants one copy of every physical card listed in the product.";
  if (product.productType === "deck") return pt
    ? "A compra concede as cartas do deck e uma Deck Recipe permanente. Compras repetidas continuam concedendo as cartas."
    : "Purchasing grants the deck cards and one permanent Deck Recipe. Repeat purchases still grant the cards.";
  return "";
}

function ProductModal({ product, snapshot, pt, onClose, onPurchased, onReveal, onOpenCard }) {
  const [quantity, setQuantity] = useState(1);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [message, setMessage] = useState("");
  const owned = useMemo(() => collectionQuantityMap(snapshot.collection), [snapshot.collection]);
  const totalPrice = Number(product.spiritPrice || 0) * quantity;
  const canBuy = product.status === "active" && product.spiritPrice != null && snapshot.wallet.spiritCoins >= totalPrice && !loading && !buying;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setMessage("");
    setQuantity(1);
    (async () => {
      if (product.productType === "deck") {
        const recipe = await getDeckRecipe(product);
        const entries = recipe.entries || [];
        if (active) setPreview(entries.map((entry) => ({ card: cardIndex.get(entry.cardId), cardId: entry.cardId, included: entry.quantity })));
      } else if (product.productType === "booster" || product.productType === "card-set") {
        const pool = await getProductCardPool(product);
        const visible = product.productType === "card-set" ? pool.filter((card) => Number(card.includedQuantity ?? 1) > 0) : pool;
        if (active) setPreview(visible.map((card) => ({ card, cardId: card.id, included: product.productType === "card-set" ? Math.max(1, Number(card.includedQuantity || 1)) : null })));
      } else if (active) setPreview([]);
      if (active) setLoading(false);
    })().catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [product]);

  async function confirm() {
    if (!canBuy) return;
    setBuying(true);
    setMessage("");
    const result = await purchaseShopProduct(product, quantity);
    if (!result.ok) {
      setMessage(purchaseError(result.error, pt));
      setBuying(false);
      return;
    }
    await onPurchased(result.snapshot);
    const grants = result.grants || result.result?.grants || [];
    setBuying(false);
    onClose();
    if (grants.length && product.productType !== "accessory") onReveal({ product, quantity, grants });
  }

  return (
    <div className="store-v421-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="store-v421-modal store-v422-preview-modal" role="dialog" aria-modal="true" aria-label={product.title}>
        <header className="store-v421-modal-head">
          <div><span>{pt ? product.subtitlePT : product.subtitleEN}</span><h2>{product.title}</h2><small>{pt ? sagaForProduct(product).labelPT : sagaForProduct(product).labelEN}</small></div>
          <button type="button" onClick={onClose} aria-label={pt ? "Fechar" : "Close"}>×</button>
        </header>
        <div className="store-v421-modal-body">
          <aside className="store-v421-modal-product">
            <div className="store-v421-modal-art"><Artwork product={product} /></div>
            <p>{productDescription(product, pt)}</p>
          </aside>
          <div className="store-v421-preview-panel">
            <div className="store-v421-preview-head"><div><strong>CARD PREVIEW</strong><small>{pt ? "Pool completo do produto" : "Complete product card pool"}</small></div><span>{preview.length} {pt ? "cartas" : "cards"}</span></div>
            {loading ? <div className="store-v421-preview-empty">{pt ? "Carregando pool…" : "Loading pool…"}</div> : preview.length ? (
              <div className="store-v422-card-preview-grid">{preview.map((entry) => {
                const count = owned.get(entry.cardId) || 0;
                return <article
                  key={entry.cardId}
                  className={count >= MAX_OWNED_COPIES ? "maxed" : ""}
                  role="button"
                  tabIndex={0}
                  onClick={() => entry.card && onOpenCard(entry.card)}
                  onKeyDown={(event) => { if (entry.card && (event.key === "Enter" || event.key === " ")) onOpenCard(entry.card); }}
                >
                  <div className="store-v422-preview-card-art">{entry.card?.image ? <img src={entry.card.image} alt="" loading="lazy" /> : <span>{entry.cardId}</span>}</div>
                  <strong title={entry.card?.namePT || entry.card?.nameEN || entry.card?.name || entry.cardId}>{entry.card?.namePT || entry.card?.nameEN || entry.card?.name || entry.cardId}</strong>
                  <small>{entry.cardId} · {entry.card?.rarity || "—"}{entry.included ? ` · ×${entry.included}` : ""}</small>
                  <b className="store-v422-ownership"><span>OWNED</span>{count}/{MAX_OWNED_COPIES}</b>
                </article>;
              })}</div>
            ) : <div className="store-v421-preview-empty">{pt ? "A lista deste produto ainda não está disponível." : "This product list is not available yet."}</div>}
          </div>
        </div>
        <footer className="store-v421-modal-footer">
          <div className="store-v421-quantity"><span>{pt ? "Quantidade" : "Quantity"}</span><button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button><b>{quantity}</b><button type="button" onClick={() => setQuantity((value) => Math.min(20, value + 1))}>+</button></div>
          <div className="store-v421-price"><small>Total</small><strong><b>SC</b>{formatCoins(totalPrice)}</strong></div>
          <div className="store-v421-actions"><button type="button" className="cancel" onClick={onClose}>{pt ? "Cancelar" : "Cancel"}</button><button type="button" className="confirm" disabled={!canBuy} onClick={confirm}>{buying ? (pt ? "Processando…" : "Processing…") : (pt ? "Confirmar compra" : "Confirm Purchase")}</button></div>
          {message && <p className="store-v421-purchase-message">{message}</p>}
        </footer>
      </section>
    </div>
  );
}

function buildOpeningGroups(opening) {
  const byUnit = new Map();
  for (let index = 0; index < opening.grants.length; index += 1) {
    const grant = opening.grants[index];
    const unitIndex = Number.isFinite(Number(grant.unitIndex)) ? Number(grant.unitIndex) : null;
    if (unitIndex == null) continue;
    if (!byUnit.has(unitIndex)) byUnit.set(unitIndex, []);
    byUnit.get(unitIndex).push(grant);
  }
  if (byUnit.size) return [...byUnit.entries()].sort((a, b) => a[0] - b[0]).map(([unitIndex, grants]) => ({ unitIndex, grants }));

  const chunkSize = opening.product.productType === "booster" ? Math.max(1, Number(opening.product.packSize || 8))
    : opening.product.productType === "card-set" ? Math.max(1, Math.floor(opening.grants.length / Math.max(1, opening.quantity)))
      : 10;
  const groups = [];
  for (let i = 0; i < opening.grants.length; i += chunkSize) groups.push({ unitIndex: groups.length, grants: opening.grants.slice(i, i + chunkSize) });
  return groups;
}

function PackOpeningSequence({ opening, pt, onClose, onOpenCard }) {
  const groups = useMemo(() => buildOpeningGroups(opening), [opening]);
  const [page, setPage] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const group = groups[page] || { grants: [] };

  useEffect(() => {
    setRevealed(0);
    if (!group.grants.length) return undefined;
    const timer = window.setInterval(() => {
      setRevealed((value) => {
        if (value >= group.grants.length) {
          window.clearInterval(timer);
          return value;
        }
        return value + 1;
      });
    }, 115);
    return () => window.clearInterval(timer);
  }, [page, group.grants.length]);

  const done = revealed >= group.grants.length;
  const lastPage = page >= groups.length - 1;
  const unitLabel = opening.product.productType === "booster" ? (pt ? "BOOSTER" : "BOOSTER")
    : opening.product.productType === "card-set" ? (pt ? "CARD SET" : "CARD SET")
      : (pt ? "DECK REVEAL" : "DECK REVEAL");

  function advance() {
    if (!done) { setRevealed(group.grants.length); return; }
    if (!lastPage) { setPage((value) => value + 1); return; }
    onClose();
  }

  return (
    <div className="store-v422-opening-backdrop">
      <section className="store-v422-opening" role="dialog" aria-modal="true" aria-label={pt ? "Abertura do produto" : "Product opening"}>
        <header>
          <div><span>{unitLabel}</span><h2>{opening.product.title}</h2><small>{pt ? sagaForProduct(opening.product).labelPT : sagaForProduct(opening.product).labelEN}</small></div>
          <div className="store-v422-opening-progress"><b>{page + 1}</b><span>/</span><small>{groups.length}</small></div>
        </header>
        <div className="store-v422-reveal-grid">{group.grants.map((grant, index) => {
          const card = cardIndex.get(grant.cardId);
          const isNew = Number(grant.before || 0) === 0;
          const craft = Number(grant.craftAwarded || 0);
          const overflow = Boolean(grant.overflow);
          return <article
            key={`${grant.cardId}-${index}`}
            className={`${index < revealed ? "revealed" : "hidden-card"} ${overflow ? "overflow" : ""}`}
            role={index < revealed && card ? "button" : undefined}
            tabIndex={index < revealed && card ? 0 : undefined}
            onClick={() => { if (index < revealed && card) onOpenCard(card); }}
            onKeyDown={(event) => { if (index < revealed && card && (event.key === "Enter" || event.key === " ")) onOpenCard(card); }}
          >
            <div className="store-v422-reveal-card">
              {card?.image ? <img src={card.image} alt="" /> : <span>{grant.cardId}</span>}
              {isNew && <em className="store-v422-new-tag">NEW!</em>}
            </div>
            <strong>{card?.namePT || card?.nameEN || card?.name || grant.cardId}</strong>
            <small>{grant.cardId} · {grant.rarity || card?.rarity || "—"}</small>
            {isNew ? <b className="store-v422-get-tag">GET ×1</b> : <b className="store-v422-cc-tag">+{formatCoins(craft)} CC</b>}
            {overflow && <span className="store-v422-overflow-tag">{pt ? "6/6 · EXTRA CONVERTIDA" : "6/6 · EXTRA CONVERTED"}</span>}
          </article>;
        })}</div>
        <footer>
          <p>{pt ? "Cartas repetidas geram Craft Coins automaticamente. Cópias acima de 6/6 são convertidas em CC." : "Duplicate cards automatically generate Craft Coins. Copies above 6/6 are converted into CC."}</p>
          <button type="button" onClick={advance}>{!done ? (pt ? "Revelar tudo" : "Reveal All") : lastPage ? (pt ? "Concluir" : "Finish") : (pt ? "Próximo" : "Next")}</button>
        </footer>
      </section>
    </div>
  );
}

export default function Store({ onBack }) {
  const { language } = useLanguage();
  const pt = language !== "en";
  const [activeCategory, setActiveCategory] = useState("boosters");
  const [activeSaga, setActiveSaga] = useState("all");
  const [snapshot, setSnapshot] = useState({ wallet: { spiritCoins: 0, craftCoins: 0 }, collection: [], recipes: [], signedIn: false, source: "guest" });
  const [loading, setLoading] = useState(true);
  const [modalProduct, setModalProduct] = useState(null);
  const [opening, setOpening] = useState(null);
  const [detailCard, setDetailCard] = useState(null);
  const [craftBusy, setCraftBusy] = useState(false);
  const [craftMessage, setCraftMessage] = useState("");

  const categoryProducts = useMemo(() => SHOP_PRODUCTS.filter((item) => item.category === activeCategory), [activeCategory]);
  const sagaGroups = useMemo(() => activeCategory === "boosters" || activeCategory === "decks" ? sagaGroupsForProducts(categoryProducts) : [], [activeCategory, categoryProducts]);
  const products = useMemo(() => activeSaga === "all" ? categoryProducts : categoryProducts.filter((item) => sagaForProduct(item).id === activeSaga), [activeSaga, categoryProducts]);
  const [selectedId, setSelectedId] = useState(SHOP_PRODUCTS.find((item) => item.category === "boosters")?.id || null);
  const selected = SHOP_PRODUCTS.find((item) => item.id === selectedId && item.category === activeCategory) || products[0] || null;

  async function refresh(forced = null) {
    const next = forced || await loadEconomySnapshot();
    setSnapshot(next);
    setLoading(false);
  }

  useEffect(() => {
    let mounted = true;
    loadEconomySnapshot().then((next) => { if (mounted) { setSnapshot(next); setLoading(false); } });
    const handler = () => loadEconomySnapshot().then((next) => { if (mounted) setSnapshot(next); });
    window.addEventListener("bs:economy-changed", handler);
    return () => { mounted = false; window.removeEventListener("bs:economy-changed", handler); };
  }, []);

  useEffect(() => {
    setActiveSaga("all");
  }, [activeCategory]);

  useEffect(() => {
    if (activeCategory === "collection") return;
    if (!products.some((item) => item.id === selectedId)) setSelectedId(products[0]?.id || null);
  }, [activeCategory, products, selectedId]);

  function chooseProduct(product) {
    setSelectedId(product.id);
    setModalProduct(product);
  }

  const detailOwned = detailCard ? (collectionQuantityMap(snapshot.collection).get(detailCard.id) || 0) : 0;
  const detailPricing = detailCard ? craftCostForCard(detailCard, detailOwned) : null;

  async function handleCraftCard() {
    if (!detailCard || craftBusy) return;
    setCraftBusy(true);
    setCraftMessage("");
    const result = await craftCard(detailCard);
    if (result.ok) {
      await refresh(result.snapshot || null);
      setCraftMessage(pt ? "Carta forjada e adicionada à coleção." : "Card crafted and added to your collection.");
    } else {
      const error = String(result.error || "");
      setCraftMessage(
        error.includes("INSUFFICIENT_CRAFT_COINS") ? (pt ? "Craft Coins insuficientes." : "Not enough Craft Coins.") :
        error.includes("MAX_OWNED_COPIES") ? (pt ? "Você já possui 6/6 cópias desta carta." : "You already own 6/6 copies of this card.") :
        (pt ? "Não foi possível forjar esta carta." : "Could not craft this card.")
      );
    }
    setCraftBusy(false);
  }

  const sectionTitle = activeCategory === "boosters" ? "Card Packs" : activeCategory === "decks" ? "Decks" : (pt ? "Acessórios" : "Accessories");

  return (
    <main className="store-v420-page">
      <EternalCinematicBackdrop /><div className="store-v420-shade" aria-hidden="true" />
      <header className="store-v420-topbar">
        <button type="button" className="store-v420-back" onClick={onBack}>← <span>{pt ? "Voltar" : "Back"}</span></button>
        <div className="store-v420-title"><span>BATTLE SPIRITS ETERNAL</span><strong>{pt ? "LOJA" : "STORE"}</strong></div>
        <div className="store-v420-wallet" aria-busy={loading}><CurrencyChip kind="spirit" amount={snapshot.wallet.spiritCoins} pt={pt} /><CurrencyChip kind="craft" amount={snapshot.wallet.craftCoins} pt={pt} /></div>
      </header>
      <section className="store-v420-shell">
        <nav className="store-v420-tabs">{SHOP_CATEGORIES.map((category) => <button type="button" key={category.id} className={activeCategory === category.id ? "active" : ""} onClick={() => setActiveCategory(category.id)}>{pt ? category.labelPT : category.labelEN}{category.id === "accessories" && <small>{pt ? "EM BREVE" : "COMING SOON"}</small>}</button>)}</nav>
        {activeCategory === "collection" ? <CollectionPanel collection={snapshot.collection} pt={pt} /> : (
          <div className="store-v420-content">
            <aside className="store-v420-series">
              <span>{pt ? "CATÁLOGO" : "CATALOG"}</span>
              <button type="button" className={activeSaga === "all" ? "active" : ""} onClick={() => setActiveSaga("all")}><b>{pt ? "Todos" : "All"}</b><small>{categoryProducts.length}</small></button>
              {sagaGroups.map((saga) => <button type="button" key={saga.id} className={activeSaga === saga.id ? "active" : ""} onClick={() => setActiveSaga(saga.id)} title={pt ? saga.descriptionPT : saga.descriptionEN}><b>{pt ? saga.labelPT : saga.labelEN}</b><small>{saga.count}</small></button>)}
              {!sagaGroups.length && <button type="button" className="active"><b>{sectionTitle}</b><small>{categoryProducts.length}</small></button>}
              <div className="store-v420-craft-note"><b>CC</b><div><strong>Craft Coins</strong><p>{pt ? "Duplicatas geram CC. Cartas acima de 6 cópias são convertidas diretamente em CC." : "Duplicates grant CC. Cards above 6 copies are converted directly into CC."}</p></div></div>
            </aside>
            <section className="store-v420-products">
              <div className="store-v420-section-heading"><div><span>{pt ? "ECONOMIA 100% GAMEPLAY" : "100% GAMEPLAY ECONOMY"}</span><h2>{activeSaga === "all" ? sectionTitle : (pt ? sagaForProduct(products[0]).labelPT : sagaForProduct(products[0]).labelEN)}</h2></div><small>{pt ? `${products.length} produtos` : `${products.length} products`}</small></div>
              <div className="store-v420-product-grid">{products.map((product) => <ProductCard key={product.id} product={product} selected={selected?.id === product.id} onSelect={chooseProduct} pt={pt} />)}</div>
              {selected && <article className={`store-v420-detail ${selected.status !== "active" ? "unavailable" : ""}`}><div className="store-v420-detail-art"><Artwork product={selected} /></div><div className="store-v420-detail-copy"><span>{pt ? sagaForProduct(selected).labelPT : sagaForProduct(selected).labelEN}</span><h3>{selected.title}</h3><p>{selected.status === "active" ? (pt ? "Abra o produto para consultar o Card Preview completo, ownership x/6 e quantidade da compra." : "Open the product to check the complete Card Preview, x/6 ownership and purchase quantity.") : (pt ? selected.dataNotePT || "Este item ainda não pode ser comprado." : selected.dataNoteEN || "This item cannot be purchased yet.")}</p><div className="store-v420-detail-footer">{selected.spiritPrice != null ? <strong><b>SC</b>{formatCoins(selected.spiritPrice)}</strong> : <strong>{pt ? "INDISPONÍVEL" : "UNAVAILABLE"}</strong>}<button type="button" disabled={selected.status === "unavailable"} onClick={() => setModalProduct(selected)}>{pt ? "Ver produto" : "View Product"}</button></div></div></article>}
            </section>
          </div>
        )}
        <footer className="store-v420-footnote"><span>{snapshot.signedIn ? (pt ? "Economia vinculada à sua conta" : "Economy linked to your account") : (pt ? "Modo Guest · progresso apagado ao fechar o simulador" : "Guest Mode · progress is wiped when the simulator closes")}</span></footer>
      </section>
      {modalProduct && <ProductModal product={modalProduct} snapshot={snapshot} pt={pt} onClose={() => setModalProduct(null)} onPurchased={refresh} onReveal={setOpening} onOpenCard={(card) => { setCraftMessage(""); setDetailCard(card); }} />}
      {opening && <PackOpeningSequence opening={opening} pt={pt} onClose={() => setOpening(null)} onOpenCard={(card) => { setCraftMessage(""); setDetailCard(card); }} />}
      {detailCard && detailPricing && <CardDetailsModal
        card={detailCard}
        onClose={() => { setDetailCard(null); setCraftMessage(""); }}
        initialLanguage={pt ? "ptBR" : "en"}
        crafting={{
          cost: detailPricing.cost,
          discount: detailPricing.discount,
          discounted: detailPricing.discounted,
          owned: detailOwned,
          maxOwned: MAX_OWNED_COPIES,
          wallet: snapshot.wallet.craftCoins,
          busy: craftBusy,
          message: craftMessage,
          onCraft: handleCraftCard
        }}
      />}
    </main>
  );
}
