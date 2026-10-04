export default function ArenaVisualOrderDecision({ decision, order, moveOrder, resolve }) {
  return (
    <div className="arena-visual-center-order">
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
      <button
        type="button"
        className="arena-visual-center-confirm"
        onClick={() => resolve(decision.kind === "chooseTriggerOrder" ? { orderedTriggerIds: order } : { orderedInstanceIds: order })}
      >
        Confirm Order
      </button>
    </div>
  );
}
