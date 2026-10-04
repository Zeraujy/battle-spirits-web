import { useEffect, useState } from "react";

const TABS = [
  ["inspector", "Card"],
  ["manual", "Manual"],
  ["log", "Log"],
  ["chat", "Chat"]
];

const PHASES = ["Start", "Core", "Draw", "Refresh", "Main", "Attack", "End"];

const CARD_COLOR_STYLES = {
  red: { accent: "#ef5350", soft: "rgba(239,83,80,.16)" },
  purple: { accent: "#ab6ee8", soft: "rgba(171,110,232,.16)" },
  green: { accent: "#5fbd68", soft: "rgba(95,189,104,.16)" },
  white: { accent: "#e9edf2", soft: "rgba(233,237,242,.13)" },
  yellow: { accent: "#e6c84f", soft: "rgba(230,200,79,.16)" },
  blue: { accent: "#4da4e8", soft: "rgba(77,164,232,.16)" }
};

const OFFICIAL_KEYWORDS = [
  "Flash", "Burst", "Brave", "Confront", "Rush", "Immortality", "Awaken",
  "Ultra Awaken", "Curse", "True Curse", "Crush", "High Speed", "Ice Wall",
  "Armor", "Heavy Armor", "Tribute", "Charge", "Assault", "Holy Life", "Storm",
  "Strong Wind", "Windstorm", "Swift", "Accel", "Brilliance", "Clash", "Strengthening",
  "Ultimate Trigger", "Critical Hit", "Chain", "Contract Advent Source", "Soul State",
  "When Summoned", "When Attacks", "When Blocks", "When Braved", "While Set",
  "Once per Turn", "Either Attack Step", "During OC", "Spirit", "Ultimate", "Nexus", "Magic"
];

function normalizeColor(card) {
  const raw = card?.color || card?.colors?.[0] || "";
  const color = String(raw).trim().toLowerCase();
  return CARD_COLOR_STYLES[color] ? color : "white";
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractBracketKeywords(text) {
  return [...String(text || "").matchAll(/\[([^\]]{1,80})\]/g)]
    .map((match) => match[1]?.trim())
    .filter(Boolean);
}

function createKeywordRegex(card, text = "") {
  const explicit = Array.isArray(card?.keywords)
    ? card.keywords.filter((value) => typeof value === "string" && value.trim())
    : [];
  const candidates = [...new Set([...explicit, ...OFFICIAL_KEYWORDS, ...extractBracketKeywords(text)])]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  if (!candidates.length) return null;
  return new RegExp(`(${candidates.map(escapeRegExp).join("|")})`, "gi");
}

function HighlightedRulesText({ card, text }) {
  if (!text) return null;
  const chunks = String(text).split(/(\[[^\]]+\])/g).filter(Boolean);
  return chunks.flatMap((chunk, chunkIndex) => {
    if (/^\[[^\]]+\]$/.test(chunk)) {
      return <mark className="arena-visual-keyword is-bracketed" key={`bracket-${chunkIndex}`}>{chunk}</mark>;
    }
    const keywordRegex = createKeywordRegex(card, chunk);
    if (!keywordRegex) return chunk;
    return String(chunk).split(keywordRegex).map((part, index) => {
      keywordRegex.lastIndex = 0;
      const isKeyword = keywordRegex.test(part);
      keywordRegex.lastIndex = 0;
      return isKeyword
        ? <mark className="arena-visual-keyword" key={`${chunkIndex}-${part}-${index}`}>{part}</mark>
        : part;
    });
  });
}

function effectBlocks(card) {
  const primaryText = card?.rulesText || card?.effectText || card?.description || "";
  const blocks = String(primaryText)
    .split(/\n{2,}|(?=\[[^\]]+\])/g)
    .map((value) => value.trim())
    .filter(Boolean);
  if (blocks.length) return blocks;
  return (Array.isArray(card?.effects) ? card.effects : [])
    .map((effect) => typeof effect === "string" ? effect : (effect?.text || effect?.effectText || effect?.description || ""))
    .map((value) => String(value).trim())
    .filter(Boolean);
}

