import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STARTER_DECK_MIGRATIONS } from "./migrations/starterDeckMigrations.mjs";
import { validateEffectSchemaV2 } from "../../src/game/effectEngine/effectSchema.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CARD_PATH = path.join(ROOT, "src/data/cards.json");
const REPORT_DIR = path.join(ROOT, "data/effect-migrations");
const setArg = process.argv.find((arg) => arg.startsWith("--set="));
const targetSet = String(setArg?.split("=")[1] || "").toUpperCase();
const WRITE = process.argv.includes("--write");
if (!targetSet) throw new Error("Use --set=SDxx. Add --write to apply the migration.");
const migration = STARTER_DECK_MIGRATIONS[targetSet];
if (!migration) throw new Error(`No migration definition registered for ${targetSet}.`);

const cards = JSON.parse(fs.readFileSync(CARD_PATH, "utf8"));
const byId = new Map(cards.map((card) => [String(card.id), card]));
const changes = [];
const errors = [];

for (const [cardId, patch] of Object.entries(migration.cards || {})) {
  const card = byId.get(cardId);
  if (!card) { errors.push(`${cardId}: card not found in runtime catalog.`); continue; }
  const before = JSON.stringify(card);
  card.abilities ||= [];
  card.effects ||= [];

  if (patch.setFields && typeof patch.setFields === "object") {
    for (const [key, value] of Object.entries(patch.setFields)) card[key] = structuredClone(value);
  }
  if (Array.isArray(patch.replaceAbilities)) card.abilities = structuredClone(patch.replaceAbilities);
  if (patch.replaceAbilityById) {
    for (const [abilityId, replacement] of Object.entries(patch.replaceAbilityById)) {
      const index = card.abilities.findIndex((entry) => entry.id === abilityId);
      if (index >= 0) card.abilities[index] = structuredClone(replacement);
      else card.abilities.push(structuredClone(replacement));
    }
  }
  for (const ability of patch.addAbilities || []) {
    const index = card.abilities.findIndex((entry) => entry.id === ability.id);
    if (index >= 0) card.abilities[index] = structuredClone(ability);
    else card.abilities.push(structuredClone(ability));
  }
  for (const [effectId, abilityId] of Object.entries(patch.automationRefs || {})) {
    const effect = card.effects.find((entry) => entry.id === effectId);
    if (!effect) errors.push(`${cardId}: display effect ${effectId} not found.`);
    else effect.automationRef = abilityId;
  }

  for (const ability of card.abilities.filter((entry) => Number(entry.schemaVersion || 0) === 2)) {
    const validation = validateEffectSchemaV2(ability);
    if (!validation.ok) errors.push(`${cardId}/${ability.id}: ${validation.errors.join(" ")}`);
  }
  if (JSON.stringify(card) !== before) changes.push(cardId);
}

const report = {
  schemaVersion: 1,
  migrationId: migration.id,
  set: targetSet,
  write: WRITE,
  definedCards: Object.keys(migration.cards || {}),
  definedCount: Object.keys(migration.cards || {}).length,
  changedCards: changes,
  changedCount: changes.length,
  errors,
  notes: migration.notes || ""
};
fs.mkdirSync(REPORT_DIR, { recursive: true });
fs.writeFileSync(path.join(REPORT_DIR, `${targetSet}.json`), `${JSON.stringify(report, null, 2)}\n`);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else if (WRITE) {
  fs.writeFileSync(CARD_PATH, `${JSON.stringify(cards, null, 2)}\n`);
  console.log(`[effects:migrate] ${targetSet}: applied ${changes.length} card patch(es).`);
} else {
  console.log(`[effects:migrate] ${targetSet}: dry-run OK, ${changes.length} card patch(es) would change.`);
}
