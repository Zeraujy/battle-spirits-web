import { CATALOG_CARD_COUNT } from "../data/catalogManifest.js";
import { getDecks, getProfile } from "../services/storage.js";
import { useLanguage } from "../i18n.jsx";
import HomeWallpaperSlideshow from "../components/home/HomeWallpaperSlideshow.jsx";
import ProjectInfoButtons from "../components/common/ProjectInfoButtons.jsx";

function playerName(profile, language) {
  const value = String(profile?.name || "").trim();
  if (value) return value;
  return language === "en" ? "Player" : "Jogador";
}

function MenuIcon({ name }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  };

  if (name === "users") {
    return (
      <svg {...common}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }

  if (name === "cpu") {
    return (
      <svg {...common}>
        <rect x="4" y="6" width="16" height="12" rx="3" />
        <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 10h3M3 14h3M18 10h3M18 14h3" />
        <path d="M9 10h6v4H9z" />
      </svg>
    );
  }

  if (name === "globe") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a14 14 0 0 1 0 18" />
        <path d="M12 3a14 14 0 0 0 0 18" />
      </svg>
    );
  }

  if (name === "deck") {
    return (
      <svg {...common}>
        <rect x="5" y="3" width="13" height="17" rx="2" />
        <path d="M8 7h7M8 11h7M8 15h5" />
      </svg>
    );
  }

  if (name === "profile") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
      </svg>
    );
  }

  if (name === "account") {
    return (
      <svg {...common}>
        <path d="m12 3 8 9-8 9-8-9 8-9Z" />
      </svg>
    );
  }

  if (name === "settings") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.07A1.7 1.7 0 0 0 8.97 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15.03 1.7 1.7 0 0 0 3.07 14H3v-4h.07A1.7 1.7 0 0 0 4.6 8.97a1.7 1.7 0 0 0-.34-1.88L4.2 7.03 7.03 4.2l.06.06A1.7 1.7 0 0 0 8.97 4.6 1.7 1.7 0 0 0 10 3.07V3h4v.07a1.7 1.7 0 0 0 1.03 1.53 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.93 10H21v4h-.07A1.7 1.7 0 0 0 19.4 15Z" />
      </svg>
    );
  }

  return null;
}