function InspectorPanel({ card }) {
  if (!card) {
    return (
      <div className="arena-visual-utility-empty">
        <span>Card Inspector</span>
        <strong>Select a card</strong>
        <p>Click a card in your hand or on either Battlefield to inspect its information and effects.</p>
      </div>
    );
  }

  const colorName = normalizeColor(card);
  const colorStyle = CARD_COLOR_STYLES[colorName];
  const effectParagraphs = effectBlocks(card);

  return (
    <div
      className="arena-visual-inspector"
      style={{
        "--arena-visual-card-accent": colorStyle.accent,
        "--arena-visual-card-accent-soft": colorStyle.soft
      }}
    >
      <div className="arena-visual-inspector-artwork">
        <img src={card.image || "/images/card-back.webp"} alt={card.name || "Card"} draggable="false" />
      </div>

      <div className="arena-visual-inspector-identity">
        <span className="arena-visual-inspector-type">{card.cardType || card.type || "Card"}</span>
        <h2>{card.name || "Card"}</h2>
        <div className="arena-visual-inspector-tags">
          {card.id ? <b>{card.id}</b> : null}
          {Number.isFinite(card.cost) ? <b>Cost {card.cost}</b> : null}
          {Number.isFinite(card.level) ? <b>Lv{card.level}</b> : null}
          {Number.isFinite(card.bp) ? <b>{card.bp} BP</b> : null}
          {card.rarity ? <b>{card.rarity}</b> : null}
        </div>
      </div>

      <div className="arena-visual-inspector-section">
        <span>Effects & Keywords</span>
        {effectParagraphs.length ? effectParagraphs.map((effect, index) => (
          <article className="arena-visual-effect-block" key={`${index}-${effect.slice(0, 24)}`}>
            <b>Effect {String(index + 1).padStart(2, "0")}</b>
            <p><HighlightedRulesText card={card} text={effect} /></p>
          </article>
        )) : <p className="is-muted">No card text available.</p>}
      </div>

      <div className="arena-visual-inspector-stats">
        <div><span>Cores</span><strong>{card.coreCount || 0}</strong></div>
        <div><span>Soul Core</span><strong>{card.soulCoreCount || 0}</strong></div>
        <div><span>Status</span><strong>{card.exhausted ? "Exhausted" : "Ready"}</strong></div>
      </div>
    </div>
  );
}

function MatchPanel({ utility }) {
  const currentPhase = utility?.currentPhase || "Main";
  const currentPhaseIndex = Math.max(0, PHASES.findIndex((phase) => phase.toLowerCase() === String(currentPhase).toLowerCase()));
  return (
    <div className="arena-visual-match-panel">
      <div className="arena-visual-turn-card">
        <span>Turn</span><strong>{utility?.turnNumber || 1}</strong>
        <small>{utility?.activePlayerName || "Current player"}</small>
      </div>
      <div className="arena-visual-phase-track">
        {PHASES.map((phase, index) => (
          <div key={phase} className={`arena-visual-phase-step${index === currentPhaseIndex ? " is-current" : ""}${index < currentPhaseIndex ? " is-complete" : ""}`}>
            <i />
            <span>{phase}</span>
          </div>
        ))}
      </div>
      <div className="arena-visual-match-status">
        <span>Priority</span><strong>{utility?.priorityLabel || "Waiting"}</strong>
      </div>
      <BattleStatusBanner battle={utility?.battle} />
    </div>
  );
}

