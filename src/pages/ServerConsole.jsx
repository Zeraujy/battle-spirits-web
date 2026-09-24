import { useEffect, useState } from "react";

const EMPTY = { running: false, port: 3001, cards: 0, rooms: 0, connectedPlayers: 0, error: null };

export default function ServerConsole() {
  const desktop = window.battleSpiritsDesktop;
  const [status, setStatus] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!desktop?.getServerStatus) return;
    try { setStatus(await desktop.getServerStatus()); } catch {}
  }

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 1000);
    return () => clearInterval(timer);
  }, []);

  async function toggle() {
    setBusy(true);
    try {
      if (status.running) await desktop.stopServer();
      else await desktop.startServer();
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return <main className="utility-page server-page">
    <section className="utility-shell server-shell">
      <img className="utility-logo" src="./images/logo_battlespirits.png" alt="Battle Spirits" />
      <span className="eyebrow">LOCAL / LAN SERVER</span>
      <h1>Battle Spirits Server</h1>

      <div className={`server-indicator ${status.running ? "online" : "offline"}`}>
        <i />
        <strong>{status.running ? "ONLINE" : "OFFLINE"}</strong>
      </div>

      <div className="server-stats-grid">
        <div><span>Porta</span><strong>{status.port || 3001}</strong></div>
        <div><span>Cartas</span><strong>{status.cards || 0}</strong></div>
        <div><span>Salas</span><strong>{status.rooms || 0}</strong></div>
        <div><span>Jogadores</span><strong>{status.connectedPlayers || 0}</strong></div>
      </div>

      <div className="server-address-box">
        <span>Servidor local</span>
        <code>http://localhost:{status.port || 3001}</code>
        <small>Para outro PC da mesma rede, use o IPv4 deste computador no lugar de localhost.</small>
      </div>

      {status.error && <div className="server-error"><strong>Erro</strong><span>{status.error}</span></div>}

      <button className={status.running ? "danger-btn big" : "primary-btn big"} disabled={busy} onClick={toggle}>
        {busy ? "Aguarde..." : status.running ? "Parar servidor" : "Iniciar servidor"}
      </button>
    </section>
  </main>;
}
