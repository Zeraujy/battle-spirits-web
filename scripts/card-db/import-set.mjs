import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateCatalogCollection } from "../../src/services/cardCatalogValidation.js";
import { readCatalogCards } from "./catalog-files.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
function argsToObject(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) result[key] = true;
    else { result[key] = next; i += 1; }
  }
  return result;
}
const args = argsToObject(process.argv.slice(2));
const jsonPath = args.json ? path.resolve(process.cwd(), args.json) : "";
const imagesPath = args.images ? path.resolve(process.cwd(), args.images) : "";
const setCode = String(args.set || "").trim().toUpperCase();
const replace = Boolean(args.replace);
const dryRun = Boolean(args["dry-run"]);
const allowMissingImages = Boolean(args["allow-missing-images"]);
if (!jsonPath || !setCode) {
  console.error("Uso: npm run cards:import -- --json <cards.json> --images <pasta> --set <CODIGO> [--replace] [--dry-run]");
  process.exit(1);
}
if (!fs.existsSync(jsonPath)) { console.error(`JSON não encontrado: ${jsonPath}`); process.exit(1); }
const parsed = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const sourceCards = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.cards) ? parsed.cards : []);
if (!sourceCards.length) { console.error("Nenhuma carta encontrada no arquivo informado."); process.exit(1); }

const imageFiles = imagesPath && fs.existsSync(imagesPath)
  ? fs.readdirSync(imagesPath, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name)
  : [];
const imageByBase = new Map(imageFiles.map((name) => [path.parse(name).name.toUpperCase(), name]));
const cards = sourceCards.map((raw) => {
  const id = String(raw.id ?? raw.cardNumber ?? raw.number ?? "").trim().toUpperCase();
  let imageFile = "";
  const declared = String(raw.image ?? raw.imagePath ?? raw.frontImage ?? "");
  if (declared) {
    const basename = path.basename(declared.replaceAll("\\", "/"));
    if (imageFiles.includes(basename)) imageFile = basename;
  }
  if (!imageFile) imageFile = imageByBase.get(id) || "";
  return {
    ...raw,
    id,
    set: raw.set || setCode,
    ...(imageFile ? { image: `/cards-database/${setCode}/${imageFile}` } : {})
  };
});

const validation = validateCatalogCollection(cards, { expectedSet: setCode, requireImage: !allowMissingImages });
for (const { report } of validation.reports) {
  for (const error of report.errors) console.error(`ERRO ${report.id || "SEM-ID"}: ${error}`);
  for (const warning of report.warnings) console.warn(`AVISO ${report.id || "SEM-ID"}: ${warning}`);
}
if (validation.duplicateIds.length) console.error(`IDs duplicados no arquivo: ${validation.duplicateIds.join(", ")}`);
if (!validation.valid) process.exit(1);

const targetJson = path.join(root, "src", "data", "sets", `${setCode}.json`);
const current = readCatalogCards(path.join(root, "src", "data"));
const incomingIds = new Set(cards.map((card) => card.id));
const collisions = [...incomingIds].filter((id) => {
  const source = current.sources.get(id);
  return source && path.resolve(source) !== path.resolve(targetJson);
});
if (collisions.length) {
  console.error(`IDs já usados por outro arquivo do catálogo: ${collisions.slice(0, 20).join(", ")}${collisions.length > 20 ? "..." : ""}`);
  process.exit(1);
}
if (fs.existsSync(targetJson) && !replace) {
  console.error(`O set ${setCode} já existe em src/data/sets. Use --replace para substituí-lo.`);
  process.exit(1);
}

const missingImages = cards.filter((card) => {
  const basename = path.basename(String(card.image || ""));
  return !basename || !imageFiles.includes(basename);
});
if (missingImages.length && !allowMissingImages) {
  console.error(`Imagens não encontradas para: ${missingImages.map((card) => card.id).join(", ")}`);
  process.exit(1);
}
console.log(`\nImportação ${dryRun ? "(simulação)" : "pronta"}: ${cards.length} cartas / ${imageFiles.length} imagens / set ${setCode}.`);
if (dryRun) process.exit(0);

fs.mkdirSync(path.dirname(targetJson), { recursive: true });
const targetImages = path.join(root, "public", "cards-database", setCode);
fs.mkdirSync(targetImages, { recursive: true });
for (const imageName of imageFiles) fs.copyFileSync(path.join(imagesPath, imageName), path.join(targetImages, imageName));
const payload = parsed?.set ? { set: { ...parsed.set, code: setCode }, cards } : cards;
const temp = `${targetJson}.tmp`;
fs.writeFileSync(temp, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
fs.renameSync(temp, targetJson);
console.log(`Set salvo em ${path.relative(root, targetJson)}.`);
console.log(`Imagens salvas em ${path.relative(root, targetImages)}.`);
console.log("Agora execute: npm run cards:sync && npm run cards:validate");
