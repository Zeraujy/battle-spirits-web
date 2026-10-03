import { lazy, Suspense, useEffect, useState } from "react";
import { getSettings } from "../services/platform/storage.js";
import { applyTheme } from "../services/platform/theme.js";

/*
 * Screens are loaded on demand. This keeps the initial Home bundle small and
 * avoids parsing the large Simulator / Deck Builder modules before they are
 * actually needed.
 */
const Home = lazy(() => import("../features/home/Home.jsx"));
const Profile = lazy(() => import("../features/profile/Profile.jsx"));
const Account = lazy(() => import("../features/profile/Account.jsx"));
const DeckBuilder = lazy(() => import("../features/deck-builder/DeckBuilder.jsx"));
const Decks = lazy(() => import("../features/deck-builder/Decks.jsx"));
const Settings = lazy(() => import("../features/settings/Settings.jsx"));
const AdminPanel = lazy(() => import("../features/settings/AdminPanel.jsx"));
const LocalSetup = lazy(() => import("../features/match-setup/LocalSetup.jsx"));
const AiSetup = lazy(() => import("../features/match-setup/AiSetup.jsx"));
const OnlineLobby = lazy(() => import("../features/online/OnlineLobby.jsx"));
const RankedLobby = lazy(() => import("../features/online/RankedLobby.jsx"));
const Store = lazy(() => import("../features/shop/Store.jsx"));
const Simulator = lazy(() => import("../features/arena/Simulator.jsx"));
const Tutorial = lazy(() => import("../features/tutorial/Tutorial.jsx"));
const StarterOnboarding = lazy(() => import("../features/shop/components/StarterOnboarding.jsx"));

function LoadingScreen() {
  return (
    <main className="route-loading" aria-live="polite">
      <div className="route-loading-mark" />
      <strong>Battle Spirits: KAIHOU! Simulator</strong>
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
  }, [mode]);

  useEffect(() => {
    // v4.5.0 — best-effort media protection for the public client.
    // This removes the browser's convenient save/context-menu paths, but it is
    // intentionally not presented as DRM: assets delivered to a browser can
    // still be inspected by a determined user through developer/network tools.
    const blockContextMenu = (event) => event.preventDefault();
    const blockMediaDrag = (event) => {
      const target = event.target;
      if (target?.closest?.("img, video, canvas, picture, svg, [data-protected-media]")) {
        event.preventDefault();
      }
    };

    document.addEventListener("contextmenu", blockContextMenu, { capture: true });
    document.addEventListener("dragstart", blockMediaDrag, { capture: true });

    return () => {
      document.removeEventListener("contextmenu", blockContextMenu, { capture: true });
      document.removeEventListener("dragstart", blockMediaDrag, { capture: true });
    };
  }, []);

  const go = (name, props = {}) => setScreen({ name, ...props });

  let content;
  if (screen.name === "profile") content = <Profile onBack={() => go("home")} initialUsername={screen.initialUsername || null} />;
  else if (screen.name === "account") content = <Account onBack={() => go("home")} onProfile={() => go("profile")} />;
  else if (screen.name === "settings") content = <Settings onBack={() => go("home")} onAdmin={() => go("admin")} />;
  else if (screen.name === "admin") content = <AdminPanel onBack={() => go("settings")} />;
  else if (screen.name === "tutorial") content = <Tutorial onBack={() => go("home")} onPlayCpu={() => go("ai")} onDeckBuilder={() => go("decks", { backTo: "tutorial" })} />;
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

  const routeKey = screen.name;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <div className="app-route-shell" key={routeKey}>{content}</div>
      <StarterOnboarding />
    </Suspense>
  );
}
