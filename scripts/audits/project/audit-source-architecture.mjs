import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "src/main.jsx",
  "src/app/App.jsx",
  "src/app/config/app-version.js",
  "src/app/config/online.js",
  "src/localization/i18n.jsx",
  "src/features/home/Home.jsx",
  "src/features/profile/Profile.jsx",
  "src/features/profile/Account.jsx",
  "src/features/settings/Settings.jsx",
  "src/features/settings/AdminPanel.jsx",
  "src/features/deck-builder/DeckBuilder.jsx",
  "src/features/deck-builder/Decks.jsx",
  "src/features/match-setup/LocalSetup.jsx",
  "src/features/match-setup/AiSetup.jsx",
  "src/features/online/OnlineLobby.jsx",
  "src/features/online/RankedLobby.jsx",
  "src/features/shop/Store.jsx",
  "src/features/arena/Simulator.jsx",
  "src/features/tutorial/Tutorial.jsx",
  "src/features/arena/components/ArenaShell.jsx",
  "src/features/online/components/QueueStatus.jsx",
  "src/features/match-setup/components/MatchSetupScreen.jsx",
  "src/features/shop/components/StarterOnboarding.jsx",
  "src/features/deck-builder/services/deckAnalytics.js",
  "src/features/settings/services/adminService.js",
  "src/services/cards/cardRepository.js",
  "src/services/cards/cardCatalogValidation.js",
  "src/services/economy/economyService.js",
  "src/services/platform/storage.js",
  "src/services/platform/supabase.js",
  "src/services/platform/theme.js",
  "src/services/player/socialService.js",
  "src/services/player/matchHistoryService.js",
  "src/services/player/rankedService.js",
  "src/services/tutorial/tutorialProgress.js"
];
const forbidden = [
  "src/App.jsx",
  "src/config/appVersion.js",
  "src/config/online.js",
  "src/i18n.jsx",
  "src/game/devTools.js",
  "src/pages",
  "src/components/game",
  "src/components/online",
  "src/components/match",
  "src/components/economy",
  "src/components/home",
  "src/services/deckAnalytics.js",
  "src/services/adminService.js",
  "src/services/cardCatalogValidation.js",
  "src/services/cardRepository.js",
  "src/services/economyService.js",
  "src/services/economyUtils.js",
  "src/services/cardMasteryService.js",
  "src/services/masteryRules.js",
  "src/services/matchHistoryService.js",
  "src/services/postMatchService.js",
  "src/services/rankedService.js",
  "src/services/socialInsights.js",
  "src/services/socialService.js",
  "src/services/storage.js",
  "src/services/supabase.js",
  "src/services/theme.js",
  "src/services/tutorialProgress.js"
];
const stalePatterns = [
  /["'](?:\.\.\/)+i18n\.jsx["']/,
  /["'](?:\.\.\/)+config\/appVersion\.js["']/,
  /["'](?:\.\.\/)+config\/online\.js["']/,
  /["'](?:\.\.\/)+pages\//,
  /components\/(?:game|online|match|economy|home)\//,
  /services\/(?:cardCatalogValidation|cardRepository|economyService|economyUtils|cardMasteryService|masteryRules|matchHistoryService|postMatchService|rankedService|socialInsights|socialService|storage|supabase|theme|tutorialProgress)\.js/
];

const failures = [];
for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) failures.push(`Missing required source path: ${relative}`);
}
for (const relative of forbidden) {
  if (fs.existsSync(path.join(root, relative))) failures.push(`Legacy source path still exists: ${relative}`);
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(absolute));
    else if (/\.(?:js|jsx|mjs)$/.test(entry.name)) out.push(absolute);
  }
  return out;
}

for (const file of walk(path.join(root, "src"))) {
  const text = fs.readFileSync(file, "utf8");
  for (const pattern of stalePatterns) {
    if (pattern.test(text)) failures.push(`Legacy import remains in ${path.relative(root, file)}`);
  }
}

if (failures.length) {
  console.error("SOURCE ARCHITECTURE AUDIT FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("SOURCE ARCHITECTURE AUDIT OK — application, feature, shared-component, domain-service, configuration and localization boundaries are normalized.");
