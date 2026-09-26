import fs from "node:fs";
import path from "node:path";

export function walkJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkJsonFiles(full);
    return entry.name.toLowerCase().endsWith(".json") ? [full] : [];
  });
}

export function readCardFile(file) {
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.cards)) return parsed.cards;
  return [];
}

export function readCatalogCards(dataDir) {
  const files = walkJsonFiles(dataDir).sort((a, b) => {
    const aBase = path.basename(a).toLowerCase() === "cards.json";
    const bBase = path.basename(b).toLowerCase() === "cards.json";
    if (aBase !== bBase) return aBase ? -1 : 1;
    return a.localeCompare(b, "en", { numeric: true, sensitivity: "base" });
  });
  const byId = new Map();
  const sources = new Map();
  for (const file of files) {
    for (const raw of readCardFile(file)) {
      const id = String(raw?.id ?? raw?.cardNumber ?? raw?.number ?? "").trim().toUpperCase();
      if (!id) continue;
      byId.set(id, raw);
      sources.set(id, file);
    }
  }
  return { files, cards: [...byId.values()], byId, sources };
}

export function setCodeFromCard(card = {}) {
  const explicit = String(card.setCode ?? card.set ?? card.product ?? "").trim();
  if (explicit) return explicit.toUpperCase();
  const id = String(card.id ?? card.cardNumber ?? card.number ?? "").trim();
  const match = id.match(/^([A-Za-z]+\d+[A-Za-z]?)-/);
  return match ? match[1].toUpperCase() : "UNKNOWN";
}
