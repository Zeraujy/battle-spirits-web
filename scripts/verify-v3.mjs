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
  "src/styles/arena/postMatchV380.css",
  "src/styles/arena/arenaLayoutV321.css",
  "src/game/legalActions.js",
  "src/game/aiEffectSemantics.js",
  "src/game/stateValidation.js",
  "src/game/snapshots.js",
  "src/online/publicProfile.js",
  "src/services/socialService.js",
  "src/services/socialInsights.js",
  "src/services/matchHistoryService.js",
  "src/services/postMatchService.js",
  "src/pages/Profile.jsx",
  "src/styles/pages/socialHubV360.css",
  "supabase/SOCIAL-HUB-3.6.sql",
  "supabase/SOCIAL-HUB-3.6.2.sql",
  "supabase/SOCIAL-HUB-3.7.0.sql",
  "supabase/SOCIAL-HUB-3.7.1.sql",
  "src/services/rankedService.js",
  "src/styles/pages/rankedV370.css",
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
if (pkg.version !== "3.8.0") throw new Error(`package.json está em ${pkg.version}, esperado 3.8.0`);

const cardTile = fs.readFileSync(path.join(root, "src", "components", "cards", "CardTile.jsx"), "utf8");
if (!cardTile.includes("card-image-pending")) throw new Error("CardTile não possui o placeholder de verso durante o carregamento.");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
if (!index.includes("./config/online-config.js")) throw new Error("index.html não carrega a configuração Online em runtime.");
if (!index.includes('rel="preload" as="image" href="./images/card-back.webp"')) throw new Error("index.html não faz preload do verso WebP usado como placeholder.");
const cardDetails = fs.readFileSync(path.join(root, "src", "components", "cards", "CardDetailsModal.jsx"), "utf8");
if (!cardDetails.includes("card-details-tilt-card") || !cardDetails.includes("handleCardPointerMove")) throw new Error("O efeito 3D/Perspectiva do modal de carta não pode ser removido.");
const unifiedUi = fs.readFileSync(path.join(root, "src", "styles", "pages", "eternalInterfaceV350.css"), "utf8");
if (!unifiedUi.includes("eternal-pointer-tilt") || !unifiedUi.includes("eternal-cinematic-backdrop")) throw new Error("A interface Eternal v3.6.0 está incompleta.");
const flowUi = fs.readFileSync(path.join(root, "src", "styles", "pages", "gameFlowV351.css"), "utf8");
if (!flowUi.includes("settings-game-window") || !flowUi.includes("eternal-menu-action")) throw new Error("A interface de fluxo v3.6.0 está incompleta.");

const deckBuilderPage = fs.readFileSync(path.join(root, "src", "pages", "DeckBuilder.jsx"), "utf8");
if (!deckBuilderPage.includes("const CARDS_PER_PAGE = 14")) throw new Error("Deck Builder deve exibir 14 cartas por página na v3.6.0.");
if (!deckBuilderPage.includes("createPortal") || !deckBuilderPage.includes("CardDetailsModal")) throw new Error("Modal de detalhes deve usar portal centralizado na v3.6.0.");

const decksPage = fs.readFileSync(path.join(root, "src", "pages", "Decks.jsx"), "utf8");
if (!decksPage.includes("createPortal") || !decksPage.includes("DEFAULT_DECKS_PER_PAGE = 8") || !decksPage.includes("COMPACT_DECKS_PER_PAGE = 4")) throw new Error("Biblioteca de decks/modal v3.6.0 incompletos.");
if (!flowUi.includes("v3.5.1a — DECK LIBRARY VISIBILITY HOTFIX") || !flowUi.includes("deck-library-v2-tilt")) throw new Error("Base visual da v3.5.1a ausente.");

const matchSetup = fs.readFileSync(path.join(root, "src", "components", "match", "MatchSetupScreen.jsx"), "utf8");
if (!matchSetup.includes("match-player-banner") || !matchSetup.includes("avatarSrc") || !matchSetup.includes("bannerSrc")) throw new Error("O refresh visual dos banners de jogador da v3.6.0 está ausente.");
if (!matchSetup.includes("rankTheme") || !matchSetup.includes("match-player-rank-crest") || !matchSetup.includes("match-player-detail-crest")) throw new Error("O polish de Rank dos banners da v3.6.0 está ausente.");
const matchSetupCss = fs.readFileSync(path.join(root, "src", "styles", "pages", "matchSetupV341.css"), "utf8");
if (!["rank-theme-bronze", "rank-theme-silver", "rank-theme-gold", "rank-theme-platinum", "rank-theme-diamond", "rank-theme-master"].every((token) => matchSetupCss.includes(token))) throw new Error("As molduras de Rank da v3.6.0 estão incompletas.");


