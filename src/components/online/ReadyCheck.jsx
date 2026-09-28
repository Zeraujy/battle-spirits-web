import { useEffect, useMemo, useState } from "react";

function remainingSeconds(deadline, now) {
  return Math.max(0, Math.ceil((Number(deadline || 0) - now) / 1000));
}

export default function ReadyCheck({ readyCheck, onReady, onCancel, submitting = false }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);

  const seconds = useMemo(
    () => remainingSeconds(readyCheck?.deadline, now),
    [readyCheck?.deadline, now]
  );

  const playerReady = Boolean(readyCheck?.playerReady);
  const opponentReady = Boolean(readyCheck?.opponentReady);

  return (
    <div className="online-ready-check" role="dialog" aria-labelledby="online-ready-check-title">
      <div className="online-ready-check__header">
        <span>PARTIDA ENCONTRADA</span>
        <strong id="online-ready-check-title">Confirmar partida</strong>
        <small>{seconds}s</small>
      </div>

      <div className="online-ready-check__players">
        <div className={playerReady ? "is-ready" : ""}>
          <span>VOCÊ</span>
          <strong>{playerReady ? "PRONTO" : "AGUARDANDO"}</strong>
        </div>
        <div className={opponentReady ? "is-ready" : ""}>
          <span>OPONENTE</span>
          <strong>{opponentReady ? "PRONTO" : "AGUARDANDO"}</strong>
        </div>
      </div>

      <p>Os dois jogadores precisam confirmar antes da partida começar.</p>

      <div className="online-ready-check__actions">
        <button
          type="button"
          className="primary"
          disabled={playerReady || submitting || seconds <= 0}
          onClick={onReady}
        >
          {playerReady ? "Confirmado" : submitting ? "Confirmando..." : "Estou pronto"}
        </button>
        <button type="button" disabled={submitting} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}
