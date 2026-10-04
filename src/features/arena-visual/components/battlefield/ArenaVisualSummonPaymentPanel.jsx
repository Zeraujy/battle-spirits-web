export default function ArenaVisualSummonPaymentPanel({ pending }) {
  if (!pending || pending.kind !== "play") return null;

  const costReady = Number(pending.paid || 0) === Number(pending.payableCost || 0);
  const coreReady = Number(pending.currentCores || 0) >= Number(pending.minimumCores || 0);
  const ready = costReady && coreReady;

  return (
    <aside className="arena-visual-summon-payment" aria-live="polite">
      <span className="arena-visual-summon-payment-eyebrow">Summon</span>
      <strong>{pending.cardName || "Card"}</strong>

      <div className="arena-visual-summon-payment-grid">
        <div>
          <span>Printed cost</span>
          <strong>{pending.printedCost}</strong>
        </div>
        <div>
          <span>Reduction</span>
          <strong>-{pending.reductionApplied || 0}</strong>
        </div>
        <div className={costReady ? "is-ready" : ""}>
          <span>Cost payment</span>
          <strong>{pending.paid} / {pending.payableCost}</strong>
        </div>
        <div className={coreReady ? "is-ready" : ""}>
          <span>Minimum Cores</span>
          <strong>{pending.currentCores} / {pending.minimumCores}</strong>
        </div>
      </div>

      <p>
        Click Reserve Cores to pay. After the cost is complete, place the minimum Cores required on the card.
      </p>

      <small className="arena-visual-summon-payment-note">Confirm / Cancel actions are shown in the center action prompt.</small>
    </aside>
  );
}
