import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "src/config/online.js",
  "public/config/online-config.js",
  "src/styles/base/v3.css",
  "src/styles/arena/simulatorPanels.css",
  "src/styles/arena/arenaVisuals.css",
  "src/styles/arena/effectDecision.css",
  "src/styles/arena/braveUltimate.css",
  "src/styles/arena/gameResult.css",
  "src/styles/arena/arenaLayoutV321.css",
  "src/game/legalActions.js",
  "src/game/aiEffectSemantics.js",
  "src/game/stateValidation.js",
  "src/game/snapshots.js",
  "src/online/publicProfile.js",
  "src/components/cards/CardDetailsModal.jsx",
  "src/components/home/HomeWallpaperSlideshow.jsx",
  "src/components/match/MatchSetupScreen.jsx",
  "src/components/layout/EternalCinematicBackdrop.jsx",
  "src/components/layout/PointerTiltSurface.jsx",
  "src/pages/Home.jsx",
  "src/pages/RankedLobby.jsx",
  "src/pages/Store.jsx",
  "src/styles/pages/mainMenuV340.css",
  "src/styles/pages/matchSetupV341.css",
  "src/styles/pages/modeScaffoldV340.css",
  "src/styles/pages/eternalInterfaceV350.css",
  "src/styles/pages/gameFlowV351.css",
  "src/styles/cards/cardDetailsTilt.css",
  "scripts/windows/CONFIGURAR-ONLINE.bat",
  "scripts/windows/INICIAR-ONLINE.bat",
  "scripts/windows/TESTAR-ONLINE.bat",
  "scripts/windows/MIGRAR-CONTEUDO-DO-V2.bat"
];
const missing = required.filter((item) => !fs.existsSync(path.join(root, item)));
if (missing.length) {
  console.error("Arquivos obrigatórios ausentes:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (pkg.version !== "3.5.2d") throw new Error(`package.json está em ${pkg.version}, esperado 3.5.2d`);

const cardTile = fs.readFileSync(path.join(root, "src", "components", "cards", "CardTile.jsx"), "utf8");
if (!cardTile.includes("card-image-pending")) throw new Error("CardTile não possui o placeholder de verso durante o carregamento.");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
if (!index.includes("./config/online-config.js")) throw new Error("index.html não carrega a configuração Online em runtime.");
if (!index.includes('rel="preload" as="image" href="./images/card-back.webp"')) throw new Error("index.html não faz preload do verso WebP usado como placeholder.");
const cardDetails = fs.readFileSync(path.join(root, "src", "components", "cards", "CardDetailsModal.jsx"), "utf8");
if (!cardDetails.includes("card-details-tilt-card") || !cardDetails.includes("handleCardPointerMove")) throw new Error("O efeito 3D/Perspectiva do modal de carta não pode ser removido.");
const unifiedUi = fs.readFileSync(path.join(root, "src", "styles", "pages", "eternalInterfaceV350.css"), "utf8");
if (!unifiedUi.includes("eternal-pointer-tilt") || !unifiedUi.includes("eternal-cinematic-backdrop")) throw new Error("A interface Eternal v3.5.2d está incompleta.");
const flowUi = fs.readFileSync(path.join(root, "src", "styles", "pages", "gameFlowV351.css"), "utf8");
if (!flowUi.includes("settings-game-window") || !flowUi.includes("eternal-menu-action")) throw new Error("A interface de fluxo v3.5.2d está incompleta.");

const deckBuilderPage = fs.readFileSync(path.join(root, "src", "pages", "DeckBuilder.jsx"), "utf8");
if (!deckBuilderPage.includes("const CARDS_PER_PAGE = 14")) throw new Error("Deck Builder deve exibir 14 cartas por página na v3.5.2d.");
if (!deckBuilderPage.includes("createPortal") || !deckBuilderPage.includes("CardDetailsModal")) throw new Error("Modal de detalhes deve usar portal centralizado na v3.5.2d.");

const decksPage = fs.readFileSync(path.join(root, "src", "pages", "Decks.jsx"), "utf8");
if (!decksPage.includes("createPortal") || !decksPage.includes("DEFAULT_DECKS_PER_PAGE = 8") || !decksPage.includes("COMPACT_DECKS_PER_PAGE = 4")) throw new Error("Biblioteca de decks/modal v3.5.2d incompletos.");
if (!flowUi.includes("v3.5.1a — DECK LIBRARY VISIBILITY HOTFIX") || !flowUi.includes("deck-library-v2-tilt")) throw new Error("Base visual da v3.5.1a ausente.");

const matchSetup = fs.readFileSync(path.join(root, "src", "components", "match", "MatchSetupScreen.jsx"), "utf8");
if (!matchSetup.includes("match-player-banner") || !matchSetup.includes("avatarSrc") || !matchSetup.includes("bannerSrc")) throw new Error("O refresh visual dos banners de jogador da v3.5.2d está ausente.");
if (!matchSetup.includes("rankTheme") || !matchSetup.includes("match-player-rank-crest") || !matchSetup.includes("match-player-detail-crest")) throw new Error("O polish de Rank dos banners da v3.5.2d está ausente.");
const matchSetupCss = fs.readFileSync(path.join(root, "src", "styles", "pages", "matchSetupV341.css"), "utf8");
if (!["rank-theme-bronze", "rank-theme-silver", "rank-theme-gold", "rank-theme-platinum", "rank-theme-diamond", "rank-theme-master"].every((token) => matchSetupCss.includes(token))) throw new Error("As molduras de Rank da v3.5.2d estão incompletas.");

const serverEnv = fs.readFileSync(path.join(root, "server", ".env.example"), "utf8");
if (!/HOST=0\.0\.0\.0/.test(serverEnv)) throw new Error("server/.env.example precisa usar HOST=0.0.0.0");
console.log(`Battle Spirits Eternal Simulator v${pkg.version}`);
console.log(`Estrutura v3 OK (${required.length} arquivos essenciais verificados).`);
