/**
 * Visual summary for manual Battle Spirits payments.
 *
 * This component never changes game state. It only translates the values
 * already calculated by the Rules Engine into a compact, readable payment UI.
 */
export default function PaymentStatus({
  printedCost = 0,
  reduction = 0,
  finalCost = 0,
  paid = 0,
  minimumCores = null,
  currentCores = null,
  language = "ptBR",
  mode = "summon"
}) {
  const pt = language !== "en";
  const costTarget = Math.max(0, Number(finalCost || 0));
  const paidValue = Math.max(0, Number(paid || 0));
  const paidPercent = costTarget === 0 ? 100 : Math.min(100, (paidValue / costTarget) * 100);
  const costComplete = paidValue === costTarget;

  const minTarget = minimumCores == null ? null : Math.max(0, Number(minimumCores || 0));
  const currentValue = currentCores == null ? null : Math.max(0, Number(currentCores || 0));
  const levelComplete = minTarget == null || currentValue >= minTarget;
  const levelPercent = minTarget === null || minTarget === 0
    ? 100
    : Math.min(100, (currentValue / minTarget) * 100);

  const remaining = Math.max(0, costTarget - paidValue);

  return (
    <div className={`payment-status ${costComplete && levelComplete ? "is-complete" : ""}`}>
      <div className="payment-cost-equation" aria-label={pt ? "Resumo do custo" : "Cost summary"}>
        <span>
          <small>{pt ? "Custo base" : "Base cost"}</small>
          <b>{Number(printedCost || 0)}</b>
        </span>
        <i>−</i>
        <span className="reduction">
          <small>{pt ? "Redução" : "Reduction"}</small>
          <b>{Number(reduction || 0)}</b>
        </span>
        <i>=</i>
        <span className="final">
          <small>{pt ? "Custo final" : "Final cost"}</small>
          <b>{costTarget}</b>
        </span>
      </div>

      <div className={`payment-progress-row ${costComplete ? "complete" : ""}`}>
        <div className="payment-progress-copy">
          <span>{mode === "summon" ? (pt ? "Custo de invocação" : "Summon cost") : (pt ? "Custo para usar" : "Cost to use")}</span>
          <b>{paidValue}/{costTarget}</b>
        </div>
        <div className="payment-progress-track" aria-hidden="true">
          <i style={{ width: `${paidPercent}%` }} />
        </div>
        <small>
          {costComplete
            ? (pt ? "Pagamento concluído" : "Payment complete")
            : (pt ? `Faltam ${remaining} Core${remaining === 1 ? "" : "s"}` : `${remaining} Core${remaining === 1 ? "" : "s"} remaining`)}
        </small>
      </div>

      {minTarget !== null && currentValue !== null && (
        <div className={`payment-progress-row level ${levelComplete ? "complete" : ""}`}>
          <div className="payment-progress-copy">
            <span>{pt ? "Cores mínimo" : "Minimum Cores"}</span>
            <b>{currentValue}/{minTarget}</b>
          </div>
          <div className="payment-progress-track" aria-hidden="true">
            <i style={{ width: `${levelPercent}%` }} />
          </div>
          <small>
            {levelComplete
              ? (pt ? "LV mínimo garantido" : "Minimum LV secured")
              : (pt ? "Coloque Cores na carta antes de confirmar" : "Place Cores on the card before confirming")}
          </small>
        </div>
      )}
    </div>
  );
}
