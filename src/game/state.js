import { GAME_DEFAULTS } from "./constants.js";
import { getCardName } from "./cardAdapter.js";
import { shuffle, uid } from "./utils.js";
import { createSeededRandom, normalizeSeed } from "./random.js";
import {
  ETERNAL_OFFICIAL_LIST_DATE,
  ETERNAL_RULES_VERSION,
  cardPrintedDeckCopyLimit,
  copyLimitForCard,
  eternalDeckNameKey,
  officialDeckPairViolation,
  officialRestrictionForCard
} from "./eternalDeckRules.js";

export function expandDeck(deck = []) {
  const result = [];
  for (const entry of deck) {
    if (typeof entry === "string") {
      result.push(entry);
      continue;
    }
    const id = entry.cardId ?? entry.id;
    const quantity = Number(entry.quantity ?? entry.qty ?? entry.count ?? 1);
    for (let i = 0; i < quantity; i += 1) result.push(String(id));
  }
  return result;
}

export function validateDeck(deck, cardIndex, options = {}) {
  const ids = expandDeck(deck);
  const errors = [];
  const warnings = [];
  const issues = [];
  const regulation = options.regulation === "official"
    ? "official"
    : options.regulation === "lab"
      ? "lab"
      : "eternal";
  const official = regulation === "official";
  const minimum = options.minimumDeckSize ?? GAME_DEFAULTS.minimumDeckSize;
  const maxSameName = options.maxSameName ?? GAME_DEFAULTS.maxSameName;

  const addError = (code, message, detail = {}) => {
    errors.push(message);
    issues.push({ severity: "error", code, message, ...detail });
  };
  const addWarning = (code, message, detail = {}) => {
    warnings.push(message);
    issues.push({ severity: "warning", code, message, ...detail });
  };

  if (ids.length < minimum) {
    addError("minimum_deck_size", `O deck precisa ter pelo menos ${minimum} cartas.`, { minimum, current: ids.length });
  }

  const byName = new Map();
  const resolvedCards = [];
  const contractTypes = new Map();

  for (const id of ids) {
    const card = cardIndex.get(id);
    if (!card) {
      addError("card_unavailable", `A carta ${id} não está disponível nesta versão.`, { cardId: id });
      continue;
    }
    resolvedCards.push(card);
    const key = eternalDeckNameKey(card);
    const entry = byName.get(key) || { count: 0, cards: [], name: getCardName(card) };
    entry.count += 1;
    entry.cards.push(card);
    byName.set(key, entry);

    if (regulation !== "lab") {
      const subtypes = Array.isArray(card.subtypes) ? card.subtypes.map((value) => String(value).toLowerCase()) : [];
      const isContract = Boolean(card.contractNexus)
        || String(card.cardType || "").toLowerCase().startsWith("contract")
        || subtypes.includes("contract");
      if (isContract) {
        const contractKey = String(card.contractType ?? card.contractName ?? card.nameKey ?? getCardName(card)).trim().toLocaleLowerCase("pt-BR");
        contractTypes.set(contractKey, getCardName(card));
      }

      const isToken = String(card.cardType || "").toLowerCase() === "token" || subtypes.includes("token");
      if (isToken) addError("token_in_deck", `${getCardName(card)} é um Token e não faz parte do deck.`, { cardId: card.id });
    }
  }

  for (const [nameKey, entry] of byName) {
    let limit = maxSameName;
    for (const card of entry.cards) {
      const printed = cardPrintedDeckCopyLimit(card);
      if (printed === Infinity) {
        limit = Infinity;
        break;
      }
      if (printed != null) limit = Math.max(limit, printed);
    }
    const restriction = regulation !== "lab" ? officialRestrictionForCard(entry.cards[0]) : null;
    // No formato Eternal, cartas da categoria "Proibida" não podem ser usadas.
    // As demais limitações (<1>/<2>/<20>) são aplicadas pela regulação oficial de eventos.
    if (restriction?.kind === "banned") limit = 0;
    if (official && restriction && restriction.kind !== "banned") {
      limit = Math.min(limit, copyLimitForCard(entry.cards[0], { official: true, fallbackMaxSameName: maxSameName }));
    }
    if (entry.count > limit) {
      const code = restriction?.kind === "banned" ? "eternal_banned" : official && restriction ? "official_copy_limit" : "same_name_limit";
      const message = restriction?.kind === "banned"
        ? `${entry.name} é uma carta proibida no formato Eternal atual.`
        : official && restriction
          ? `${entry.name}: máximo de ${limit} cópia${limit === 1 ? "" : "s"} no regulamento oficial atual.`
          : `${entry.name}: máximo de ${limit} cópias pelo mesmo nome.`;
      addError(code, message, { nameKey, count: entry.count, limit, cardId: entry.cards[0]?.id });
    }
  }

  if (regulation !== "lab" && contractTypes.size > 1) {
    addError("multiple_contract_types", "O deck pode conter somente 1 tipo de Carta de Contrato.", {
      contracts: [...contractTypes.values()]
    });
  }

  if (official) {
    const bannedPair = officialDeckPairViolation(resolvedCards);
    if (bannedPair) addError("official_banned_pair", "Este deck contém uma combinação de cartas que não pode ser usada junta no regulamento oficial atual.", { pair: bannedPair });
  }

  if (ids.length > 80) addWarning("large_deck", "Decks muito grandes podem tornar as partidas mais longas.");

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    issues,
    size: ids.length,
    format: "eternal",
    rulesVersion: ETERNAL_RULES_VERSION,
    regulation,
    officialListDate: official ? ETERNAL_OFFICIAL_LIST_DATE : null
  };
}

