import { useEffect, useMemo, useState } from "react";
import { getProfile } from "../services/storage.js";
import { useLanguage } from "../i18n.jsx";
import { APP_VERSION_LABEL } from "../config/appVersion.js";
import HomeWallpaperSlideshow from "../components/home/HomeWallpaperSlideshow.jsx";
import ProjectInfoButtons from "../components/common/ProjectInfoButtons.jsx";
import "../styles/pages/mainMenuV340.css";

function playerName(profile, language) {
  const value = String(profile?.displayName || profile?.name || "").trim();
  if (value) return value;
  return language === "en" ? "Player" : "Jogador";
}

function initials(value) {
  const words = String(value || "Player").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "P";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function MainMenuItem({ label, detail, badge, onClick, disabled = false }) {
  return (
    <button
      type="button"
      className="bs-main-menu-item"
      onClick={onClick}
      disabled={disabled}
    >
      <span className="bs-main-menu-selector" aria-hidden="true" />
      <span className="bs-main-menu-label">{label}</span>
      {detail && <small>{detail}</small>}
      {badge && <em>{badge}</em>}
    </button>
  );
}

export default function Home({ go, initialSection = "root" }) {
  const { language } = useLanguage();
  const pt = language !== "en";
  const profile = useMemo(() => getProfile() || {}, []);
  const name = playerName(profile, language);
  const [section, setSection] = useState(initialSection || "root");

  useEffect(() => {
    setSection(initialSection || "root");
  }, [initialSection]);


  const rootMenu = (
    <>
      <MainMenuItem
        label={pt ? "Partida Local" : "Local Match"}
        detail={pt ? "Jogo Livre ou Eternal CPU" : "Free Play or Eternal CPU"}
        onClick={() => setSection("local")}
      />
      <MainMenuItem
        label={pt ? "Multiplayer Online" : "Online Multiplayer"}
        detail={pt ? "Normal ou Ranqueada" : "Normal or Ranked"}
        onClick={() => setSection("online")}
      />
      <MainMenuItem
        label={pt ? "Loja" : "Store"}
        detail={pt ? "Área em preparação" : "Area in preparation"}
        badge={pt ? "BETA" : "BETA"}
        onClick={() => go("store")}
      />
      <MainMenuItem
        label="Deck Builder"
        detail={pt ? "Criar e gerenciar decks" : "Create and manage decks"}
        onClick={() => go("decks")}
      />
      <MainMenuItem
        label={pt ? "Configurações" : "Settings"}
        detail={pt ? "Sistema, tema e idioma" : "System, theme and language"}
        onClick={() => go("settings")}
      />
    </>
  );

  const localMenu = (
    <>
      <MainMenuItem
        label={pt ? "Jogo Livre" : "Free Play"}
        detail={pt ? "Controle os dois lados da mesa" : "Control both sides of the table"}
        onClick={() => go("local")}
      />
      <MainMenuItem
        label="Eternal CPU"
        detail={pt ? "Jogue contra a IA em Fácil, Normal ou Difícil" : "Play the AI on Easy, Normal or Hard"}
        badge="AI"
        onClick={() => go("ai")}
      />
      <MainMenuItem
        label={pt ? "Voltar" : "Back"}
        onClick={() => setSection("root")}
      />
    </>
  );

  const onlineMenu = (
    <>
      <MainMenuItem
        label={pt ? "Partida Normal" : "Normal Match"}
        detail={pt ? "Matchmaking rápido, sala privada ou código" : "Quick match, private room or room code"}
        onClick={() => go("online")}
      />
      <MainMenuItem
        label={pt ? "Partida Ranqueada" : "Ranked Match"}
        detail={pt ? "Fundação da futura fila competitiva" : "Foundation for the competitive queue"}
        badge={pt ? "PRÉ-TEMPORADA" : "PRE-SEASON"}
        onClick={() => go("ranked")}
      />
      <MainMenuItem
        label={pt ? "Voltar" : "Back"}
        onClick={() => setSection("root")}
      />
    </>
  );

  const heading = section === "local"
    ? (pt ? "PARTIDA LOCAL" : "LOCAL MATCH")
    : section === "online"
      ? (pt ? "MULTIPLAYER ONLINE" : "ONLINE MULTIPLAYER")
      : "GATE OPEN";

  return (
    <main className="bs-main-menu">
      <HomeWallpaperSlideshow />
      <div className="bs-main-menu-gradient" aria-hidden="true" />
      <div className="bs-main-menu-grain" aria-hidden="true" />

      <header className="bs-main-menu-account">
        <button type="button" className="bs-account-chip" onClick={() => go("account")}>
          <span className="bs-account-avatar">
            {profile.avatar ? <img src={profile.avatar} alt="" /> : initials(name)}
          </span>
          <span className="bs-account-copy">
            <strong>{name}</strong>
            <small>{pt ? "Conta & Social Hub" : "Account & Social Hub"}</small>
          </span>
        </button>

        <div className="bs-main-menu-info">
          <ProjectInfoButtons />
        </div>
      </header>

      <section className="bs-main-menu-shell" aria-label={pt ? "Menu principal" : "Main menu"}>
        <div className="bs-main-menu-brand">
          <img src="./images/logo_battlespirits.png" alt="Battle Spirits" />

          <div className={`bs-main-menu-title ${section !== "root" ? "is-submenu" : ""}`}>
            <span>{heading}</span>
            {section === "root" ? <strong>KAIHOU!</strong> : <strong>SELECT</strong>}
          </div>
        </div>

        <nav className="bs-main-menu-nav" key={section}>
          {section === "local" ? localMenu : section === "online" ? onlineMenu : rootMenu}
        </nav>
      </section>

      <footer className="bs-main-menu-footer">
        <span>Battle Spirits © BANDAI.</span>
        <span className="bs-main-menu-footer-line" aria-hidden="true" />
        <strong>{pt ? "SIMULADOR NÃO OFICIAL" : "UNOFFICIAL SIMULATOR"} · {APP_VERSION_LABEL}</strong>
      </footer>
    </main>
  );
}