export default function Home({ go }) {
  const { t, language } = useLanguage();
  const decks = getDecks();
  const profile = getProfile();
  const pt = language !== "en";
  const name = playerName(profile, language);

  return (
    <main className="home-page v3-home">
      <HomeWallpaperSlideshow />
      <div className="v3-home-overlay" />

      <header className="v3-home-topbar">
        <div className="v3-brand-mini">
          <span className="v3-live-dot" />
          <span>ETERNAL SIMULATOR</span>
          <b>V3.3.1a</b>
        </div>

        <button
          type="button"
          className="v3-player-chip"
          title={pt ? "Abrir perfil" : "Open profile"}
          onClick={() => go("profile")}
        >
          <span>{name.slice(0, 1).toUpperCase()}</span>
          <strong>{name}</strong>
        </button>
      </header>

      <section className="v3-home-content">
        <div className="v3-home-hero">
          <img
            className="game-logo v3-game-logo"
            src="./images/logo_battlespirits.png"
            alt="Battle Spirits"
          />

          <div className="v3-home-subtitle">
            <span />
            <b>{t("fanSimulator")}</b>
            <span />
          </div>

          <h1>{t("gateOpen")}</h1>

          <p className="v3-home-description">
            {pt
              ? "Monte seu deck, teste estratégias e jogue Battle Spirits de forma rápida e intuitiva."
              : "Build your deck, test strategies and play Battle Spirits quickly and intuitively."}
          </p>
        </div>

        <div className="v3-primary-actions">
          <button
            type="button"
            className="v3-play-card"
            onClick={() => go("local")}
          >
            <span className="v3-action-icon">
              <MenuIcon name="users" />
            </span>

            <span className="v3-action-copy">
              <small>{pt ? "TREINO / 2 JOGADORES" : "TRAINING / 2 PLAYERS"}</small>
              <b>{pt ? "Partida local" : "Local match"}</b>
              <em>{pt ? "Jogue no mesmo computador" : "Play on the same computer"}</em>
            </span>

            <span className="v3-action-arrow">→</span>
          </button>

          <button
            type="button"
            className="v3-play-card"
            onClick={() => go("ai")}
          >
            <span className="v3-action-icon">
              <MenuIcon name="cpu" />
            </span>

            <span className="v3-action-copy">
              <small>{pt ? "SOLO / ETERNAL CPU • ARCHETYPE AI" : "SOLO / ETERNAL CPU • ARCHETYPE AI"}</small>
              <b>{pt ? "Jogar contra IA" : "Play vs AI"}</b>
              <em>{pt ? "Fácil, normal e difícil" : "Easy, normal and hard"}</em>
            </span>

            <span className="v3-action-arrow">→</span>
          </button>

          <button
            type="button"
            className="v3-play-card"
            onClick={() => go("online")}
          >
            <span className="v3-action-icon">
              <MenuIcon name="globe" />
            </span>

            <span className="v3-action-copy">
              <small>ONLINE 1V1</small>
              <b>{pt ? "Jogar online" : "Play online"}</b>
              <em>{pt ? "Sala privada ou partida rápida" : "Private room or quick match"}</em>
            </span>

            <span className="v3-action-arrow">→</span>
          </button>
        </div>

        <div className="v3-home-lower">
          <section className="v3-lower-card v3-stats-panel">
            <div className="v3-section-title">
              <span className="v3-title-glyph">▥</span>
              <strong>{pt ? "Estatísticas" : "Statistics"}</strong>
              <span className="v3-section-line" />
            </div>

            <div className="v3-stat-grid">
              <div className="v3-stat-card">
                <strong>{CATALOG_CARD_COUNT}</strong>
                <span>{pt ? "Cartas" : "Cards"}</span>
              </div>

              <div className="v3-stat-card">
                <strong>{decks.length}</strong>
                <span>Decks</span>
              </div>

              <div className="v3-stat-card">
                <strong>3.3.1a</strong>
                <span>Versão</span>
              </div>
            </div>
          </section>

          <section className="v3-lower-card v3-options-panel">
            <div className="v3-section-title">
              <span className="v3-title-glyph">⊞</span>
              <strong>{pt ? "Mais opções" : "More options"}</strong>
              <span className="v3-section-line" />
            </div>

            <div className="v3-secondary-menu">
              <button type="button" onClick={() => go("decks")}>
                <span className="v3-secondary-icon"><MenuIcon name="deck" /></span>
                <span className="v3-secondary-copy">
                  <b>{t("decks")}</b>
                  <small>{pt ? "Criar e organizar" : "Create and organize"}</small>
                </span>
                <i>›</i>
              </button>

              <button type="button" onClick={() => go("profile")}>
                <span className="v3-secondary-icon"><MenuIcon name="profile" /></span>
                <span className="v3-secondary-copy">
                  <b>{t("profile")}</b>
                  <small>{pt ? "Identidade do jogador" : "Player identity"}</small>
                </span>
                <i>›</i>
              </button>

              <button type="button" onClick={() => go("account")}>
                <span className="v3-secondary-icon"><MenuIcon name="account" /></span>
                <span className="v3-secondary-copy">
                  <b>{t("account")}</b>
                  <small>{pt ? "Conta e sincronização" : "Account and sync"}</small>
                </span>
                <i>›</i>
              </button>

              <button type="button" onClick={() => go("settings")}>
                <span className="v3-secondary-icon"><MenuIcon name="settings" /></span>
                <span className="v3-secondary-copy">
                  <b>{t("settings")}</b>
                  <small>{pt ? "Tema e sistema" : "Theme and system"}</small>
                </span>
                <i>›</i>
              </button>
            </div>

            <div className="v3-project-links">
              <ProjectInfoButtons />
            </div>
          </section>
        </div>
      </section>

      <footer className="v3-home-footer">
        <span>Battle Spirits © BANDAI.</span>

        <div className="v3-home-footer-center">
          <span className="v3-footer-line" />
          <b>ETERNAL SIMULATOR</b>
          <small>V3.3.1a</small>
          <span className="v3-footer-line" />
        </div>

        <span>
          {pt
            ? "Projeto de fã não oficial e sem fins lucrativos."
            : "Unofficial non-profit fan project."}
        </span>
      </footer>
    </main>
  );
}
