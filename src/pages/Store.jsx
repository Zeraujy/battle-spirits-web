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
        <span>STORE · BETA</span>
      </header>

      <section className="mode-scaffold-shell store-shell">
        <div className="mode-scaffold-copy">
          <span className="eyebrow">BATTLE SPIRITS ETERNAL</span>
          <h1>{pt ? "Loja" : "Store"}</h1>
          <p>
            {pt
              ? "A entrada da Loja já faz parte do novo menu. O conteúdo será desenvolvido separadamente para não misturar economia/coleção com as regras do simulador."
              : "The Store entry is now part of the new menu. Its content will be developed separately so collection/economy systems do not interfere with simulator rules."}
          </p>
        </div>

        <article className="store-coming-card">
          <span>COMING SOON</span>
          <strong>{pt ? "Área em desenvolvimento" : "Area in development"}</strong>
          <p>{pt ? "A estrutura está pronta para receber boosters, itens cosméticos ou outros recursos futuramente." : "The structure is ready for boosters, cosmetics or other future features."}</p>
        </article>
      </section>
    </main>
  );
}
