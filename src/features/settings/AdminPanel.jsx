import { useEffect, useMemo, useState } from "react";
import EternalCinematicBackdrop from "../../components/layout/EternalCinematicBackdrop.jsx";
import { useLanguage } from "../../localization/i18n.jsx";
import {
  adjustAdminCurrency,
  getAdminAccess,
  listAdminPlayers,
  setAdminPlayerStatus
} from "./services/adminService.js";
import "../../styles/pages/adminPanel.css";

export default function AdminPanel({ onBack }) {
  const { language } = useLanguage();
  const pt = language !== "en";
  const [access, setAccess] = useState("checking");
  const [players, setPlayers] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [currency, setCurrency] = useState("spirit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const selected = useMemo(() => players.find((row) => row.user_id === selectedId) || players[0] || null, [players, selectedId]);

  async function refresh(search = query) {
    const result = await listAdminPlayers(search);
    if (!result.ok) {
      setNotice(pt ? "Não foi possível carregar as contas." : "Could not load accounts.");
      return;
    }
    setPlayers(result.rows);
    if (result.rows.length && !result.rows.some((row) => row.user_id === selectedId)) setSelectedId(result.rows[0].user_id);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      const result = await getAdminAccess();
      if (!active) return;
      setAccess(result.allowed ? "allowed" : "denied");
      if (result.allowed) {
        const list = await listAdminPlayers("");
        if (!active) return;
        setPlayers(list.rows || []);
        if (list.rows?.[0]) setSelectedId(list.rows[0].user_id);
      }
    })();
    return () => { active = false; };
  }, []);

  async function applyCurrency() {
    if (!selected || !amount || Number(amount) === 0) return;
    setBusy(true); setNotice("");
    const result = await adjustAdminCurrency(selected.user_id, currency, Number(amount), reason);
    setBusy(false);
    if (!result.ok) {
      setNotice(pt ? "A alteração não pôde ser aplicada." : "The change could not be applied.");
      return;
    }
    setAmount(""); setReason("");
    setNotice(pt ? "Economia atualizada." : "Economy updated.");
    await refresh();
  }

  async function changeStatus(nextStatus) {
    if (!selected) return;
    setBusy(true); setNotice("");
    const result = await setAdminPlayerStatus(selected.user_id, nextStatus);
    setBusy(false);
    if (!result.ok) setNotice(pt ? "Não foi possível atualizar o status." : "Could not update status.");
    else {
      setNotice(pt ? "Status atualizado." : "Status updated.");
      await refresh();
    }
  }

  return (
    <main className="admin-panel-page">
      <EternalCinematicBackdrop compact />
      <div className="admin-panel-shade" aria-hidden="true" />
      <header className="admin-panel-topbar">
        <button type="button" onClick={onBack}>{pt ? "Voltar" : "Back"}</button>
        <div><span>BATTLE SPIRITS ETERNAL</span><h1>ADMIN PANEL</h1></div>
        <b>{pt ? "Gameplay & Economia" : "Gameplay & Economy"}</b>
      </header>

      {access === "checking" && <section className="admin-panel-state">{pt ? "Verificando acesso…" : "Checking access…"}</section>}
      {access === "denied" && (
        <section className="admin-panel-state">
          <strong>{pt ? "Acesso administrativo não autorizado" : "Administrative access not authorized"}</strong>
          <p>{pt ? "Este painel só fica disponível para contas com permissão administrativa." : "This panel is only available to accounts with administrative permission."}</p>
        </section>
      )}
      {access === "allowed" && (
        <section className="admin-panel-shell">
          <aside className="admin-player-list">
            <form onSubmit={(event) => { event.preventDefault(); refresh(query); }}>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={pt ? "Buscar jogador…" : "Search player…"} />
              <button type="submit" aria-label={pt ? "Buscar" : "Search"}>⌕</button>
            </form>
            <div>
              {players.map((player) => (
                <button type="button" key={player.user_id} className={selected?.user_id === player.user_id ? "active" : ""} onClick={() => setSelectedId(player.user_id)}>
                  <span><strong>{player.display_name || "Player"}</strong><small>@{player.username || "user"}</small></span>
                  <em>{player.account_status || "active"}</em>
                </button>
              ))}
            </div>
          </aside>

          <div className="admin-player-editor">
            {selected ? <>
              <header>
                <div><span>{pt ? "CONTA SELECIONADA" : "SELECTED ACCOUNT"}</span><h2>{selected.display_name || "Player"}</h2><small>@{selected.username}</small></div>
                <span className={`admin-status status-${selected.account_status || "active"}`}>{selected.account_status || "active"}</span>
              </header>

              <div className="admin-wallet-grid">
                <article><span>SC</span><div><small>Spirit Coins</small><strong>{Number(selected.spirit_coins || 0).toLocaleString("pt-BR")}</strong></div></article>
                <article><span>CC</span><div><small>Craft Coins</small><strong>{Number(selected.craft_coins || 0).toLocaleString("pt-BR")}</strong></div></article>
              </div>

              <section className="admin-editor-card">
                <div><span>{pt ? "AJUSTE DE ECONOMIA" : "ECONOMY ADJUSTMENT"}</span><h3>{pt ? "Adicionar ou deduzir Coins" : "Add or deduct Coins"}</h3></div>
                <div className="admin-form-grid">
                  <label><span>{pt ? "Moeda" : "Currency"}</span><select value={currency} onChange={(e) => setCurrency(e.target.value)}><option value="spirit">Spirit Coins</option><option value="craft">Craft Coins</option></select></label>
                  <label><span>{pt ? "Quantidade" : "Amount"}</span><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="-500 / 1500" /></label>
                </div>
                <label><span>{pt ? "Motivo interno" : "Internal reason"}</span><input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={240} /></label>
                <button type="button" className="admin-primary" disabled={busy || !amount || Number(amount) === 0} onClick={applyCurrency}>{pt ? "Aplicar alteração" : "Apply change"}</button>
              </section>

              <section className="admin-editor-card">
                <div><span>{pt ? "STATUS DE GAMEPLAY" : "GAMEPLAY STATUS"}</span><h3>{pt ? "Gerenciar estado da conta" : "Manage account state"}</h3></div>
                <div className="admin-status-actions">
                  <button type="button" onClick={() => changeStatus("active")} disabled={busy}>Active</button>
                  <button type="button" onClick={() => changeStatus("restricted")} disabled={busy}>Restricted</button>
                  <button type="button" onClick={() => changeStatus("suspended")} disabled={busy}>Suspended</button>
                </div>
              </section>

              <p className="admin-privacy-note">{pt ? "O Admin Panel não exibe senhas, tokens, e-mails privados ou outros dados sensíveis. Somente identidade pública, estado de gameplay e economia." : "The Admin Panel does not expose passwords, tokens, private emails or other sensitive data. Only public identity, gameplay status and economy are available."}</p>
              {notice && <div className="admin-notice">{notice}</div>}
            </> : <div className="admin-empty">{pt ? "Nenhum jogador encontrado." : "No players found."}</div>}
          </div>
        </section>
      )}
    </main>
  );
}