function ManualPanel({ selectedCard, utility, onActionRequest }) {
  const manual = utility?.manual || {};
  const disabled = !manual.canUse;
  const selectedInstanceId = selectedCard?.instanceId || manual.selectedInstanceId || null;
  const selectedZone = manual.selectedZone || selectedCard?.sourceZone || null;
  const actorId = manual.actorId || null;
  const revealed = Array.isArray(manual.revealed) ? manual.revealed : [];

  function manualAction(payload) {
    if (disabled) return;
    onActionRequest?.({ id: `manual-${payload.type}`, type: "MANUAL_ACTION", actorId, payload });
  }

  function moveSelected(destination, placement = "top") {
    if (!selectedInstanceId) return;
    if (destination === "trash" && ["spirits", "nexuses", "other"].includes(selectedZone)) {
      manualAction({ type: "destroy", instanceId: selectedInstanceId });
      return;
    }
    if (destination === "hand" && ["spirits", "nexuses", "other"].includes(selectedZone)) {
      manualAction({ type: "returnHand", instanceId: selectedInstanceId });
      return;
    }
    manualAction({ type: "moveCard", instanceId: selectedInstanceId, destination, placement });
  }

  return (
    <div className="arena-visual-manual-panel">
      <header>
        <span>Manual Resolution</span>
        <strong>Developer-safe fallback</strong>
        <p>Use these controls only for unresolved card text or tabletop corrections. Rule-driven actions must use their normal gameplay flow.</p>
      </header>

      <div className={`arena-visual-manual-policy${disabled ? " is-disabled" : " is-enabled"}`}>
        <b>{disabled ? "Manual tools locked" : "Manual tools available"}</b>
        <span>{manual.reason || "Manual fallback policy unavailable."}</span>
      </div>

      <div className="arena-visual-manual-section">
        <span>Player State</span>
        <div className="arena-visual-manual-grid">
          <button disabled={disabled} onClick={() => manualAction({ type: "draw", playerId: actorId, count: 1 })}>Draw 1</button>
          <button disabled={disabled} onClick={() => manualAction({ type: "topDeckToTrash", playerId: actorId })}>Top → Trash</button>
          <button disabled={disabled} onClick={() => manualAction({ type: "revealTop", playerId: actorId })}>Reveal Top</button>
          <button disabled={disabled} onClick={() => manualAction({ type: "adjustLife", playerId: actorId, delta: -1 })}>−1 Life</button>
          <button disabled={disabled} onClick={() => manualAction({ type: "adjustLife", playerId: actorId, delta: 1 })}>+1 Life</button>
          <button disabled={disabled} onClick={() => manualAction({ type: "voidToReserve", playerId: actorId })}>Void → Core</button>
        </div>
        <small>Core and Soul Core corrections remain available through the physical Core click/drag system.</small>
      </div>

      <div className="arena-visual-manual-section arena-visual-manual-selected">
        <span>Selected Card</span>
        <strong>{selectedCard?.name || "Select one of your cards"}</strong>
        {selectedZone ? <small>Current zone: {selectedZone}</small> : null}
        <div className="arena-visual-manual-grid">
          <button disabled={disabled || !selectedInstanceId} onClick={() => manualAction({ type: "temporaryBP", instanceId: selectedInstanceId, amount: 1000 })}>+1000 BP</button>
          <button disabled={disabled || !selectedInstanceId} onClick={() => manualAction({ type: "temporaryBP", instanceId: selectedInstanceId, amount: -1000 })}>−1000 BP</button>
          <button disabled={disabled || !selectedInstanceId} onClick={() => manualAction({ type: "refresh", instanceId: selectedInstanceId })}>Refresh</button>
          <button disabled={disabled || !selectedInstanceId} onClick={() => manualAction({ type: "exhaust", instanceId: selectedInstanceId })}>Exhaust</button>
          <button disabled={disabled || !selectedInstanceId} onClick={() => manualAction({ type: "destroy", instanceId: selectedInstanceId })}>Destroy</button>
          <button disabled={disabled || !selectedInstanceId} onClick={() => manualAction({ type: "returnHand", instanceId: selectedInstanceId })}>→ Hand</button>
        </div>
        <div className="arena-visual-manual-move-grid">
          <button disabled={disabled || !selectedInstanceId} onClick={() => moveSelected("hand")}>Move → Hand</button>
          <button disabled={disabled || !selectedInstanceId} onClick={() => moveSelected("trash")}>Move → Trash</button>
          <button disabled={disabled || !selectedInstanceId} onClick={() => moveSelected("deck", "top")}>Move → Deck Top</button>
          <button disabled={disabled || !selectedInstanceId} onClick={() => moveSelected("deck", "bottom")}>Move → Deck Bottom</button>
        </div>
      </div>

      <div className="arena-visual-manual-section">
        <span>Revealed Cards</span>
        {revealed.length ? (
          <div className="arena-visual-manual-revealed">
            {revealed.map((card) => (
              <article key={card.instanceId || card.id}>
                {card.image ? <img src={card.image} alt="" draggable="false" /> : null}
                <span><strong>{card.name || card.cardId || "Revealed Card"}</strong><small>{card.cardId || ""}</small></span>
                <div>
                  <button disabled={disabled} onClick={() => manualAction({ type: "revealedToHand", playerId: actorId, instanceId: card.instanceId })}>Hand</button>
                  <button disabled={disabled} onClick={() => manualAction({ type: "revealedToTop", playerId: actorId, instanceId: card.instanceId })}>Top</button>
                  <button disabled={disabled} onClick={() => manualAction({ type: "revealedToBottom", playerId: actorId, instanceId: card.instanceId })}>Bottom</button>
                </div>
              </article>
            ))}
          </div>
        ) : <p className="is-muted">No cards are currently revealed.</p>}
      </div>
    </div>
  );
}

