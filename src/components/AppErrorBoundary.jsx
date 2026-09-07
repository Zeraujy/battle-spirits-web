import React from "react";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Battle Spirits renderer error:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    const message = this.state.error?.message || String(this.state.error);

    return (
      <main className="fatal-error-page">
        <section className="fatal-error-card">
          <span className="eyebrow">BATTLE SPIRITS</span>
          <h1>O simulador encontrou um erro</h1>
          <p>
            A interface foi protegida para não ficar em uma tela vazia. Você pode
            voltar ao menu recarregando a janela.
          </p>
          <pre>{message}</pre>
          <div className="row-actions">
            <button
              type="button"
              className="primary-btn"
              onClick={() => window.location.reload()}
            >
              Recarregar simulador
            </button>
          </div>
        </section>
      </main>
    );
  }
}