const socialPage = fs.readFileSync(path.join(root, "src", "pages", "Profile.jsx"), "utf8");
if (!socialPage.includes("SOCIAL HUB") || !socialPage.includes("social-friend-dock") || !socialPage.includes("CARD MASTERY")) throw new Error("O Social Hub v3.6.0 está incompleto.");
const socialService = fs.readFileSync(path.join(root, "src", "services", "socialService.js"), "utf8");
if (!socialService.includes("bs_send_friend_request") || !socialService.includes("subscribeSocialEvents") || !socialService.includes("savePrivacySettings")) throw new Error("A camada social v3.6.0 está incompleta.");
const socialSql = fs.readFileSync(path.join(root, "supabase", "SOCIAL-HUB-3.6.sql"), "utf8");
const socialPolishSql = fs.readFileSync(path.join(root, "supabase", "SOCIAL-HUB-3.6.1.sql"), "utf8");
if (!socialSql.includes("status = 'pending'") || !socialSql.includes("bs_notifications") || !socialSql.includes("profile_visibility")) throw new Error("A migração Social Hub base está incompleta.");
if (!socialPolishSql.includes("bs_social_preferences") || !socialPolishSql.includes("custom_status") || !socialPolishSql.includes("bs_set_friend_preference")) throw new Error("A migração Social Hub v3.6.1 está incompleta.");
if (!socialPage.includes("typingFriend") || !socialPage.includes("is_favorite") || !socialService.includes("subscribeConversationTyping")) throw new Error("O polish social v3.6.1 está incompleto.");
const matchHistoryService = fs.readFileSync(path.join(root, "src", "services", "matchHistoryService.js"), "utf8");
const matchHistorySql = fs.readFileSync(path.join(root, "supabase", "SOCIAL-HUB-3.6.2.sql"), "utf8");
if (!matchHistoryService.includes("recordMatchResult") || !matchHistoryService.includes("summarizeMatchHistory")) throw new Error("A camada de histórico v3.6.2 está incompleta.");
if (!matchHistorySql.includes("bs_match_history") || !matchHistorySql.includes("match history owner read")) throw new Error("A migração de histórico v3.6.2 está incompleta.");
if (!socialPage.includes('section === "statistics"') || !socialPage.includes("social-match-history-list")) throw new Error("A interface de estatísticas v3.6.2 está incompleta.");

const rankedLobby = fs.readFileSync(path.join(root, "src", "pages", "RankedLobby.jsx"), "utf8");
const rankedService = fs.readFileSync(path.join(root, "src", "services", "rankedService.js"), "utf8");
const rankedSql = fs.readFileSync(path.join(root, "supabase", "SOCIAL-HUB-3.7.0.sql"), "utf8");
const rankedIdentitySql = fs.readFileSync(path.join(root, "supabase", "SOCIAL-HUB-3.7.1.sql"), "utf8");
const onlineServer = fs.readFileSync(path.join(root, "server", "index.mjs"), "utf8");
if (!rankedLobby.includes("ranked:join") || !rankedLobby.includes("SEASON 0")) throw new Error("A interface Ranked v3.7.0 está incompleta.");
if (!rankedService.includes("loadRankedProfile") || !rankedService.includes("rankFromRp")) throw new Error("O serviço Ranked v3.7.0 está incompleto.");
if (!rankedSql.includes("bs_ranked_profiles") || !rankedSql.includes("bs_ranked_matches")) throw new Error("A migração Ranked v3.7.0 está incompleta.");
if (!onlineServer.includes("rankedIdentity") || !onlineServer.includes("settleRankedRoom") || !onlineServer.includes("SUPABASE_SERVICE_ROLE_KEY")) throw new Error("A validação server-side Ranked v3.7.0 está incompleta.");
if (!socialPage.includes('section === "competitive"') || !socialPage.includes("social-competitive-hero")) throw new Error("A identidade competitiva v3.7.1 está incompleta.");
if (!rankedService.includes("loadPublicRankedIdentity") || !rankedService.includes("loadFriendRankedIdentities")) throw new Error("O serviço de identidade Ranked v3.7.1 está incompleto.");
if (!rankedIdentitySql.includes("bs_get_ranked_identity") || !rankedIdentitySql.includes("deck_name")) throw new Error("A migração Ranked v3.7.1 está incompleta.");
const simulatorPage = fs.readFileSync(path.join(root, "src", "pages", "Simulator.jsx"), "utf8");
const postMatchService = fs.readFileSync(path.join(root, "src", "services", "postMatchService.js"), "utf8");
const postMatchCss = fs.readFileSync(path.join(root, "src", "styles", "arena", "postMatchV380.css"), "utf8");
if (!simulatorPage.includes("post-match-v380-grid") || !simulatorPage.includes("room:rematch") || !simulatorPage.includes("requestPostMatchFriend")) throw new Error("A Post-Match Screen v3.8.0 está incompleta.");
if (!postMatchService.includes("buildPostMatchSummary") || !postMatchService.includes("masteryXpForMatch")) throw new Error("O resumo pós-partida v3.8.0 está incompleto.");
if (!postMatchCss.includes("post-match-v380-progression") || !onlineServer.includes("room:rematch")) throw new Error("A integração de revanche v3.8.0 está incompleta.");

const publicProfile = fs.readFileSync(path.join(root, "src", "online", "publicProfile.js"), "utf8");
const socketClient = fs.readFileSync(path.join(root, "src", "online", "socketClient.js"), "utf8");
if (publicProfile.includes("socialService") || socketClient.includes("socialService")) throw new Error("O Social Hub não pode ser acoplado ao transporte das partidas Online.");
if (!publicProfile.includes("ONLINE_PROFILE_MAX_JSON_CHARS") || !publicProfile.includes("createOnlinePublicProfile")) throw new Error("A proteção do perfil mínimo do Online foi alterada.");

const serverEnv = fs.readFileSync(path.join(root, "server", ".env.example"), "utf8");
if (!/HOST=0\.0\.0\.0/.test(serverEnv)) throw new Error("server/.env.example precisa usar HOST=0.0.0.0");
console.log(`Battle Spirits Eternal Simulator v${pkg.version}`);
console.log(`Estrutura v3 OK (${required.length} arquivos essenciais verificados).`);