function LogPanel({ entries = [] }) {
  const visible = [...entries].slice(-80).reverse();
  return (
    <div className="arena-visual-log-panel">
      {visible.length ? visible.map((entry, index) => (
        <article key={entry?.id || index}>
          <span>{entry?.turn ? `T${entry.turn}` : "EVENT"}{entry?.phase ? ` • ${String(entry.phase).toUpperCase()}` : ""}</span>
          <p>{entry?.text || String(entry)}</p>
        </article>
      )) : <div className="arena-visual-utility-empty is-compact"><strong>No match events yet</strong></div>}
    </div>
  );
}

function ChatPanel({ messages = [] }) {
  return (
    <div className="arena-visual-chat-panel">
      <div className="arena-visual-chat-messages">
        {messages.length ? messages.slice(-80).map((message, index) => (
          <div key={message?.id || index} className={`arena-visual-chat-message${message?.self ? " is-self" : ""}`}>
            <span>{message?.author || "Player"}</span>
            <p>{message?.text || String(message)}</p>
          </div>
        )) : <div className="arena-visual-utility-empty is-compact"><strong>No messages yet</strong></div>}
      </div>
      <div className="arena-visual-chat-compose" aria-hidden="true">
        <span>Message…</span><button type="button" tabIndex={-1}>Send</button>
      </div>
    </div>
  );
}