export function makePhysicalCard(cardId, cardIndex) {
  const db = cardIndex.get(cardId);
  return {
    instanceId: uid("card"),
    cardId,
    cardType: db?.cardType || "unknown",
    exhausted: false,
    cores: { regular: 0, soul: false },
    temporaryBP: 0,
    effectModifiers: [],
    pendingDestruction: false,
    combinedWith: null,
    flags: {}
  };
}

export function createPlayer({ id, name, username, avatar, playerColor, deck }, cardIndex, random = Math.random) {
  const physicalDeck = shuffle(expandDeck(deck).map((cardId) => makePhysicalCard(cardId, cardIndex)), random);
  const hand = physicalDeck.splice(0, GAME_DEFAULTS.startingHand);
  return {
    id,
    name: name || id,
    username: username || null,
    avatar: avatar || null,
    playerColor: playerColor || null,
    deck: physicalDeck,
    hand,
    trash: [],
    revealed: [],
    removed: [],
    life: GAME_DEFAULTS.life,
    reserve: GAME_DEFAULTS.reserveRegularCores,
    trashCores: 0,
    soulCore: { zone: "reserve", instanceId: null },
    field: { spirits: [], nexuses: [], other: [] },
    burst: null,
    mirage: null,
    turnFlags: { burstSet: false, mirageSet: false },
    mulliganUsed: false
  };
}

export function createMatch({ player1, player2, firstPlayerId = "player1", cardIndex, random = null, seed = null }) {
  const randomSeed = normalizeSeed(seed);
  const randomSource = typeof random === "function"
    ? random
    : randomSeed != null
      ? createSeededRandom(randomSeed)
      : Math.random;

  const players = {
    player1: createPlayer({ id: "player1", ...player1 }, cardIndex, randomSource),
    player2: createPlayer({ id: "player2", ...player2 }, cardIndex, randomSource)
  };
  return {
    id: uid("match"),
    format: "eternal",
    rulesVersion: ETERNAL_RULES_VERSION,
    simulatorVersion: "3.9.5",
    stateSchemaVersion: 1,
    randomSeed,
    turnNumber: 1,
    firstPlayerId,
    activePlayerId: firstPlayerId,
    phase: "start",
    players,
    battle: null,
    burstOpportunity: null,
    pendingEffectDecision: null,
    pending: [],
    temporary: {},
    winnerId: null,
    winnerReason: null,
    actionLog: [],
    log: [{ id: uid("log"), turn: 1, phase: "start", kind: "system", text: "Partida iniciada." }]
  };
}
