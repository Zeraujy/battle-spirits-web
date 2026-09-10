import { GAME_DEFAULTS } from "./constants.js";
import { getCardName } from "./cardAdapter.js";
import { shuffle, uid } from "./utils.js";

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
  const minimum = options.minimumDeckSize ?? GAME_DEFAULTS.minimumDeckSize;
  if (ids.length < minimum) errors.push(`O deck precisa ter pelo menos ${minimum} cartas.`);

  const byName = new Map();
  for (const id of ids) {
    const card = cardIndex.get(id);
    if (!card) {
      errors.push(`Carta não encontrada no database: ${id}`);
      continue;
    }
    const key = getCardName(card).trim().toLocaleLowerCase("pt-BR");
    byName.set(key, (byName.get(key) || 0) + 1);
  }
  for (const [name, count] of byName) {
    if (count > GAME_DEFAULTS.maxSameName) errors.push(`${name}: máximo de ${GAME_DEFAULTS.maxSameName} cópias pelo mesmo nome.`);
  }
  if (ids.length > 80) warnings.push("O formato Eternal não possui limite superior geral; decks muito grandes podem deixar o jogo mais lento.");
  return { ok: errors.length === 0, errors, warnings, size: ids.length };
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

export function createPlayer({ id, name, avatar, playerColor, deck }, cardIndex, random = Math.random) {
  const physicalDeck = shuffle(expandDeck(deck).map((cardId) => makePhysicalCard(cardId, cardIndex)), random);
  const hand = physicalDeck.splice(0, GAME_DEFAULTS.startingHand);
  return {
    id,
    name: name || id,
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

export function createMatch({ player1, player2, firstPlayerId = "player1", cardIndex, random = Math.random }) {
  const players = {
    player1: createPlayer({ id: "player1", ...player1 }, cardIndex, random),
    player2: createPlayer({ id: "player2", ...player2 }, cardIndex, random)
  };
  return {
    id: uid("match"),
    format: "eternal",
    rulesVersion: "17.1",
    turnNumber: 1,
    firstPlayerId,
    activePlayerId: firstPlayerId,
    phase: "start",
    players,
    battle: null,
    pendingEffectDecision: null,
    pending: [],
    temporary: {},
    winnerId: null,
    winnerReason: null,
    log: [{ id: uid("log"), turn: 1, phase: "start", kind: "system", text: "Partida iniciada." }]
  };
}
