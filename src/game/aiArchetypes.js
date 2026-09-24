const ARCHETYPES = {
  aggressive: {
    id: "aggressive",
    labelPT: "Agressivo",
    labelEN: "Aggressive",
    shortPT: "Pressão de campo e Life",
    shortEN: "Board and Life pressure"
  },
  control: {
    id: "control",
    labelPT: "Controle",
    labelEN: "Control",
    shortPT: "Magic, remoção e respostas",
    shortEN: "Magic, removal and answers"
  },
  defensive: {
    id: "defensive",
    labelPT: "Defensivo",
    labelEN: "Defensive",
    shortPT: "Preserva Life e bloqueadores",
    shortEN: "Preserves Life and blockers"
  },
  ultimate: {
    id: "ultimate",
    labelPT: "Ultimate",
    labelEN: "Ultimate",
    shortPT: "Constrói em torno de Ultimates",
    shortEN: "Builds around Ultimates"
  },
  brave: {
    id: "brave",
    labelPT: "Brave",
    labelEN: "Brave",
    shortPT: "Busca combinações Brave",
    shortEN: "Seeks Brave combinations"
  },
  resource: {
    id: "resource",
    labelPT: "Recursos",
    labelEN: "Resources",
    shortPT: "Cores, compra e redução",
    shortEN: "Cores, draw and reduction"
  },
  balanced: {
    id: "balanced",
    labelPT: "Equilibrado",
    labelEN: "Balanced",
    shortPT: "Plano flexível e adaptável",
    shortEN: "Flexible adaptive plan"
  }
};

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function numeric(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function expandDeckEntries(deckEntries = []) {
  const ids = [];
  for (const entry of deckEntries || []) {
    if (!entry) continue;
    if (typeof entry === "string") {
      ids.push(entry);
      continue;
    }
    const id = entry.cardId ?? entry.id;
    if (!id) continue;
    const quantity = Math.max(1, numeric(entry.quantity ?? entry.qty ?? entry.count, 1));
    for (let index = 0; index < quantity; index += 1) ids.push(String(id));
  }
  return ids;
}

function visitAction(action, stats) {
  if (!action || typeof action !== "object") return;
  const type = String(action.type || "").toLowerCase();
  if (type) stats.actionTypes.set(type, (stats.actionTypes.get(type) || 0) + 1);

  if (["destroy", "exhaust", "returntohand", "returntodeck", "removefromgame", "removecore"].includes(type)) {
    stats.controlOps += 1;
  }
  if (type === "modifybp" && numeric(action.amount) < 0) stats.controlOps += 0.8;
  if (["draw", "addcoretoreservefromvoid", "addcore", "recoverfromtrash", "searchdeck"].includes(type)) {
    stats.resourceOps += 1;
  }
  if (["refresh", "recoverlife", "preventdestruction", "grantimmunity", "protect"].includes(type)) {
    stats.defensiveOps += 1;
  }
  if (["dealLifeDamage", "reduceLife", "lifeDamage"].map((value) => value.toLowerCase()).includes(type)) {
    stats.aggressiveOps += 1;
  }

  if (action.onSelect) visitAction(action.onSelect, stats);
  if (action.then) visitAction(action.then, stats);
  if (action.onSuccess) visitAction(action.onSuccess, stats);
  if (Array.isArray(action.actions)) action.actions.forEach((item) => visitAction(item, stats));
  if (Array.isArray(action.operations)) action.operations.forEach((item) => visitAction(item, stats));
}

function cardText(card) {
  try {
    return JSON.stringify({
      families: card?.families || [],
      subtypes: card?.subtypes || [],
      effects: card?.effects || [],
      abilities: card?.abilities || [],
      effectText: card?.effectText || {}
    }).toLowerCase();
  } catch {
    return "";
  }
}

function ratio(value, total) {
  return total > 0 ? value / total : 0;
}

function collectDeckMetrics(deckEntries, cardIndex) {
  const ids = expandDeckEntries(deckEntries);
  const metrics = {
    total: 0,
    types: { spirit: 0, ultimate: 0, brave: 0, nexus: 0, magic: 0 },
    colors: { red: 0, purple: 0, green: 0, white: 0, yellow: 0, blue: 0 },
    lowCost: 0,
    highCost: 0,
    totalCost: 0,
    reductionSymbols: 0,
    printedSymbols: 0,
    multiSymbol: 0,
    burstCards: 0,
    flashCards: 0,
    attackCards: 0,
    blockCards: 0,
    ultimateTriggerCards: 0,
    braveReferenceCards: 0,
    controlOps: 0,
    defensiveOps: 0,
    resourceOps: 0,
    aggressiveOps: 0,
    actionTypes: new Map()
  };

  for (const id of ids) {
    const card = cardIndex?.get?.(id);
    if (!card) continue;
    metrics.total += 1;

    const type = String(card.cardType || "").toLowerCase();
    if (Object.hasOwn(metrics.types, type)) metrics.types[type] += 1;

    const colors = new Set(card.colors || []);
    for (const color of colors) {
      if (Object.hasOwn(metrics.colors, color)) metrics.colors[color] += 1;
    }

    const cost = numeric(card.cost);
    metrics.totalCost += cost;
    if (cost <= 3) metrics.lowCost += 1;
    if (cost >= 6) metrics.highCost += 1;
    metrics.reductionSymbols += (card.reduction || []).length;
    metrics.printedSymbols += (card.symbols || []).length;
    if ((card.symbols || []).length >= 2) metrics.multiSymbol += 1;

    const text = cardText(card);
    const events = (card.abilities || []).map((ability) => String(ability?.event || "").toLowerCase());
    const effects = (card.effects || []).map((effect) => String(effect?.timing || effect?.type || "").toLowerCase());

    if ((card.subtypes || []).some((subtype) => String(subtype).toLowerCase().includes("burst")) || text.includes('"type":"burst"')) {
      metrics.burstCards += 1;
    }
    if (events.some((event) => event.includes("magicflash") || event.includes("flash")) || effects.some((effect) => effect.includes("flash"))) {
      metrics.flashCards += 1;
    }
    if (events.some((event) => event.includes("attack")) || effects.some((effect) => effect.includes("attack"))) {
      metrics.attackCards += 1;
    }
    if (events.some((event) => event.includes("block")) || effects.some((effect) => effect.includes("block"))) {
      metrics.blockCards += 1;
    }
    if (text.includes("ultimatetrigger") || text.includes("ultimate trigger") || text.includes("critical hit")) {
      metrics.ultimateTriggerCards += 1;
    }
    if (type === "brave" || text.includes("brave") || text.includes("combined")) {
      metrics.braveReferenceCards += 1;
    }

    for (const ability of card.abilities || []) {
      for (const action of ability?.actions || []) visitAction(action, metrics);
    }
    for (const effect of card.effects || []) {
      for (const action of effect?.actions || effect?.operations || []) visitAction(action, metrics);
    }
  }

  const total = Math.max(1, metrics.total);
  metrics.averageCost = metrics.totalCost / total;
  metrics.reductionDensity = metrics.reductionSymbols / total;
  metrics.symbolDensity = metrics.printedSymbols / total;
  return metrics;
}

function scoreArchetypes(metrics) {
  const total = Math.max(1, metrics.total);
  const type = (name) => ratio(metrics.types[name] || 0, total);
  const color = (name) => ratio(metrics.colors[name] || 0, total);
  const perCard = (value) => value / total;

  const scores = {
    aggressive:
      10 +
      ratio(metrics.lowCost, total) * 36 +
      perCard(metrics.attackCards) * 32 +
      ratio(metrics.multiSymbol, total) * 30 +
      color("red") * 24 +
      perCard(metrics.aggressiveOps) * 34 +
      type("spirit") * 10 -
      type("nexus") * 6,

    control:
      20 +
      type("magic") * 78 +
      type("nexus") * 48 +
      perCard(metrics.controlOps) * 60 +
      ratio(metrics.burstCards, total) * 35 +
      ratio(metrics.flashCards, total) * 25 +
      (color("purple") + color("yellow") + color("white")) * 9,

    defensive:
      16 +
      color("white") * 48 +
      type("nexus") * 34 +
      ratio(metrics.flashCards, total) * 42 +
      ratio(metrics.blockCards, total) * 50 +
      perCard(metrics.defensiveOps) * 58 +
      ratio(metrics.burstCards, total) * 24 +
      ratio(metrics.highCost, total) * 12,

    ultimate:
      8 +
      type("ultimate") * 210 +
      ratio(metrics.ultimateTriggerCards, total) * 92 +
      ratio(metrics.highCost, total) * 12,

    brave:
      8 +
      type("brave") * 220 +
      ratio(metrics.braveReferenceCards, total) * 65,

    resource:
      15 +
      type("nexus") * 42 +
      perCard(metrics.resourceOps) * 58 +
      clamp(metrics.reductionDensity / 3, 0, 1) * 46 +
      color("green") * 15 +
      ratio(metrics.lowCost, total) * 10
  };

  // A deck with no especially strong identity should remain Balanced instead
  // of being forced into a weak archetype just because one score won by 1 pt.
  scores.balanced =
    52 +
    Math.max(0, 0.55 - Math.abs(type("spirit") - 0.55)) * 30 -
    (type("ultimate") + type("brave")) * 60;
  return scores;
}

export function analyzeDeckArchetype(deckEntries = [], cardIndex) {
  const metrics = collectDeckMetrics(deckEntries, cardIndex);
  const scores = scoreArchetypes(metrics);
  const ordered = Object.entries(scores)
    .sort((a, b) => b[1] - a[1]);

  const [primaryId, primaryScore] = ordered[0] || ["balanced", 1];
  const [secondaryId, secondaryScore] = ordered[1] || ["balanced", 0];
  const maxScore = Math.max(1, primaryScore);
  const affinities = Object.fromEntries(
    Object.entries(scores).map(([id, value]) => [id, clamp(value / maxScore)])
  );

  const hybrid = secondaryScore >= primaryScore * 0.78 && secondaryId !== "balanced";
  const confidence = clamp((primaryScore - secondaryScore) / Math.max(35, primaryScore) + 0.42, 0.42, 0.96);
  const top = ordered.slice(0, 3).map(([id, score]) => ({
    ...ARCHETYPES[id],
    score: Math.round(score * 10) / 10,
    affinity: Math.round(affinities[id] * 100)
  }));

  const primary = ARCHETYPES[primaryId] || ARCHETYPES.balanced;
  const secondary = ARCHETYPES[secondaryId] || ARCHETYPES.balanced;
  const labelPT = hybrid ? `${primary.labelPT} / ${secondary.labelPT}` : primary.labelPT;
  const labelEN = hybrid ? `${primary.labelEN} / ${secondary.labelEN}` : primary.labelEN;

  return {
    id: primaryId,
    primaryId,
    secondaryId: hybrid ? secondaryId : null,
    hybrid,
    labelPT,
    labelEN,
    confidence: Math.round(confidence * 100) / 100,
    affinities,
    scores,
    top,
    metrics: {
      total: metrics.total,
      averageCost: Math.round(metrics.averageCost * 100) / 100,
      types: metrics.types,
      colors: metrics.colors,
      burstCards: metrics.burstCards,
      flashCards: metrics.flashCards,
      attackCards: metrics.attackCards,
      controlOps: Math.round(metrics.controlOps * 10) / 10,
      defensiveOps: Math.round(metrics.defensiveOps * 10) / 10,
      resourceOps: Math.round(metrics.resourceOps * 10) / 10,
      reductionDensity: Math.round(metrics.reductionDensity * 100) / 100
    },
    summaryPT: hybrid
      ? `Plano híbrido: ${primary.shortPT.toLowerCase()} + ${secondary.shortPT.toLowerCase()}.`
      : primary.shortPT,
    summaryEN: hybrid
      ? `Hybrid plan: ${primary.shortEN.toLowerCase()} + ${secondary.shortEN.toLowerCase()}.`
      : primary.shortEN
  };
}

function uniquePhysicalCards(player) {
  const cards = [
    ...(player?.deck || []),
    ...(player?.hand || []),
    ...(player?.trash || []),
    ...(player?.revealed || []),
    ...(player?.removed || []),
    ...(player?.field?.spirits || []),
    ...(player?.field?.nexuses || []),
    ...(player?.field?.other || []),
    ...(player?.burst ? [player.burst] : []),
    ...(player?.mirage ? [player.mirage] : [])
  ];
  const seen = new Set();
  const entries = [];
  for (const physical of cards) {
    const key = physical?.instanceId || `${physical?.cardId}-${entries.length}`;
    if (!physical?.cardId || seen.has(key)) continue;
    seen.add(key);
    entries.push({ cardId: physical.cardId, quantity: 1 });
  }
  return entries;
}

export function inferPlayerArchetype(match, playerId, cardIndex) {
  const stored = match?.ai?.archetypeProfile;
  if (stored && match?.ai?.playerId === playerId) return stored;
  return analyzeDeckArchetype(uniquePhysicalCards(match?.players?.[playerId]), cardIndex);
}

function cardForAction(match, action, cardIndex) {
  const instanceId = action?.instanceId || action?.move?.to?.instanceId || action?.move?.from?.instanceId;
  if (!instanceId) return null;
  const playerCards = Object.values(match?.players || {}).flatMap((player) => [
    ...(player?.hand || []),
    ...(player?.field?.spirits || []),
    ...(player?.field?.nexuses || []),
    ...(player?.field?.other || []),
    ...(player?.trash || []),
    ...(player?.burst ? [player.burst] : []),
    ...(player?.mirage ? [player.mirage] : [])
  ]);
  const physical = playerCards.find((card) => card?.instanceId === instanceId);
  return physical ? cardIndex?.get?.(physical.cardId) : null;
}

function addReason(reasons, score, ptBR, en) {
  if (!score || Math.abs(score) < 0.5) return;
  reasons.push({ score: Math.round(score * 10) / 10, ptBR, en });
}

export function archetypeActionBias(match, playerId, action, result, cardIndex, profile) {
  if (!profile) return { score: 0, reasons: [] };
  const affinity = (id) => clamp(profile.affinities?.[id] || 0);
  const card = cardForAction(match, action, cardIndex);
  const cardType = String(card?.cardType || "").toLowerCase();
  const cardCost = numeric(card?.cost);
  const reasons = [];
  let score = 0;

  const contribute = (value, ptBR, en) => {
    score += value;
    addReason(reasons, value, ptBR, en);
  };

  switch (action?.type) {
    case "DECLARE_ATTACK":
      contribute(34 * affinity("aggressive"), "Perfil agressivo favorece pressão no Life.", "Aggressive profile favors Life pressure.");
      contribute(-7 * affinity("defensive"), "Perfil defensivo preserva corpos prontos quando não há urgência.", "Defensive profile preserves ready bodies when there is no urgency.");
      break;
    case "DECLARE_BLOCK":
      contribute(30 * affinity("defensive") + 10 * affinity("control"), "Perfil defensivo/controle valoriza trocas que protegem o Life.", "Defensive/control profile values trades that protect Life.");
      break;
    case "DEPLOY_NEXUS":
      contribute(24 * affinity("resource") + 15 * affinity("control") + 8 * affinity("defensive"), "O arquétipo valoriza infraestrutura de Nexus.", "The archetype values Nexus infrastructure.");
      break;
    case "USE_MAGIC":
      contribute(27 * affinity("control") + 12 * affinity("defensive"), "O arquétipo valoriza Magic como resposta e controle.", "The archetype values Magic as interaction and control.");
      break;
    case "SET_BURST":
    case "ACTIVATE_BURST":
      contribute(21 * affinity("control") + 20 * affinity("defensive"), "Burst combina com o plano reativo do deck.", "Burst supports the deck's reactive plan.");
      break;
    case "MOVE_CORE":
      contribute(15 * affinity("resource"), "O perfil de recursos valoriza redistribuição eficiente de Cores.", "The resource profile values efficient Core redistribution.");
      break;
    case "COMBINE_BRAVE":
      contribute(58 * affinity("brave"), "O deck tem alta afinidade com combinações Brave.", "The deck has high Brave-combination affinity.");
      break;
    case "EXCHANGE_BRAVE":
      contribute(22 * affinity("brave"), "O plano Brave aceita reposicionar a combinação quando há ganho real.", "The Brave plan supports repositioning a combination when it gains value.");
      break;
    case "RESOLVE_ULTIMATE_TRIGGER":
    case "USE_TRIGGER_COUNTER":
      contribute(45 * affinity("ultimate"), "O deck foi identificado com forte sinergia de Ultimate/Trigger.", "The deck was identified with strong Ultimate/Trigger synergy.");
      break;
    case "ADVANCE_PHASE":
      if (match?.phase === "main") {
        contribute(11 * affinity("aggressive"), "O perfil agressivo valoriza converter preparação em Attack Step.", "Aggressive profile values converting setup into the Attack Step.");
      }
      break;
    case "SUMMON":
      if (cardType === "ultimate") {
        contribute(52 * affinity("ultimate"), "Invocar Ultimate avança o plano central do deck.", "Summoning an Ultimate advances the deck's central plan.");
      } else if (cardType === "brave") {
        contribute(48 * affinity("brave"), "Invocar Brave prepara a combinação principal do deck.", "Summoning a Brave prepares the deck's main combination.");
      } else if (cardCost <= 3) {
        contribute(13 * affinity("aggressive"), "Corpo barato combina com a curva agressiva do deck.", "A cheap body fits the deck's aggressive curve.");
      }
      break;
    default:
      break;
  }

  const opponentId = playerId === "player1" ? "player2" : "player1";
  const beforeOppLife = numeric(match?.players?.[opponentId]?.life);
  const afterOppLife = numeric(result?.match?.players?.[opponentId]?.life, beforeOppLife);
  const damage = Math.max(0, beforeOppLife - afterOppLife);
  if (damage > 0) {
    contribute(damage * 26 * affinity("aggressive"), "O plano agressivo valoriza dano real ao Life.", "The aggressive plan values real Life damage.");
  }

  const beforeReserve = numeric(match?.players?.[playerId]?.reserve);
  const afterReserve = numeric(result?.match?.players?.[playerId]?.reserve, beforeReserve);
  if (afterReserve > beforeReserve) {
    contribute((afterReserve - beforeReserve) * 7 * affinity("resource"), "O perfil de recursos valoriza Cores disponíveis na Reserve.", "The resource profile values available Cores in Reserve.");
  }

  return {
    score: Math.round(score * 100) / 100,
    reasons: reasons
      .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
      .slice(0, 4)
  };
}

export function archetypeLabel(profile, language = "ptBR") {
  if (!profile) return language === "en" ? "Balanced" : "Equilibrado";
  return language === "en" ? profile.labelEN : profile.labelPT;
}
