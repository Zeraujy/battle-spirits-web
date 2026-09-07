import { useEffect, useState } from "react";
import Home from "./pages/Home.jsx";
import Profile from "./pages/Profile.jsx";
import Account from "./pages/Account.jsx";
import DeckBuilder from "./pages/DeckBuilder.jsx";
import Decks from "./pages/Decks.jsx";
import Settings from "./pages/Settings.jsx";
import LocalSetup from "./pages/LocalSetup.jsx";
import OnlineLobby from "./pages/OnlineLobby.jsx";
import Simulator from "./pages/Simulator.jsx";
import Updater from "./pages/Updater.jsx";
import ServerConsole from "./pages/ServerConsole.jsx";
import { getSettings } from "./services/storage.js";
import { applyDisplaySettings } from "./services/desktop.js";
import { applyTheme } from "./services/theme.js";

export default function App() {
  const mode = new URLSearchParams(window.location.search).get("mode") || "game";
  const [screen, setScreen] = useState({ name: "home" });

  useEffect(() => {
    if (mode === "game") { const settings = getSettings(); applyTheme(settings.theme); applyDisplaySettings(settings).catch(()=>{}); }
  }, [mode]);

  if (mode === "updater") return <Updater />;
  if (mode === "server") return <ServerConsole />;

  const go = (name, props = {}) => setScreen({ name, ...props });

  if (screen.name === "profile") return <Profile onBack={() => go("home")} />;
  if (screen.name === "account") return <Account onBack={() => go("home")} onProfile={() => go("profile")} />;
  if (screen.name === "settings") return <Settings onBack={() => go("home")} />;
  if (screen.name === "decks") return <Decks onBack={() => go("home")} onNew={() => go("deck", { deckId:null })} onEdit={(deckId)=>go("deck", { deckId })} />;
  if (screen.name === "deck") return <DeckBuilder deckId={screen.deckId} onBack={() => go("decks")} />;
  if (screen.name === "local") return <LocalSetup onBack={() => go("home")} onStart={(match) => go("simulator", { match, mode: "local" })} />;
  if (screen.name === "online") return <OnlineLobby onBack={() => go("home")} onMatch={(payload) => go("simulator", { ...payload, mode: "online" })} />;
  if (screen.name === "simulator") return <Simulator {...screen} onExit={() => go("home")} />;
  return <Home go={go} />;
}
