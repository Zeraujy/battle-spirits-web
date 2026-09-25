/**
 * Structural verification for the stable v3 line.
 *
 * This script intentionally checks project organization in addition to card
 * data.  It catches accidental folder moves/import migrations before they turn
 * into harder-to-debug runtime errors.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeCard, makeCardIndex } from "../src/game/cardAdapter.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = false;

const requiredPaths = [
  "src/components/cards",
  "src/components/common",
  "src/components/game",
  "src/components/game/ArenaCardStatus.jsx",
  "src/components/game/ArenaBraveAttachment.jsx",
  "src/components/game/ArenaBattleRole.jsx",
  "src/components/game/PaymentStatus.jsx",
  "src/components/game/BattleLinkOverlay.jsx",
  "src/components/home",
  "src/components/match/MatchSetupScreen.jsx",
  "src/components/layout/EternalCinematicBackdrop.jsx",
  "src/components/layout/PointerTiltSurface.jsx",
  "src/data",
  "src/game",
  "src/interactions/cardPointerDrag.js",
  "src/interactions/coreClickPolicy.js",
  "src/game/burstRules.js",
  "src/game/databaseEffectCoverage.test.js",
  "src/game/legalActions.js",
  "src/game/ai.js",
  "src/game/aiEffectSemantics.js",
  "src/game/aiArchetypes.js",
  "src/game/ai.test.js",
  "src/online/publicProfile.js",
  "src/online/publicProfile.test.js",
  "src/online/socialInsights.test.js",
  "src/services/socialService.js",
  "src/services/socialInsights.js",
  "src/pages/Profile.jsx",
  "src/styles/pages/socialHubV360.css",
  "supabase/SOCIAL-HUB-3.6.sql",
  "src/pages/AiSetup.jsx",
  "src/pages/Home.jsx",
  "src/pages/RankedLobby.jsx",
  "src/pages/Store.jsx",
  "src/config/appVersion.js",
  "src/styles/pages/mainMenuV340.css",
  "src/styles/pages/matchSetupV341.css",
  "src/styles/pages/modeScaffoldV340.css",
  "src/styles/pages/eternalInterfaceV350.css",
  "src/styles/pages/gameFlowV351.css",
  "src/styles/pages/aiSetup.css",
  "src/game/stateValidation.js",
  "src/game/actionLog.js",
  "src/game/snapshots.js",
  "src/game/random.js",
  "src/game/devTools.js",
  "src/game/readiness.test.js",
  "src/styles/arena",
  "src/styles/arena/cardPresentationV317.css",
  "src/styles/arena/battleEmphasisV317.css",
  "src/styles/arena/coreCombatV318.css",
  "src/styles/arena/cardInteractionV319.css",
  "src/styles/arena/rulesEffectsV320.css",
  "src/styles/arena/arenaLayoutV321.css",
  "src/styles/arena/aiDebuggerV331.css",
  "src/styles/base",
  "src/styles/cards",
  "src/styles/deckbuilder",
  "src/styles/pages",
  "src/styles/theme",
  "public/cards-database",
  "public/images/ui/arena/levels",
  "public/images/arena/wallpaper_arena_default.png",
  "docs/changelog",
  "scripts/windows"
];

console.log("Battle Spirits Simulator v3.6.1 — verificação estrutural\n");
for (const relative of requiredPaths) {
  const exists = fs.existsSync(path.join(root, relative));
  console.log(`${exists ? "OK " : "-- "} ${relative}`);
  if (!exists) failed = true;
}

const dataDir = path.join(root, "src", "data");
const jsonFiles = fs.existsSync(dataDir)
  ? fs.readdirSync(dataDir).filter((name) => name.toLowerCase().endsWith(".json"))
  : [];

const rawCards = [];
for (const name of jsonFiles) {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(dataDir, name), "utf8"));
    rawCards.push(...(Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.cards) ? parsed.cards : [])));
  } catch (error) {
    console.error(`ERRO em src/data/${name}: ${error.message}`);
    failed = true;
  }
}

const cards = rawCards.map(normalizeCard).filter((card) => card.id !== "unknown");
const index = makeCardIndex(cards);
console.log(`\nArquivos JSON: ${jsonFiles.length}`);
console.log(`Entradas de cartas: ${cards.length}`);
console.log(`IDs únicos: ${index.size}`);

if (!cards.length) {
  console.warn("AVISO: nenhum card foi carregado. Copie seu src/data antigo antes de jogar.");
}

// The Home screen uses a lightweight number instead of importing the whole
// database. Verify that this cached count never silently drifts from reality.
const manifestPath = path.join(root, "src", "data", "catalogManifest.js");
if (fs.existsSync(manifestPath)) {
  const source = fs.readFileSync(manifestPath, "utf8");
  const match = source.match(/CATALOG_CARD_COUNT\s*=\s*(\d+)/);
  const manifestCount = match ? Number(match[1]) : NaN;
  const inSync = Number.isFinite(manifestCount) && manifestCount === index.size;
  console.log(`${inSync ? "OK " : "-- "} catalogManifest.js (${manifestCount || "?"}/${index.size})`);
  if (!inSync) failed = true;
}


for (const levelAsset of ["lv1.webp", "lv2.webp", "lv3.webp"]) {
  const relative = path.join("public", "images", "ui", "arena", "levels", levelAsset);
  const exists = fs.existsSync(path.join(root, relative));
  console.log(`${exists ? "OK " : "-- "} ${relative.replaceAll(path.sep, "/")}`);
  if (!exists) failed = true;
}

for (const image of ["logo_battlespirits.png", "card-back.webp"]) {
  const exists = fs.existsSync(path.join(root, "public", "images", image));
  console.log(`${exists ? "OK " : "-- "} public/images/${image}`);
  if (!exists) console.warn(`AVISO: faltando public/images/${image}`);
}

// Validate local CSS @import paths. The v3.1.4 folder reorganization moved
// theme files, so this check prevents a stale relative import from passing the
// structural verification and only failing later during `vite build`.
function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walkFiles(full) : [full];
  });
}

const cssFiles = walkFiles(path.join(root, "src", "styles"))
  .filter((file) => file.toLowerCase().endsWith(".css"));
let cssImportCount = 0;
for (const cssFile of cssFiles) {
  const source = fs.readFileSync(cssFile, "utf8");
  const importPattern = /@import\s+(?:url\()?['"]([^'"]+)['"]\)?\s*;/g;
  for (const match of source.matchAll(importPattern)) {
    const target = match[1];
    if (!target.startsWith(".")) continue;
    cssImportCount += 1;
    const resolved = path.resolve(path.dirname(cssFile), target);
    if (!fs.existsSync(resolved)) {
      console.error(`ERRO CSS @import: ${path.relative(root, cssFile)} -> ${target}`);
      failed = true;
    }
  }
}
console.log(`${failed ? "--" : "OK "} CSS @imports locais (${cssImportCount} verificados)`);

if (failed) process.exit(1);
console.log("\nVERIFY OK — estrutura v3.6.1 validada.");
