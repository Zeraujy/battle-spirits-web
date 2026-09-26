const VALID_TYPES = new Set(["spirit", "nexus", "magic", "brave", "ultimate"]);
const VALID_COLORS = new Set(["red", "purple", "green", "white", "yellow", "blue"]);
const VALID_IMAGE_EXTENSIONS = new Set([".webp", ".png", ".jpg", ".jpeg"]);

export function inferSetCode(card = {}) {
  const explicit = String(card.setCode ?? card.set ?? card.product ?? "").trim();
  if (explicit) return explicit.toUpperCase();
  const id = String(card.id ?? card.cardNumber ?? card.number ?? "").trim();
  const match = id.match(/^([A-Za-z]+\d+[A-Za-z]?)-/);
  return match ? match[1].toUpperCase() : "";
}

export function normalizeCatalogId(value) {
  return String(value ?? "").trim().toUpperCase();
}

function arrayify(value) {
  if (value == null || value === "") return [];
  return (Array.isArray(value) ? value : [value]).filter((item) => item != null && String(item).trim() !== "");
}

function fileExtension(value = "") {
  const clean = String(value).split(/[?#]/, 1)[0];
  const dot = clean.lastIndexOf(".");
  return dot >= 0 ? clean.slice(dot).toLowerCase() : "";
}

export function validateCatalogCard(raw = {}, { expectedSet = "", requireImage = false } = {}) {
  const errors = [];
  const warnings = [];
  const id = normalizeCatalogId(raw.id ?? raw.cardNumber ?? raw.number);
  const type = String(raw.cardType ?? raw.type ?? raw.card_type ?? "").trim().toLowerCase();
  const setCode = inferSetCode(raw);
  const colors = arrayify(raw.colors ?? raw.color).map((value) => String(value).trim().toLowerCase());
  const reduction = arrayify(raw.reduction ?? raw.reductions ?? raw.reductionSymbols);
  const symbols = arrayify(raw.symbols ?? raw.symbol);
  const image = raw.image ?? raw.imagePath ?? raw.imageUrl ?? raw.frontImage ?? "";
  const cost = Number(raw.cost);
  const nameEN = String(raw.nameEN ?? raw.nameEn ?? raw.name ?? "").trim();
  const namePT = String(raw.namePT ?? raw.namePt ?? raw.namePTBR ?? "").trim();

  if (!id) errors.push("ID ausente.");
  else if (!/^[A-Z0-9][A-Z0-9+._-]*$/i.test(id)) warnings.push("O ID usa caracteres pouco comuns; confirme o código oficial da carta.");

  if (!nameEN && !namePT) errors.push("Nome ausente em PT e EN.");
  if (!nameEN) warnings.push("Tradução/nome em inglês ausente.");
  if (!namePT) warnings.push("Tradução/nome em português ausente.");

  if (!VALID_TYPES.has(type)) errors.push(`Tipo de carta inválido: ${type || "ausente"}.`);
  if (!Number.isFinite(cost) || cost < 0 || !Number.isInteger(cost)) errors.push("Custo deve ser um número inteiro maior ou igual a 0.");

  if (!colors.length) warnings.push("Carta sem cor declarada.");
  for (const color of colors) {
    if (!VALID_COLORS.has(color)) warnings.push(`Cor não reconhecida pelo catálogo atual: ${color}.`);
  }

  if (!setCode) warnings.push("Set não identificado; informe o campo set para facilitar filtros e importações.");
  if (expectedSet && setCode && setCode !== String(expectedSet).trim().toUpperCase()) {
    warnings.push(`Set da carta (${setCode}) difere do set importado (${String(expectedSet).trim().toUpperCase()}).`);
  }

  if (requireImage && !image) errors.push("Imagem ausente.");
  if (image) {
    const extension = fileExtension(image);
    if (extension && !VALID_IMAGE_EXTENSIONS.has(extension)) warnings.push(`Formato de imagem incomum: ${extension}.`);
  }

  const levels = Array.isArray(raw.levels) ? raw.levels : [];
  if (["spirit", "brave", "ultimate"].includes(type) && !levels.length) warnings.push("Carta de batalha sem Levels cadastrados.");
  for (const [index, level] of levels.entries()) {
    const lv = Number(level?.level ?? level?.lv);
    const cores = Number(level?.cores ?? level?.core ?? level?.cost);
    const bpRaw = level?.bp ?? level?.BP;
    const bp = bpRaw == null ? null : Number(bpRaw);
    if (!Number.isFinite(lv) || lv < 1) errors.push(`Level ${index + 1}: nível inválido.`);
    if (!Number.isFinite(cores) || cores < 0) errors.push(`Level ${index + 1}: quantidade de Cores inválida.`);
    if (["spirit", "brave", "ultimate"].includes(type) && (!Number.isFinite(bp) || bp < 0)) errors.push(`Level ${index + 1}: BP inválido.`);
    if (bp != null && (!Number.isFinite(bp) || bp < 0)) errors.push(`Level ${index + 1}: BP inválido.`);
  }

  if (reduction.some((entry) => String(entry).trim() === "")) warnings.push("Há símbolo de redução vazio.");
  if (symbols.some((entry) => String(entry).trim() === "")) warnings.push("Há símbolo vazio.");

  return {
    id,
    setCode,
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateCatalogCollection(rawCards = [], options = {}) {
  const reports = rawCards.map((card) => ({ card, report: validateCatalogCard(card, options) }));
  const duplicateIds = [];
  const seen = new Set();
  for (const { report } of reports) {
    if (!report.id) continue;
    if (seen.has(report.id)) duplicateIds.push(report.id);
    seen.add(report.id);
  }
  return {
    valid: reports.every(({ report }) => report.valid) && duplicateIds.length === 0,
    reports,
    duplicateIds: [...new Set(duplicateIds)]
  };
}

export const CARD_CATALOG_RULES = Object.freeze({
  validTypes: [...VALID_TYPES],
  validColors: [...VALID_COLORS],
  validImageExtensions: [...VALID_IMAGE_EXTENSIONS]
});
