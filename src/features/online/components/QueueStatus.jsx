export default function QueueStatus({ message = "Procurando adversário...", onCancel }) {
  return (
    <div className="online-queue-status" role="status" aria-live="polite">
      <div className="online-queue-status__pulse" aria-hidden="true" />
      <div>
        <span className="online-queue-status__eyebrow">CASUAL MATCHMAKING</span>
        <strong>{message}</strong>
        <small>A fila é controlada pelo servidor.</small>
      </div>
      {onCancel && (
        <button type="button" onClick={onCancel}>Cancelar busca</button>
      )}
    </div>
  );
}
