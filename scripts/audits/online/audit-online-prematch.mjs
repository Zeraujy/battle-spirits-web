import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const errors = [];
const requireText = (file, pattern, label) => {
  const source = read(file);
  if (!pattern.test(source)) errors.push(`${label} (${file})`);
};

for (const file of [
  "server/matches/deckLock.js",
  "server/matches/deckLock.test.js",
  "src/features/online/components/PreMatchVersus.jsx",
  "src/styles/pages/onlinePreMatchV500.css",
  "docs/online/phase-10-11-prematch-deck-lock.md"
]) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`Missing ${file}`);
}

requireText("server/index.mjs", /createDeckSnapshot/, "Server does not create locked deck snapshots");
requireText("server/index.mjs", /validateDeckSnapshot/, "Server does not revalidate deck snapshots");
requireText("server/index.mjs", /deckLocked:\s*true/, "Matchmaking room is not marked deckLocked");
requireText("server/index.mjs", /preMatch:\s*\{/, "Server does not emit preMatch presentation");
requireText("server/matches/deckLock.js", /fingerprint/, "Deck snapshot has no fingerprint");
requireText("server/matches/deckLock.js", /Object\.freeze/, "Deck snapshot is not immutable");
requireText("src/features/online/OnlineLobby.jsx", /coverCardId:/, "Client does not submit cover presentation metadata at queue join");
requireText("src/features/online/OnlineLobby.jsx", /PreMatchVersus/, "OnlineLobby does not render the VS presentation");
requireText("src/features/online/OnlineLobby.jsx", /pendingMatchStateRef/, "VS handoff does not preserve pending authoritative room state");
requireText("src/features/online/OnlineLobby.jsx", /1800/, "VS handoff has no bounded transition duration");

const onlineLobby = read("src/features/online/OnlineLobby.jsx");
const readyEmit = onlineLobby.match(/"matchmaking:ready"[\s\S]{0,250}/)?.[0] || "";
if (/\bdeck\s*:|deckId|deckName|coverCardId/.test(readyEmit)) {
  errors.push("matchmaking:ready must not send deck data");
}

const presentation = read("server/matches/deckLock.js").match(/export function deckSnapshotPresentation[\s\S]*?\n\}/)?.[0] || "";
if (/deckName|cardCount|fingerprint|cards\s*:/.test(presentation)) {
  errors.push("Public deck presentation exposes private deck metadata");
}

if (errors.length) {
  console.error("ONLINE PHASE 10/11 AUDIT FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("ONLINE PHASE 10/11 AUDIT OK — server deck lock and VS handoff verified.");
