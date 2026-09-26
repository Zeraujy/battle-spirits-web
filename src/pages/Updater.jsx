import { useEffect, useState } from "react";
import { getAppInfo } from "../services/desktop.js";

export default function Updater() {
  const desktop = window.battleSpiritsDesktop;
  const [info, setInfo] = useState({ version: "3.9.3" });
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getAppInfo().then(setInfo).catch(() => {});
    const cleanup = desktop?.onUpdateProgress?.((payload) => setProgress(payload));
    return () => cleanup?.();
  }, []);

  async function check() {
    if (!desktop?.checkForUpdates) {
      setError("O atualizador só está disponível no aplicativo Windows.");
      return;
    }
    setStatus("checking");
    setError("");
    setResult(null);
    try {
      const response = await desktop.checkForUpdates();
      setResult(response);
      setStatus("done");
    } catch (e) {
      console.error("Falha ao verificar atualizações:", e);
      setError("Não foi possível verificar atualizações agora. Tente novamente mais tarde.");
      setStatus("error");
    }
  }

  async function install() {
    if (!result?.manifest) return;
    setStatus("downloading");
    setError("");
    setProgress({ percent: 0, received: 0, total: 0 });
    try {
      await desktop.downloadAndInstallUpdate(result.manifest);
      setStatus("installing");
    } catch (e) {
      console.error("Falha ao instalar atualização:", e);
      setError("Não foi possível instalar a atualização. Tente novamente.");
      setStatus("error");
    }
  }

  useEffect(() => {
    check();
  }, []);

  const pct = Number.isFinite(progress?.percent) ? progress.percent : null;

  return <main className="utility-page updater-page">
    <section className="utility-shell">
      <img className="utility-logo" src="./images/logo_battlespirits.png" alt="Battle Spirits" />
      <span className="eyebrow">BATTLE SPIRITS UPDATER</span>
      <h1>Atualizações</h1>
      <p className="utility-subtitle">Versão instalada: <strong>{info.version}</strong></p>

      <div className="update-status-card">
        {status === "checking" && <><strong>Verificando atualizações...</strong><span>Buscando a versão mais recente.</span></>}
        {result?.code === "NOT_CONFIGURED" && <>
          <strong>Atualizações automáticas indisponíveis</strong>
          <span>Esta instalação não possui uma fonte de atualização configurada. Você ainda pode atualizar o jogo manualmente.</span>
        </>}
        {result?.ok && !result.available && <><strong>✓ Battle Spirits está atualizado</strong><span>Você já está usando a versão mais recente disponível.</span></>}
        {result?.ok && result.available && <>
          <strong>Nova versão disponível: {result.manifest.version}</strong>
          <span>{info.version} → {result.manifest.version}</span>
          {Array.isArray(result.manifest.notes) && result.manifest.notes.length > 0 && <ul className="update-notes">
            {result.manifest.notes.map((note, i) => <li key={`${note}-${i}`}>{note}</li>)}
          </ul>}
        </>}
        {status === "downloading" && <>
          <strong>Baixando atualização...</strong>
          <div className="progress-track"><div style={{ width: `${pct ?? 8}%` }} /></div>
          <span>{pct == null ? "Baixando..." : `${pct}%`}</span>
        </>}
        {status === "installing" && <><strong>Instalador iniciado</strong><span>O Battle Spirits será fechado para concluir a atualização.</span></>}
        {error && <><strong className="error-text">Falha ao atualizar</strong><span>{error}</span></>}
      </div>

      <div className="utility-actions">
        <button className="ghost" onClick={check} disabled={status === "checking" || status === "downloading"}>Verificar novamente</button>
        {result?.ok && result.available && <button className="primary-btn" onClick={install} disabled={status === "downloading"}>Baixar e instalar</button>}
      </div>

      <small className="utility-footnote">O instalador é verificado antes de ser iniciado.</small>
    </section>
  </main>;
}
