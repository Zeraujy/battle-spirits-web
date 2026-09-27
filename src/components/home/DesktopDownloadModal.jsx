import { useEffect, useMemo, useState } from "react";

function platformGuess() {
  const ua = String(navigator.userAgent || "").toLowerCase();
  if (ua.includes("windows")) return "windows";
  if (ua.includes("macintosh") || ua.includes("mac os")) return "mac";
  if (ua.includes("linux")) return "linux";
  return "other";
}

function DownloadButton({ href, children, primary = false }) {
  if (!href) return null;
  return <a className={primary ? "desktop-download-primary" : "desktop-download-link"} href={href}>{children}</a>;
}

export default function DesktopDownloadModal({ open, onClose, pt = true }) {
  const [config, setConfig] = useState(null);
  const platform = useMemo(platformGuess, []);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetch("/config/desktop-releases.json", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((value) => { if (alive) setConfig(value); })
      .catch(() => { if (alive) setConfig(null); });
    return () => { alive = false; };
  }, [open]);

  if (!open) return null;
  const a = config?.assets || {};

  return <div className="desktop-download-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="desktop-download-modal" role="dialog" aria-modal="true" aria-label="Desktop" onMouseDown={(e) => e.stopPropagation()}>
      <button type="button" className="desktop-download-close" onClick={onClose} aria-label={pt ? "Fechar" : "Close"}>×</button>
      <span className="eyebrow">BATTLE SPIRITS DESKTOP</span>
      <h2>{pt ? "Jogue também no desktop" : "Play on desktop too"}</h2>
      <p>{pt ? "A mesma conta, coleção, decks e progresso da versão web." : "The same account, collection, decks and progress as the web version."}</p>

      {!config?.enabled && <div className="desktop-download-unavailable">{pt ? "Os downloads serão liberados assim que a primeira versão desktop for publicada." : "Downloads will be enabled when the first desktop release is published."}</div>}

      {config?.enabled && <div className="desktop-download-grid">
        <article className={platform === "windows" ? "is-recommended" : ""}>
          <strong>Windows</strong><small>Windows 10/11 · x64</small>
          <DownloadButton href={a.windows} primary={platform === "windows"}>{pt ? "Baixar instalador" : "Download installer"}</DownloadButton>
        </article>
        <article className={platform === "mac" ? "is-recommended" : ""}>
          <strong>macOS</strong><small>{pt ? "Apple Silicon ou Intel" : "Apple Silicon or Intel"}</small>
          <DownloadButton href={a.macArm64} primary={platform === "mac"}>Apple Silicon</DownloadButton>
          <DownloadButton href={a.macX64}>Intel</DownloadButton>
        </article>
        <article className={platform === "linux" ? "is-recommended" : ""}>
          <strong>Linux</strong><small>Linux · x64</small>
          <DownloadButton href={a.linuxX64AppImage} primary={platform === "linux"}>AppImage</DownloadButton>
          <DownloadButton href={a.linuxX64Deb}>.deb</DownloadButton>
        </article>
      </div>}
      {config?.releasePage && <a className="desktop-download-all" href={config.releasePage}>{pt ? "Ver todas as versões" : "View all releases"}</a>}
    </section>
  </div>;
}
