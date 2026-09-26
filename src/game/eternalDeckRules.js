import { getCardName } from "./cardAdapter.js";

export const ETERNAL_RULES_VERSION = "17.1";
export const ETERNAL_OFFICIAL_LIST_DATE = "2026-09-01";

function canonicalCardId(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s/]+/g, "")
    .replace(/[‐‑‒–—―]/g, "-");
}

// Lista oficial japonesa vigente em 01/09/2026. A validação compara pelo
// card number, que é a forma mais segura para diferenciar revisões/revivals.
const BANNED_IDS = [
  "BS72-019","BSC48-015","BSC50-031","BS45-090","CB05-055","SD68-007",
  "BS26-016","SD27-001","BS12-X02","BS38-RVX02","BS52-CP08","BS32-011",
  "BS52-RV002","BS56-072","BS70-078","BS55-075","BS02-085","BS03-030",
  "BS48-X06","BS13-059","BS40-X06","BS60-051","P043","EX017","BS64-X02",
  "BS66-068","BS52-017","BS32-074","BS45-024","BS56-075","BS56-RV006",
  "BS28-082","BS57-011","BS57-078","BS57-083","BS61-062","SD54-015",
  "BS39-049","BS39-051","BS39-052","BS39-055","BS39-057","BS39-059",
  "BS52-019","BS53-XX02","SD41-RVX01","BS11-X02","BS59-X07","BS43-X04",
  "BS52-058","BS52-X01","BS52-X06","BS54-X03","BS56-021","BSC32-031",
  "BS02-063","BS38-RV003","BS10-006","BS44-10THX01","BS41-063","BS12-039",
  "BS02-097","BS04-089","BS04-096","BS16-X03","BS10-111","BS04-105",
  "BS13-071","BS10-108","SD02-014","BSC22-CP02","BS01-132","BS02-099",
  "BS04-088","BSC22-CP01","BS01-124"
];

const LIMITED_ONE_IDS = [
  "BS11-082","BS75-054","BSC50-033","BS51-10THX01","BS13-062","BSC49-075",
  "BS48-019","BS70-013","BS72-023","CB08-X02","BS73-TCP01","BS03-148",
  "BS52-X09","BS55-TX04","BS64-059","BS56-022","BS56-025","BS60-063",
  "BS60-083","LM19-02","SD51-005","BS41-XX01","BS42-069","BS51-CP04",
  "BS21-X07","BS52-TX01","BS52-010","BS58-TCP02","BS60-064","SD55-TX01",
  "BS02-X08","BS57-X07","SD51-X02","BS08-X32","BS43-RVX06","BS52-032",
  "BS55-X02","SD53-014","SD57-006","CB05-XX01","CB13-X05","SD55-011",
  "BS51-042","BS50-X03","SD51-004","BS42-007","SD10-009","BS15-063",
  "BSC05-018","BS50-015","BS35-005","BS46-X05","BS48-025","BS46-056",
  "BS45-X01","BS12-052","BS39-054","SD43-RV001","SD03-001","BSC29-007",
  "LM17-01","BS35-X04","SD39-X01","BS31-112","BS37-X05","BS39-036",
  "BS39-039","BS06-084","BS26-075","BS31-017","BS32-048","BS33-019",
  "BS08-066","BS30-035","P073","BS38-RV028","BS13-063","SD03-012",
  "BS04-082","BS03-X11","BS02-093"
];

const LIMITED_TWO_IDS = [];
const LIMITED_TWENTY_IDS = ["P16-26"];
const BANNED_PAIRS = [];

const BANNED = new Set(BANNED_IDS.map(canonicalCardId));
const LIMITED_ONE = new Set(LIMITED_ONE_IDS.map(canonicalCardId));
const LIMITED_TWO = new Set(LIMITED_TWO_IDS.map(canonicalCardId));
const LIMITED_TWENTY = new Set(LIMITED_TWENTY_IDS.map(canonicalCardId));

export function eternalDeckNameKey(card) {
  const explicit = card?.deckNameKey ?? card?.sameNameDeckKey ?? card?.deckConstructionName;
  if (explicit) return String(explicit).trim().toLocaleLowerCase("pt-BR");
  return String(getCardName(card) || card?.id || "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

export function cardPrintedDeckCopyLimit(card) {
  const value = card?.deckCopyLimit ?? card?.deckLimit ?? card?.maxDeckCopies;
  if (value === "unlimited" || value === Infinity) return Infinity;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function officialRestrictionForCard(card) {
  const id = canonicalCardId(card?.id ?? card?.cardNumber ?? card?.number);
  if (!id) return null;
  if (BANNED.has(id)) return { kind: "banned", limit: 0 };
  if (LIMITED_ONE.has(id)) return { kind: "limited1", limit: 1 };
  if (LIMITED_TWO.has(id)) return { kind: "limited2", limit: 2 };
  if (LIMITED_TWENTY.has(id)) return { kind: "limited20", limit: 20 };
  return null;
}

export function copyLimitForCard(card, { official = false, fallbackMaxSameName = 3 } = {}) {
  const printed = cardPrintedDeckCopyLimit(card);
  let limit = printed == null ? fallbackMaxSameName : printed;
  if (official) {
    const restriction = officialRestrictionForCard(card);
    if (restriction) limit = Math.min(limit, restriction.limit);
  }
  return limit;
}

export function officialDeckPairViolation(cards = []) {
  const ids = new Set(cards.map((card) => canonicalCardId(card?.id ?? card?.cardNumber ?? card?.number)));
  for (const pair of BANNED_PAIRS) {
    const [a, b] = pair.map(canonicalCardId);
    if (ids.has(a) && ids.has(b)) return pair;
  }
  return null;
}

export function officialRestrictionSummary(card) {
  const restriction = officialRestrictionForCard(card);
  if (!restriction) return null;
  if (restriction.kind === "banned") return "Proibida";
  return `Limitada a ${restriction.limit}`;
}
