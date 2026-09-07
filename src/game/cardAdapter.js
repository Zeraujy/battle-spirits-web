import { COLORS } from "./constants.js";

const TYPE_ALIASES = {
  spirit: "spirit",
  spirits: "spirit",
  nexus: "nexus",
  magic: "magic",
  brave: "brave",
  ultimate: "ultimate",
  "grandwalker nexus": "nexus",
  grandwalker: "nexus",
  "grandstone nexus": "nexus",
  grandstone: "nexus",
  "contract nexus": "nexus"
};

function normalizeColor(value) {
  const key = String(value || "").trim().toLowerCase();
  const aliases = {
    vermelho: "red", red: "red", 赤: "red",
    roxo: "purple", purple: "purple", 紫: "purple",
    verde: "green", green: "green", 緑: "green",
    branco: "white", white: "white", 白: "white",
    amarelo: "yellow", yellow: "yellow", 黄: "yellow",
    azul: "blue", blue: "blue", 青: "blue"
  };
  return aliases[key] || key;
}

export function normalizeCard(raw = {}) {
  const cardTypeRaw = raw.cardType ?? raw.type ?? raw.card_type ?? "unknown";
  const cardTypeKey = String(cardTypeRaw).trim().toLowerCase();
  const cardType = TYPE_ALIASES[cardTypeKey]
    || (cardTypeKey.includes("nexus") ? "nexus" : TYPE_ALIASES[cardTypeKey.replace(/s$/, "")])
    || cardTypeKey;
  const colorsRaw = raw.colors ?? raw.color ?? [];
  const colors = (Array.isArray(colorsRaw) ? colorsRaw : [colorsRaw]).map(normalizeColor).filter(Boolean);
  const reductionRaw = raw.reduction ?? raw.reductions ?? raw.reductionSymbols ?? [];
  const reduction = (Array.isArray(reductionRaw) ? reductionRaw : [reductionRaw]).map(normalizeColor).filter(Boolean);
  const symbolsRaw = raw.symbols ?? raw.symbol ?? [];
  const symbols = (Array.isArray(symbolsRaw) ? symbolsRaw : [symbolsRaw]).map(normalizeColor).filter(Boolean);
  const levels = Array.isArray(raw.levels) ? raw.levels.map((level) => ({
    level: Number(level.level ?? level.lv ?? 1),
    cores: Number(level.cores ?? level.core ?? level.cost ?? 0),
    bp: Number(level.bp ?? level.BP ?? 0)
  })).sort((a, b) => a.level - b.level) : [];

  return {
    ...raw,
    id: String(raw.id ?? raw.cardNumber ?? raw.number ?? "unknown"),
    nameEN: raw.nameEN ?? raw.nameEn ?? raw.name ?? raw.id ?? "Unknown",
    namePT: raw.namePT ?? raw.namePt ?? raw.namePTBR ?? raw.name ?? raw.nameEN ?? raw.id ?? "Carta",
    nameKey: raw.nameKey ?? String(raw.namePT ?? raw.nameEN ?? raw.name ?? raw.id ?? "").toLowerCase(),
    cardType,
    colors: colors.filter((c) => COLORS.includes(c) || c === "ultimate" || c === "god"),
    reduction,
    symbols,
    cost: Number(raw.cost ?? 0),
    levels,
    effects: Array.isArray(raw.effects) ? raw.effects : [],
    abilities: Array.isArray(raw.abilities) ? raw.abilities : [],
    families: Array.isArray(raw.families) ? raw.families : [],
    subtypes: Array.isArray(raw.subtypes) ? raw.subtypes : [],
    effectText: raw.effectText ?? raw.text ?? {},
    image: raw.image ?? raw.imagePath ?? raw.imageUrl ?? raw.frontImage ?? null,
    braveCondition: raw.braveCondition ?? raw.braveConditions ?? raw.combineCondition ?? null,
    summonCondition: raw.summonCondition ?? raw.summoningCondition ?? null,
    braveBP: Number(raw.braveBP ?? raw.bpPlus ?? raw.combineBP ?? 0),
    braveSymbols: Array.isArray(raw.braveSymbols) ? raw.braveSymbols : undefined,
    mirage: raw.mirage ? {
      ...(typeof raw.mirage === "object" ? raw.mirage : {}),
      cost: Number((typeof raw.mirage === "object" ? raw.mirage.cost : raw.mirageCost) ?? raw.mirageCost ?? 0),
      reduction: (Array.isArray((typeof raw.mirage === "object" ? raw.mirage.reduction : raw.mirageReduction) ?? raw.mirageReduction)
        ? ((typeof raw.mirage === "object" ? raw.mirage.reduction : raw.mirageReduction) ?? raw.mirageReduction)
        : [((typeof raw.mirage === "object" ? raw.mirage.reduction : raw.mirageReduction) ?? raw.mirageReduction)]).filter(Boolean).map(normalizeColor)
    } : (raw.mirageCost != null ? {
      cost: Number(raw.mirageCost || 0),
      reduction: (Array.isArray(raw.mirageReduction) ? raw.mirageReduction : [raw.mirageReduction]).filter(Boolean).map(normalizeColor)
    } : null)
  };
}

export function makeCardIndex(cards = []) {
  const map = new Map();
  for (const raw of cards) {
    const card = normalizeCard(raw);
    map.set(card.id, card);
  }
  return map;
}

export function getCardName(card) {
  return card?.namePT || card?.nameEN || card?.name || card?.id || "Carta";
}

export function resolveCardImage(card) {
  if (!card) return "./images/card-back.png";
  if (card.image) {
    if (/^(https?:|data:|blob:)/i.test(card.image)) return card.image;
    let image = String(card.image).replaceAll("\\", "/");
    image = image.replace(/^\.\//, "").replace(/^public\//i, "");
    image = image.replace(/^\/+/, "");
    return `./${image}`;
  }
  const set = card.setCode || card.set || card.product || card.seriesFolder;
  const file = card.imageFile || card.fileName;
  if (set && file) return `./cards-database/${set}/${file}`;
  if (file) return `./cards-database/${file}`;
  return "./images/card-back.png";
}
