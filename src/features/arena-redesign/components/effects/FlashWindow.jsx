export default function FlashWindow({ flash, onActionRequest }) {
  if (!flash?.active) return null;

  const passAction = flash.actions.find((action) => action.type === "PASS_FLASH");
  const playableCount = flash.actions.filter((action) => action.type !== "PASS_FLASH").length;

  return (
    <section className="arena-redesign-effect-window arena-redesign-flash-window" aria-label="Flash Window">
      <div>
        <span className="arena-redesign-effect-eyebrow">{flash.label || "Flash Timing"}</span>
        <strong>{flash.viewerHasPriority ? "Your priority" : "Waiting for priority"}</strong>
        {flash.viewerHasPriority && <small>{playableCount} Flash action{playableCount === 1 ? "" : "s"} available</small>}
      </div>
      {flash.viewerHasPriority && passAction && (
        <button type="button" onClick={() => onActionRequest?.(passAction, { source: "flash" })}>Pass</button>
      )}
    </section>
  );
}
