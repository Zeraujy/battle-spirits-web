import ArenaVisualBattleRestrictionHint from "./ArenaVisualBattleRestrictionHint.jsx";
import ArenaVisualBattleResultCue from "./ArenaVisualBattleResultCue.jsx";
import ArenaVisualFlashWindow from "./ArenaVisualFlashWindow.jsx";

function MiniCard({ card, role }) {
  if (!card) return (
    <div className={`arena-visual-battle-mini-card is-${role} is-empty`}>
      <span>{role === "attacker" ? "Attacker" : "Blocker"}</span>
      <strong>{role === "blocker" ? "No Blocker" : "—"}</strong>
    </div>
  );
  return (
    <div className={`arena-visual-battle-mini-card is-${role}`} style={{ "--arena-visual-battle-accent": card.color || "#f3f3f3" }}>
      {card.image ? <img src={card.image} alt="" draggable="false" /> : null}
      <span>
        <small>{role === "attacker" ? "Attacker" : "Blocker"}</small>
        <strong>{card.name || card.cardId || role}</strong>
        {Number.isFinite(card.bp) ? <b>{card.bp} BP</b> : null}
      </span>
    </div>
  );
}

export default function ArenaVisualBattleState({ battle }) {
  if (!battle) return null;
  return (
    <section className={`arena-visual-battle-state is-${battle.stage || "active"}`}>
      <header>
        <span>Battle Timing</span>
        <strong>{battle.stageLabel || "Battle"}</strong>
        {battle.directAttack ? <b>Direct Attack</b> : null}
      </header>

      <div className="arena-visual-battle-pair">
        <MiniCard card={battle.attacker} role="attacker" />
        <i aria-hidden="true">→</i>
        <MiniCard card={battle.blocker} role="blocker" />
      </div>

      <ArenaVisualFlashWindow battle={battle} />
      <ArenaVisualBattleResultCue battle={battle} />
      <ArenaVisualBattleRestrictionHint battle={battle} />
    </section>
  );
}
