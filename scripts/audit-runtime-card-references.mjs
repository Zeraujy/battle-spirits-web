/**
 * Verifies the artwork references that the runtime catalog will actually use.
 *
 * Why this exists:
 * `src/data/cards.json` contains the complete visual catalog, while some later
 * set/deck JSON files contain updated gameplay data but omit `image`. Because
 * those files override duplicate IDs, the runtime repository must inherit the
 * artwork from the previously loaded catalog record.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "src", "data");
const publicDir = path.join(root, "public");

function cardId(raw = {}) {
  return String(raw.id ?? raw.cardNumber ?? raw.number ?? "unknown");
}

function artworkFrom(raw = {}) {
  return raw.image ?? raw.imagePath ?? raw.imageUrl ?? raw.frontImage ?? null;
}

function normalizeLocalArtwork(value) {
  if (!value || /^(https?:|data:|blob:)/i.test(value)) return value || null;
  return String(value)
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/^public\//i, "")
    .replace(/^\/+/, "");
}

function loadCards(file) {
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  return Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.cards) ? parsed.cards : []);
}

const jsonFiles = fs.readdirSync(dataDir)
  .filter((name) => name.toLowerCase().endsWith(".json"))
  .sort((a, b) => {
    const aBase = a === "cards.json";
    const bBase = b === "cards.json";
    if (aBase !== bBase) return aBase ? -1 : 1;
    return a.localeCompare(b);
  });

const runtime = new Map();
let inheritedArtwork = 0;

for (const name of jsonFiles) {
  for (const raw of loadCards(path.join(dataDir, name))) {
    const id = cardId(raw);
    if (!id || id === "unknown") continue;

    const previous = runtime.get(id);
    const ownArtwork = artworkFrom(raw);
    const effectiveArtwork = ownArtwork || previous?.artwork || null;

    if (!ownArtwork && previous?.artwork) inheritedArtwork += 1;

    runtime.set(id, {
      id,
      source: name,
      artwork: effectiveArtwork
    });
  }
}

const missingReference = [];
const missingFile = [];
const remoteArtwork = [];

for (const card of runtime.values()) {
  const normalized = normalizeLocalArtwork(card.artwork);
  if (!normalized) {
    missingReference.push(card);
    continue;
  }

  if (/^(https?:|data:|blob:)/i.test(normalized)) {
    remoteArtwork.push(card);
    continue;
  }

  const full = path.join(publicDir, normalized);
  if (!fs.existsSync(full)) {
    missingFile.push({ ...card, artwork: normalized });
  }
}

console.log("Runtime card artwork audit");
console.log(`- arquivos de dados: ${jsonFiles.length}`);
console.log(`- cartas únicas em runtime: ${runtime.size}`);
console.log(`- artes herdadas de cards.json: ${inheritedArtwork}`);
console.log(`- cartas sem referência de arte: ${missingReference.length}`);
console.log(`- arquivos de arte ausentes: ${missingFile.length}`);
console.log(`- artes remotas: ${remoteArtwork.length}`);

for (const item of missingReference.slice(0, 20)) {
  console.error(`  SEM ARTE: ${item.id} (última fonte: ${item.source})`);
}
for (const item of missingFile.slice(0, 20)) {
  console.error(`  ARQUIVO AUSENTE: ${item.id} -> public/${item.artwork}`);
}

if (missingReference.length || missingFile.length) process.exit(1);
