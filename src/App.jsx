import { lazy, Suspense, useEffect, useState } from "react";
import { getSettings } from "./services/storage.js";
import { applyDisplaySettings } from "./services/desktop.js";
import { applyTheme } from "./services/theme.js";

/*
 * Screens are loaded on demand. This keeps the initial Home bundle small and
 * avoids parsing the large Simulator / Deck Builder modules before they are
 * actually needed.
 */
const Home = lazy(() => import("./pages/Home.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const Account = lazy(() => import("./pages/Account.jsx"));
const DeckBuilder = lazy(() => import("./pages/DeckBuilder.jsx"));
const Decks = lazy(() => import("./pages/Decks.jsx"));
const Settings = lazy(() => import("./pages/Settings.jsx"));
const LocalSetup = lazy(() => import("./pages/LocalSetup.jsx"));
const AiSetup = lazy(() => import("./pages/AiSetup.jsx"));
const OnlineLobby = lazy(() => import("./pages/OnlineLobby.jsx"));
const RankedLobby = lazy(() => import("./pages/RankedLobby.jsx"));
const Store = lazy(() => import("./pages/Store.jsx"));
const Simulator = lazy(() => import("./pages/Simulator.jsx"));
const Updater = lazy(() => import("./pages/Updater.jsx"));
const ServerConsole = lazy(() => import("./pages/ServerConsole.jsx"));

function LoadingScreen() {
  return (
    <main className="route-loading" aria-live="polite">
      <div className="route-loading-mark" />
      <strong>Battle Spirits</strong>
      <span>Carregando…</span>
    </main>
  );
}

export default function App() {
  const mode = new URLSearchParams(window.location.search).get("mode") || "game";
  const [screen, setScreen] = useState({ name: "home" });

  useEffect(() => {
    if (mode !== "game") return;
    const settings = getSettings();
    applyTheme(settings.theme);
    applyDisplaySettings(settings).catch(() => {});
  }, [mode]);

  const go = (name, props = {}) => setScreen({ name, ...props });

  let content;
  if (mode === "updater") content = <Updater />;
  else if (mode === "server") content = <ServerConsole />;
  else if (screen.name === "profile") content = <Profile onBack={() => go("home")} initialUsername={screen.initialUsername || null} />;
  else if (screen.name === "account") content = <Account onBack={() => go("home")} onProfile={() => go("profile")} />;
  else if (screen.name === "settings") content = <Settings onBack={() => go("home")} />;
  else if (screen.name === "decks") content = <Decks
    onBack={() => screen.backTo ? go(screen.backTo) : go("home")}
    onNew={() => go("deck", { deckId: null, backTo: screen.backTo })}
    onEdit={(deckId) => go("deck", { deckId, backTo: screen.backTo })}
  />;
  else if (screen.name === "deck") content = <DeckBuilder deckId={screen.deckId} onBack={() => go("decks", { backTo: screen.backTo })} />;
  else if (screen.name === "local") content = <LocalSetup onBack={() => go("home", { menu: "local" })} onDeckBuilder={() => go("decks", { backTo: "local" })} onStart={(match) => go("simulator", { match, mode: "local" })} />;
  else if (screen.name === "ai") content = <AiSetup onBack={() => go("home", { menu: "local" })} onDeckBuilder={() => go("decks", { backTo: "ai" })} onStart={(match) => go("simulator", { match, mode: "ai", viewerPlayerId: "player1" })} />;
  else if (screen.name === "online") content = <OnlineLobby onBack={() => go("home", { menu: "online" })} onDeckBuilder={() => go("decks", { backTo: "online" })} onMatch={(payload) => go("simulator", { ...payload, mode: "online" })} />;
  else if (screen.name === "ranked") content = <RankedLobby onBack={() => go("home", { menu: "online" })} onAccount={() => go("account")} onDeckBuilder={() => go("decks", { backTo: "ranked" })} onMatch={(payload) => go("simulator", { ...payload, mode: "ranked" })} />;
  else if (screen.name === "store") content = <Store onBack={() => go("home")} />;
  else if (screen.name === "simulator") content = <Simulator
    {...screen}
    onExit={() => go("home")}
    onPlayAgain={() => {
      if (screen.mode === "ranked") go("ranked");
      else if (screen.mode === "online") go("online");
      else if (screen.mode === "ai") go("ai");
      else go("local");
    }}
    onOpenProfile={(username) => go("profile", { initialUsername: username })}
  />;
  else content = <Home go={go} initialSection={screen.menu || "root"} />;

  return <Suspense fallback={<LoadingScreen />}>{content}</Suspense>;
}