function EffectDecisionPanel({ decision, onActionRequest }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [order, setOrder] = useState([]);
  const [distribution, setDistribution] = useState({});

  useEffect(() => {
    setSelectedIds([]);
    setOrder((decision?.candidates || []).map((candidate) => candidate.triggerId || candidate.instanceId || candidate.id).filter(Boolean));
    setDistribution({});
  }, [decision?.id]);

  if (!decision) return null;

  const waiting = Boolean(decision.waiting);
  const isOption = ["chooseOption", "chooseYesNo"].includes(decision.kind);
  const isOrder = ["chooseOrder", "chooseTriggerOrder"].includes(decision.kind);
  const isCoreDistribution = decision.kind === "chooseCoreDistribution";
  const isSelection = !isOption && !isOrder && !isCoreDistribution;
  const minimum = Math.max(0, Number(decision.minimum || 0));
  const maximum = Math.max(minimum, Number(decision.maximum || 1));
  const selectedBP = selectedIds.reduce((total, id) => {
    const candidate = (decision.candidates || []).find((item) => (item.instanceId || item.id) === id);
    return total + Number(candidate?.bp || 0);
  }, 0);
  const selectionReady = selectedIds.length >= minimum && selectedIds.length <= maximum && (decision.maxTotalBP == null || selectedBP <= Number(decision.maxTotalBP));
  const assigned = Object.values(distribution).reduce((sum, value) => sum + Math.max(0, Number(value || 0)), 0);
  const required = Math.max(0, Number(decision.totalCores || 0));
  const distributionReady = decision.exactTotal !== false ? assigned === required : assigned <= required;

  function resolve(payload) {
    onActionRequest?.({
      id: "resolve-effect-decision",
      type: "RESOLVE_EFFECT_DECISION",
      decisionId: decision.id,
      payload: { decisionId: decision.id, ...payload }
    });
  }

  function toggleCandidate(candidate) {
    const id = candidate.instanceId || candidate.id;
    if (!id) return;
    if (decision.kind !== "selectMultipleTargets" && maximum <= 1) {
      resolve({ selectedInstanceIds: [id] });
      return;
    }
    setSelectedIds((current) => current.includes(id)
      ? current.filter((value) => value !== id)
      : (current.length >= maximum ? current : [...current, id]));
  }

  function moveOrder(id, delta) {
    setOrder((current) => {
      const index = current.indexOf(id);
      const nextIndex = index + delta;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function changeDistribution(id, delta) {
    setDistribution((current) => {
      const currentValue = Math.max(0, Number(current[id] || 0));
      if (delta > 0 && assigned >= required) return current;
      const nextValue = Math.max(0, currentValue + delta);
      const next = { ...current, [id]: nextValue };
      if (!nextValue) delete next[id];
      return next;
    });
  }

  return (
    <section className="arena-visual-effect-decision" aria-live="polite">
      <header>
        <span>Effect Resolution</span>
        <strong>{decision.title || "Effect Resolution"}</strong>
        {waiting ? <small>Waiting for the other player</small> : null}
      </header>
      {decision.instruction ? <p>{decision.instruction}</p> : null}

      {!waiting && isOption ? (
        <div className="arena-visual-decision-options">
          {(decision.options || []).map((option) => (
            <button key={option.id} type="button" onClick={() => resolve({ optionId: String(option.id) })}>{option.label}</button>
          ))}
        </div>
      ) : null}

      {!waiting && isSelection ? (
        <>
          <div className="arena-visual-decision-candidates">
            {(decision.candidates || []).map((candidate) => {
              const id = candidate.instanceId || candidate.id;
              const selected = selectedIds.includes(id);
              return (
                <button key={candidate.id || id} type="button" className={selected ? "is-selected" : ""} onClick={() => toggleCandidate(candidate)}>
                  {candidate.image ? <img src={candidate.image} alt="" draggable="false" /> : null}
                  <span><strong>{candidate.name || candidate.label || "Choice"}</strong>{candidate.cardId ? <small>{candidate.cardId}</small> : null}</span>
                </button>
              );
            })}
          </div>
          <footer className="arena-visual-decision-footer">
            <span>{selectedIds.length}/{maximum}{decision.maxTotalBP != null ? ` • ${selectedBP}/${decision.maxTotalBP} BP` : ""}</span>
            <div>
              {minimum === 0 ? <button type="button" className="is-quiet" onClick={() => resolve({ selectedInstanceIds: [] })}>Choose none</button> : null}
              <button type="button" disabled={!selectionReady} onClick={() => resolve({ selectedInstanceIds: selectedIds })}>Confirm</button>
            </div>
          </footer>
        </>
      ) : null}

      {!waiting && isOrder ? (
        <div className="arena-visual-decision-order">
          {order.map((id, index) => {
            const candidate = (decision.candidates || []).find((item) => (item.triggerId || item.instanceId || item.id) === id);
            return (
              <div key={id}>
                <b>{index + 1}</b>
                <span><strong>{candidate?.label || candidate?.name || id}</strong><small>{candidate?.cardId || ""}</small></span>
                <button type="button" disabled={index === 0} onClick={() => moveOrder(id, -1)}>↑</button>
                <button type="button" disabled={index === order.length - 1} onClick={() => moveOrder(id, 1)}>↓</button>
              </div>
            );
          })}
          <button type="button" className="arena-visual-decision-confirm" onClick={() => resolve(decision.kind === "chooseTriggerOrder" ? { orderedTriggerIds: order } : { orderedInstanceIds: order })}>Confirm order</button>
        </div>
      ) : null}

      {!waiting && isCoreDistribution ? (
        <div className="arena-visual-decision-core-distribution">
          {(decision.candidates || []).map((candidate) => {
            const id = candidate.instanceId || candidate.id;
            const amount = Number(distribution[id] || 0);
            return (
              <div key={id}>
                <span><strong>{candidate.name || candidate.cardId}</strong><small>{candidate.cardId || ""}</small></span>
                <button type="button" disabled={amount <= 0} onClick={() => changeDistribution(id, -1)}>−</button>
                <b>{amount}</b>
                <button type="button" disabled={assigned >= required} onClick={() => changeDistribution(id, 1)}>+</button>
              </div>
            );
          })}
          <footer className="arena-visual-decision-footer">
            <span>{assigned}/{required} Cores</span>
            <button type="button" disabled={!distributionReady} onClick={() => resolve({ coreDistribution: distribution })}>Confirm Cores</button>
          </footer>
        </div>
      ) : null}
    </section>
  );
}

function BattleStatusBanner({ battle }) {
  if (!battle) return null;
  return (
    <div className="arena-visual-battle-status">
      <span>Battle</span>
      <strong>{String(battle.stage || "battle").replaceAll("-", " ")}</strong>
      <small>{battle.blockerInstanceId ? "Attacker vs Blocker" : (battle.attackerInstanceId ? "Direct attack / awaiting defense" : "Battle timing")}</small>
    </div>
  );
}

function PendingActionBanner({ pending }) {
  if (!pending) return null;
  return (
    <div className="arena-visual-pending-action" aria-live="polite">
      <div>
        <span>{pending.label}</span>
        <strong>{pending.paid} / {pending.payableCost} Cores</strong>
      </div>
      {Number(pending.minimumCores || 0) > 0 ? (
        <small>Minimum on card: {pending.minimumCores}</small>
      ) : null}
    </div>
  );
}

export default function ArenaVisualUtilityPanel({ selectedCard = null, utility = {}, onActionRequest, collapsed = false, onToggleCollapsed }) {
  const [activeTab, setActiveTab] = useState("inspector");
  const [showGameSettings, setShowGameSettings] = useState(false);
  if (collapsed) {
    return (
      <aside className="arena-visual-utility is-collapsed" aria-label="Arena utility panel collapsed">
        <button
          type="button"
          className="arena-visual-utility-collapse-toggle is-collapsed"
          onClick={onToggleCollapsed}
          aria-label="Open utility panel"
          title="Open panel"
        >
          <span aria-hidden="true">‹</span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="arena-visual-utility" aria-label="Arena utility panel">
      <button
        type="button"
        className="arena-visual-utility-collapse-toggle"
        onClick={onToggleCollapsed}
        aria-label="Hide utility panel"
        title="Hide panel"
      >
        <span aria-hidden="true">›</span>
      </button>
      <nav className="arena-visual-utility-tabs" aria-label="Utility navigation">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" className={activeTab === id ? "is-active" : ""} onClick={() => setActiveTab(id)}>
            {label}
          </button>
        ))}
      </nav>

      <div className="arena-visual-utility-main" data-active-tab={showGameSettings ? "settings" : activeTab}>
        {showGameSettings ? (
          <section className="arena-visual-game-settings">
            <span>Game Settings</span>
            <strong>Match interface</strong>
            <p>System controls live here so gameplay prompts can remain independent from this panel.</p>
            <button type="button" onClick={onToggleCollapsed}>Hide Utility Panel</button>
            <button type="button" className="is-quiet" onClick={() => setShowGameSettings(false)}>Close Settings</button>
          </section>
        ) : null}
        {!showGameSettings && activeTab === "inspector" ? <InspectorPanel card={selectedCard} /> : null}
        {!showGameSettings && activeTab === "manual" ? <ManualPanel selectedCard={selectedCard} utility={utility} onActionRequest={onActionRequest} /> : null}
        {!showGameSettings && activeTab === "log" ? <LogPanel entries={utility?.logEntries || []} /> : null}
        {!showGameSettings && activeTab === "chat" ? <ChatPanel messages={utility?.chatMessages || []} /> : null}
      </div>

      <div className="arena-visual-system-actions" aria-label="Game system actions">
        <button
          type="button"
          onClick={() => setShowGameSettings((value) => !value)}
        >
          Game Settings
        </button>
        <button
          type="button"
          className="is-danger"
          onClick={() => onActionRequest?.({ id: "surrender-match", type: "SURRENDER_MATCH", label: "Surrender" })}
        >
          Surrender
        </button>
      </div>
    </aside>
  );
}
