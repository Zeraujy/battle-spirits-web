import EternalCinematicBackdrop from "../components/layout/EternalCinematicBackdrop.jsx";
import { useLanguage } from "../i18n.jsx";
import "../styles/pages/modeScaffoldV340.css";
import "../styles/pages/eternalInterfaceV350.css";

export default function Store({ onBack }) {
  const { language } = useLanguage();
  const pt = language !== "en";

  return (
    <main className="mode-scaffold-page store-scaffold eternal-page eternal-store-page">
      <EternalCinematicBackdrop />
      <header className="mode-scaffold-header">
        <button type="button" className="ghost eternal-menu-action" onClick={onBack}>{pt ? "Voltar" : "Back"}</button>
        <span>{pt ? "LOJA · EM BREVE" : "STORE · COMING SOON"}</span>
      </header>

      <section className="mode-scaffold-shell store-shell">
        <div className="mode-scaffold-copy">
          <span className="eyebrow">BATTLE SPIRITS ETERNAL</span>
          <h1>{pt ? "Loja" : "Store"}</h1>
          <p>
            {pt
              ? "A Loja será o espaço para futuros conteúdos de coleção e personalização."
              : "The Store will be the home for future collection and customization content."}
          </p>
        </div>

        <article className="store-coming-card">
          <span>COMING SOON</span>
          <strong>{pt ? "Novidades a caminho" : "More to come"}</strong>
          <p>{pt ? "Boosters, itens cosméticos e outros conteúdos poderão aparecer aqui futuramente." : "Boosters, cosmetics and other content may appear here in future updates."}</p>
        </article>
      </section>
    </main>
  );
}
