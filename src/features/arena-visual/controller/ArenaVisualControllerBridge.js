import {
  findPhysicalCard,
  getCurrentLevel,
  getDatabaseCard,
  getEffectiveBP
} from "../../../game/selectors.js";
import { getLegalBraveHosts } from "../../../game/brave.js";
import { getTriggerCounterCards } from "../../../game/specialRules.js";
import {
  getCardName,
  resolveCardImage
} from "../../../game/cardAdapter.js";

function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

function effectText(card, language) {
  if (!card) return "";
  if (typeof card.effectText === "string") return card.effectText;
  return language === "en"
    ? (card.effectText?.en || card.textEN || card.effectText?.ptBR || card.textPT || card.description || "")
    : (card.effectText?.ptBR || card.textPT || card.effectText?.en || card.textEN || card.description || "");
}

function keywordList(card, rulesText = "") {
  const bracketed = [...String(rulesText || "").matchAll(/\[([^\]]{1,80})\]/g)]
    .map((match) => match[1]?.trim())
    .filter(Boolean);
  const values = [
    ...(Array.isArray(card?.keywords) ? card.keywords : []),
    ...(Array.isArray(card?.abilities) ? card.abilities.map((ability) => ability?.keyword || ability?.name).filter(Boolean) : []),
    ...(Array.isArray(card?.effects) ? card.effects.map((effect) => effect?.keyword || effect?.name).filter(Boolean) : []),
    ...bracketed
  ];
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim()))];
}

function primaryColor(card) {
  return card?.color || card?.colors?.[0] || card?.symbols?.[0] || null;
}

function cardPresentation({
  match,
  physical,
  cardIndex,
  language,
  hidden = false,
  field = false,
  playableInstanceIds = null,
  attackableInstanceIds = null,
  blockableInstanceIds = null,
  playabilityRelevant = false
}) {
  if (hidden || !physical) {
    return {
      id: physical?.instanceId || null,
      instanceId: physical?.instanceId || null,
      hidden: true
    };
  }

  const card = getDatabaseCard(cardIndex, physical);
  const level = field ? getCurrentLevel(card, physical) : null;
  const rulesText = effectText(card, language);
  const instanceId = physical.instanceId;

  return {
    id: instanceId,
    instanceId,
    cardId: physical.cardId || card?.id || null,
    name: getCardName(card, language) || card?.id || "Card",
    image: resolveCardImage(card),
    hidden: false,
    exhausted: Boolean(physical.exhausted),
    level: level?.level ?? null,
    bp: field ? getEffectiveBP(match, cardIndex, physical) : null,
    coreCount: Number(physical.cores?.regular || 0),
    soulCoreCount: physical.cores?.soul ? 1 : 0,
    cardType: card?.cardType || physical.cardType || null,
    type: card?.cardType || physical.cardType || null,
    cost: Number.isFinite(Number(card?.cost)) ? Number(card.cost) : null,
    description: rulesText,
    effectText: rulesText,
    rulesText,
    effects: Array.isArray(card?.effects) ? card.effects : [],
    color: primaryColor(card),
    colors: Array.isArray(card?.colors) ? card.colors : (primaryColor(card) ? [primaryColor(card)] : []),
    keywords: keywordList(card, rulesText),
    rarity: card?.rarity || null,
    combinedWith: physical.combinedWith || null,
    pendingDestruction: Boolean(physical.pendingDestruction),
    playable: playableInstanceIds ? playableInstanceIds.has(instanceId) : null,
    playabilityRelevant: Boolean(playabilityRelevant),
    canAttack: attackableInstanceIds ? attackableInstanceIds.has(instanceId) : false,
    canBlock: blockableInstanceIds ? blockableInstanceIds.has(instanceId) : false,
    battleRole: match?.battle?.attackerInstanceId === physical.instanceId
      ? "attacker"
      : (match?.battle?.blockerInstanceId === physical.instanceId ? "blocker" : null)
  };
}

function fieldCards({ match, player, cardIndex, language, playableInstanceIds, attackableInstanceIds, blockableInstanceIds, playabilityRelevant }) {
  const field = player?.field || {};
  const combinedBraves = new Map(
    arrayOrEmpty(field.other)
      .filter((physical) => physical?.combinedWith)
      .map((physical) => [physical.combinedWith, physical])
  );

  const visible = [
    ...arrayOrEmpty(field.spirits),
    ...arrayOrEmpty(field.nexuses),
    ...arrayOrEmpty(field.other).filter((physical) => !physical?.combinedWith)
  ];

  return visible.map((physical) => {
    const presented = cardPresentation({ match, physical, cardIndex, language, field: true, playableInstanceIds, attackableInstanceIds, blockableInstanceIds, playabilityRelevant });
    const attachedPhysical = combinedBraves.get(physical.instanceId);
    if (!attachedPhysical) return presented;
    return {
      ...presented,
      attachedBrave: cardPresentation({ match, physical: attachedPhysical, cardIndex, language, field: true, playableInstanceIds, attackableInstanceIds, blockableInstanceIds, playabilityRelevant })
    };
  });
}

function visibleCards({ match, cards, cardIndex, language, playableInstanceIds, attackableInstanceIds, blockableInstanceIds, playabilityRelevant }) {
  return arrayOrEmpty(cards).map((physical) => cardPresentation({ match, physical, cardIndex, language, playableInstanceIds, attackableInstanceIds, blockableInstanceIds, playabilityRelevant }));
}

function hiddenCards(cards) {
  return arrayOrEmpty(cards).map((physical) => cardPresentation({ physical, hidden: true }));
}

function normalizeLog(entries) {
  return arrayOrEmpty(entries).map((entry, index) => {
    if (typeof entry === "string") return { id: `log-${index}`, text: entry };
    return {
      id: entry?.id || `log-${index}`,
      turn: entry?.turnNumber ?? entry?.turn ?? null,
      phase: entry?.phase || null,
      text: entry?.text || entry?.message || entry?.label || "Event"
    };
  });
}

function sideModel({ match, playerId, cardIndex, language, hidePrivate = false, playableInstanceIds, attackableInstanceIds, blockableInstanceIds, playabilityRelevant }) {
  const player = match?.players?.[playerId] || {};
  const soulZone = player.soulCore?.zone || null;

  return {
    hand: {
      count: arrayOrEmpty(player.hand).length,
      cards: hidePrivate
        ? hiddenCards(player.hand)
        : visibleCards({ match, cards: player.hand, cardIndex, language, playableInstanceIds, attackableInstanceIds, blockableInstanceIds, playabilityRelevant })
    },
    battlefield: {
      count: fieldCards({ match, player, cardIndex, language, playableInstanceIds, attackableInstanceIds, blockableInstanceIds, playabilityRelevant }).length,
      cards: fieldCards({ match, player, cardIndex, language, playableInstanceIds, attackableInstanceIds, blockableInstanceIds, playabilityRelevant })
    },
    life: {
      count: Number(player.life || 0),
      coreCount: Number(player.life || 0),
      soulCoreCount: 0
    },
    burst: {
      count: player.burst ? 1 : 0,
      cards: player.burst
        ? [hidePrivate
          ? cardPresentation({ physical: player.burst, hidden: true })
          : cardPresentation({ match, physical: player.burst, cardIndex, language, playableInstanceIds, attackableInstanceIds, blockableInstanceIds, playabilityRelevant })]
        : []
    },
    mirage: {
      count: player.mirage ? 1 : 0,
      playerId,
      cards: player.mirage
        ? [cardPresentation({ match, physical: player.mirage, cardIndex, language, playableInstanceIds, attackableInstanceIds, blockableInstanceIds, playabilityRelevant })]
        : []
    },
    reserve: {
      count: Number(player.reserve || 0) + (soulZone === "reserve" ? 1 : 0),
      coreCount: Number(player.reserve || 0),
      soulCoreCount: soulZone === "reserve" ? 1 : 0
    },
    deck: {
      count: arrayOrEmpty(player.deck).length,
      cards: []
    },
    trash: {
      count: arrayOrEmpty(player.trash).length,
      cards: visibleCards({ match, cards: player.trash, cardIndex, language, playableInstanceIds, attackableInstanceIds, blockableInstanceIds, playabilityRelevant })
    },
    coreTrash: {
      count: Number(player.trashCores || 0) + (soulZone === "trash" ? 1 : 0),
      coreCount: Number(player.trashCores || 0),
      soulCoreCount: soulZone === "trash" ? 1 : 0
    },
    void: {
      count: 0,
      coreCount: 0,
      soulCoreCount: soulZone === "void" ? 1 : 0
    }
  };
}

function pendingActionPresentation(match, playerId, language, cardIndex) {
  const pendingPlay = match?.pendingManualPlay?.playerId === playerId ? match.pendingManualPlay : null;
  const pendingCost = match?.pendingManualCost?.playerId === playerId ? match.pendingManualCost : null;
  const pending = pendingPlay || pendingCost;
  if (!pending) return null;

  const paid = Number(pending.paidRegular || 0) + (pending.paidSoul ? 1 : 0);
  const minimum = pendingPlay ? Number(pending.minimumCores || 0) : 0;
  const physicalContext = pending.instanceId ? findPhysicalCard(match, pending.instanceId) : null;
  const currentCores = physicalContext?.card
    ? Number(physicalContext.card.cores?.regular || 0) + (physicalContext.card.cores?.soul ? 1 : 0)
    : 0;
  const databaseCard = physicalContext?.card ? getDatabaseCard(cardIndex, physicalContext.card) : null;
  const payableCost = Number(pending.payableCost || 0);

  return {
    kind: pendingPlay ? "play" : "cost",
    instanceId: pending.instanceId || null,
    label: pendingPlay
      ? (language === "en" ? "Summon payment" : "Pagamento da invocação")
      : (language === "en" ? "Manual cost payment" : "Pagamento manual"),
    cardName: databaseCard ? getCardName(databaseCard, language) : "",
    printedCost: Number(pending.printedCost ?? payableCost),
    reductionApplied: Number(pending.reductionApplied || 0),
    paid,
    payableCost,
    minimumCores: minimum,
    currentCores,
    ready: paid === payableCost && (!pendingPlay || currentCores >= minimum)
  };
}


function decisionCandidatePresentation(match, candidate, cardIndex, language) {
  if (!candidate || typeof candidate !== "object") return null;
  const instanceId = candidate.instanceId || null;
  const ctx = instanceId ? findPhysicalCard(match, instanceId) : null;
  const card = ctx?.card ? getDatabaseCard(cardIndex, ctx.card) : (candidate.cardId ? cardIndex?.get?.(candidate.cardId) : null);
  return {
    id: candidate.triggerId || instanceId || candidate.cardId || null,
    instanceId,
    triggerId: candidate.triggerId || null,
    cardId: candidate.cardId || ctx?.card?.cardId || card?.id || null,
    name: card ? getCardName(card, language) : (candidate.labelEN || candidate.labelPT || candidate.cardId || instanceId || "Choice"),
    image: card ? resolveCardImage(card) : null,
    bp: ctx?.card && ["spirits", "nexuses", "other"].includes(ctx.zone)
      ? Number(getEffectiveBP(match, cardIndex, ctx.card) || 0)
      : null,
    label: language === "en"
      ? (candidate.labelEN || candidate.labelPT || candidate.event || null)
      : (candidate.labelPT || candidate.labelEN || candidate.event || null),
    event: candidate.event || null,
    zone: ctx?.zone || candidate.zone || null
  };
}

function effectDecisionPresentation({ match, playerId, cardIndex, language, title = "", instruction = "" }) {
  const decision = match?.pendingEffectDecision;
  if (!decision) return null;
  return {
    id: decision.id,
    kind: decision.kind,
    language,
    playerId: decision.playerId,
    waiting: decision.playerId !== playerId,
    title: title || (language === "en" ? "Effect Resolution" : "Resolução de Efeito"),
    instruction,
    minimum: Number(decision.minimum || 0),
    maximum: Number(decision.maximum || 1),
    allowZero: Boolean(decision.allowZero || Number(decision.minimum || 0) === 0),
    maxTotalBP: decision.maxTotalBP == null ? null : Number(decision.maxTotalBP),
    totalCores: Number(decision.totalCores || 0),
    exactTotal: decision.exactTotal !== false,
    sourceCoreZone: decision.sourceCoreZone || "reserve",
    options: arrayOrEmpty(decision.options).map((option, index) => ({
      id: String(option?.id ?? index),
      label: language === "en"
        ? (option?.labelEN || option?.labelPT || `Option ${index + 1}`)
        : (option?.labelPT || option?.labelEN || `Opção ${index + 1}`)
    })),
    candidates: arrayOrEmpty(decision.candidates)
      .map((candidate) => decisionCandidatePresentation(match, candidate, cardIndex, language))
      .filter(Boolean)
  };
}

function ultimateTriggerPresentation({ match, playerId, cardIndex, language }) {
  const battle = match?.battle;
  const trigger = battle?.ultimateTrigger;
  if (!battle || battle.stage !== "ultimateTrigger" || !trigger) return null;

  const sourceCard = trigger.sourceCardId ? cardIndex?.get?.(trigger.sourceCardId) : null;
  const revealedCard = trigger.revealedCardId ? cardIndex?.get?.(trigger.revealedCardId) : null;
  const isCounterWindow = trigger.status === "counterWindow";
  const resolvingPlayerId = isCounterWindow ? trigger.counterPlayerId : trigger.controllerPlayerId;
  const resultLabel = trigger.countered ? "COUNTERED" : trigger.hit ? "HIT" : "GUARD";
  const statusLabel = isCounterWindow
    ? (language === "en" ? "TRIGGER COUNTER WINDOW" : "JANELA DE TRIGGER COUNTER")
    : trigger.countered
      ? (language === "en" ? "TRIGGER COUNTERED" : "TRIGGER ANULADO")
      : trigger.hit
        ? (language === "en" ? "TRIGGER HIT" : "TRIGGER ACERTOU")
        : (language === "en" ? "TRIGGER GUARDED" : "TRIGGER DEFENDIDO");

  const counterCards = isCounterWindow && trigger.counterPlayerId === playerId
    ? getTriggerCounterCards(match, playerId, cardIndex).map(({ physical, card }) => ({
        instanceId: physical.instanceId,
        cardId: physical.cardId || card?.id || null,
        name: getCardName(card, language) || card?.id || "Trigger Counter",
        image: resolveCardImage(card),
        cost: Number.isFinite(Number(card?.cost)) ? Number(card.cost) : null
      }))
    : [];

  return {
    language,
    kind: trigger.kind || "ultimate",
    status: trigger.status || "revealed",
    statusLabel,
    resultLabel,
    waiting: Boolean(resolvingPlayerId && resolvingPlayerId !== playerId),
    controllerPlayerId: trigger.controllerPlayerId || null,
    counterPlayerId: trigger.counterPlayerId || null,
    countered: Boolean(trigger.countered),
    hit: Boolean(trigger.hit),
    originalHit: Boolean(trigger.originalHit),
    sourceCost: Number.isFinite(Number(trigger.sourceCost)) ? Number(trigger.sourceCost) : null,
    revealedCost: trigger.revealedCost == null ? null : Number(trigger.revealedCost),
    effectText: language === "en"
      ? (trigger.effectTextEN || trigger.effectTextPT || "")
      : (trigger.effectTextPT || trigger.effectTextEN || ""),
    source: {
      cardId: trigger.sourceCardId || sourceCard?.id || null,
      name: sourceCard ? getCardName(sourceCard, language) : (trigger.sourceCardId || "Ultimate"),
      image: sourceCard ? resolveCardImage(sourceCard) : null
    },
    revealed: {
      cardId: trigger.revealedCardId || revealedCard?.id || null,
      name: trigger.status === "emptyDeck"
        ? (language === "en" ? "Empty Deck" : "Deck vazio")
        : (revealedCard ? getCardName(revealedCard, language) : (trigger.revealedCardId || "—")),
      image: revealedCard ? resolveCardImage(revealedCard) : null
    },
    criticalHit: trigger.criticalHit ? {
      eligible: Boolean(trigger.criticalHit.eligible),
      text: language === "en"
        ? (trigger.criticalHit.textEN || trigger.criticalHit.textPT || "")
        : (trigger.criticalHit.textPT || trigger.criticalHit.textEN || "")
    } : null,
    counterCards
  };
}

function burstOpportunityPresentation(match, playerId, cardIndex, language) {
  const opportunity = match?.burstOpportunity;
  if (!opportunity?.playerId) return null;
  const owner = match?.players?.[opportunity.playerId];
  const physical = owner?.burst || null;
  const waiting = opportunity.playerId !== playerId;
  const card = !waiting && physical ? getDatabaseCard(cardIndex, physical) : null;
  return {
    playerId: opportunity.playerId,
    waiting,
    hidden: waiting || !card,
    cause: opportunity.cause || opportunity.event || null,
    sourceInstanceId: opportunity.sourceInstanceId || null,
    card: card ? {
      instanceId: physical.instanceId,
      cardId: physical.cardId || card.id || null,
      name: getCardName(card, language) || card.id || "Burst",
      image: resolveCardImage(card),
      color: primaryColor(card)
    } : null
  };
}

function setupPresentation({ match, playerId, legalActions, language }) {
  const player = match?.players?.[playerId];
  const openingSetup = Boolean(match?.turnNumber === 1 && match?.phase === "start" && player);
  if (!openingSetup) return null;
  const mulliganAvailable = arrayOrEmpty(legalActions).some((entry) => entry?.type === "MULLIGAN");
  return {
    openingSetup: true,
    handCount: arrayOrEmpty(player.hand).length,
    life: Number(player.life || 0),
    reserve: Number(player.reserve || 0),
    soulCoreZone: player.soulCore?.zone || null,
    firstPlayerId: match.firstPlayerId || match.activePlayerId || null,
    firstPlayerName: match.players?.[match.firstPlayerId || match.activePlayerId]?.name || "",
    mulliganAvailable,
    mulliganUsed: Boolean(player.mulliganUsed),
    language
  };
}

function authorityPresentation({ match, playerId, actorId, canControlActor, language }) {
  if (!match || match.winnerId) return { hidden: true };
  const en = language === "en";
  if (actorId === playerId && canControlActor) {
    return {
      hidden: false,
      state: "your-action",
      blocking: false,
      title: en ? "Your action" : "Sua ação",
      detail: match.pendingEffectDecision
        ? (en ? "Resolve the pending effect decision." : "Resolva a decisão de efeito pendente.")
        : match.burstOpportunity
          ? (en ? "Resolve the Burst window." : "Resolva a janela de Burst.")
          : match.battle?.flash?.priorityPlayerId === playerId
            ? (en ? "Flash priority." : "Prioridade de Flash.")
            : ""
    };
  }
  const actorName = match.players?.[actorId]?.name || (en ? "Opponent" : "Adversário");
  const cpu = match.ai?.playerId === actorId;
  return {
    hidden: false,
    state: cpu ? "cpu" : "waiting",
    blocking: true,
    title: cpu ? (en ? "CPU thinking…" : "CPU pensando…") : (en ? `Waiting for ${actorName}` : `Aguardando ${actorName}`),
    detail: match.pendingEffectDecision
      ? (en ? "Effect resolution in progress." : "Resolução de efeito em andamento.")
      : match.battle
        ? (en ? "Battle timing is controlled by the current actor." : "O timing de batalha pertence ao jogador atual.")
        : ""
  };
}

function battleCardPresentation(match, instanceId, cardIndex, language) {
  if (!instanceId) return null;
  const ctx = findPhysicalCard(match, instanceId);
  if (!ctx?.card) return null;
  const card = getDatabaseCard(cardIndex, ctx.card);
  return {
    instanceId,
    cardId: ctx.card.cardId || card?.id || null,
    name: getCardName(card, language) || card?.id || "Card",
    image: resolveCardImage(card),
    color: primaryColor(card),
    bp: Number(getEffectiveBP(match, cardIndex, ctx.card) || 0),
    exhausted: Boolean(ctx.card.exhausted),
    pendingDestruction: Boolean(ctx.card.pendingDestruction)
  };
}

function battlePresentation(match, playerId, cardIndex, language) {
  const battle = match?.battle;
  if (!battle) return null;
  const attacker = battleCardPresentation(match, battle.attackerInstanceId, cardIndex, language);
  const blocker = battleCardPresentation(match, battle.blockerInstanceId, cardIndex, language);
  const stageLabels = {
    attack: language === "en" ? "Attack Declared" : "Ataque Declarado",
    ultimateTrigger: language === "en" ? "Ultimate Trigger" : "Ultimate Trigger",
    flash1: language === "en" ? "First Flash Timing" : "Primeiro Flash Timing",
    block: language === "en" ? "Block Timing" : "Block Timing",
    flash2: language === "en" ? "Second Flash Timing" : "Segundo Flash Timing",
    resolve: language === "en" ? "Battle Resolution" : "Resolução da Batalha",
    end: language === "en" ? "Battle End" : "Fim da Batalha"
  };
  const restrictions = [];
  if (attacker?.pendingDestruction) restrictions.push(language === "en" ? "Attacker is pending destruction." : "O atacante está pendente de destruição.");
  if (blocker?.pendingDestruction) restrictions.push(language === "en" ? "Blocker is pending destruction." : "O bloqueador está pendente de destruição.");
  if (battle.stage === "block" && !battle.blockerInstanceId) restrictions.push(language === "en" ? "Defender may block or decline." : "O defensor pode bloquear ou não bloquear.");

  return {
    stage: battle.stage || null,
    stageLabel: stageLabels[battle.stage] || (language === "en" ? "Battle" : "Batalha"),
    attackerInstanceId: battle.attackerInstanceId || null,
    blockerInstanceId: battle.blockerInstanceId || null,
    attacker,
    blocker,
    attackerPlayerId: battle.attackerPlayerId || null,
    defenderPlayerId: battle.defenderPlayerId || null,
    directAttack: Boolean(battle.attackerInstanceId && !battle.blockerInstanceId),
    flashPriorityPlayerId: battle.flash?.priorityPlayerId || null,
    priorityPlayerName: battle.flash?.priorityPlayerId ? match?.players?.[battle.flash.priorityPlayerId]?.name || "" : "",
    viewerHasFlashPriority: battle.flash?.priorityPlayerId === playerId,
    restrictions
  };
}

function legalActionMatches(legalActions, type, instanceId = null) {
  return arrayOrEmpty(legalActions).filter((entry) => {
    if (entry?.type !== type) return false;
    if (!instanceId) return true;
    return entry.instanceId === instanceId || entry.braveInstanceId === instanceId;
  });
}

function createContextActions({ match, playerId, selectedInstanceId, cardIndex, canControlActor, language, playableInstanceIds = null, legalActions = [] }) {
  if (!playerId || !canControlActor) return [];

  if (match?.pendingEffectDecision) return [];

  if (match?.burstOpportunity?.playerId === playerId) {
    return [
      { id: "activate-burst", type: "ACTIVATE_BURST", label: language === "en" ? "Activate Burst" : "Ativar Burst", emphasis: true },
      { id: "pass-burst", type: "PASS_BURST", label: language === "en" ? "Pass" : "Passar", tone: "quiet" }
    ];
  }

  if (match?.pendingManualPlay?.playerId === playerId) {
    return [
      { id: "confirm-manual-play", type: "CONFIRM_MANUAL_PLAY", label: language === "en" ? "Confirm" : "Confirmar", emphasis: true },
      { id: "cancel-manual-play", type: "CANCEL_MANUAL_PLAY", label: language === "en" ? "Cancel" : "Cancelar", tone: "quiet" }
    ];
  }

  if (match?.pendingManualCost?.playerId === playerId) {
    return [
      { id: "confirm-manual-cost", type: "CONFIRM_MANUAL_COST", label: language === "en" ? "Confirm" : "Confirmar", emphasis: true },
      { id: "cancel-manual-cost", type: "CANCEL_MANUAL_COST", label: language === "en" ? "Cancel" : "Cancelar", tone: "quiet" }
    ];
  }

  const battle = match?.battle || null;
  const globalBattleActions = [];
  if (battle?.flash?.priorityPlayerId === playerId) {
    globalBattleActions.push({ id: "pass-flash", type: "PASS_FLASH", label: language === "en" ? "Pass Flash" : "Passar Flash", emphasis: true, battleEssential: true });
  }
  if (battle?.stage === "block" && battle?.defenderPlayerId === playerId) {
    globalBattleActions.push({ id: "decline-block", type: "DECLINE_BLOCK", label: language === "en" ? "No Block" : "Não Bloquear", tone: "quiet", battleEssential: true });
  }
  if (battle?.stage === "resolve") {
    globalBattleActions.push({ id: "resolve-battle", type: "RESOLVE_BATTLE", label: language === "en" ? "Resolve Battle" : "Resolver Batalha", emphasis: true });
  }

  if (!selectedInstanceId) return globalBattleActions;
  const selected = findPhysicalCard(match, selectedInstanceId);
  if (!selected || selected.playerId !== playerId) return [];
  const selectedCard = getDatabaseCard(cardIndex, selected.card);
  const selectedLegalActions = arrayOrEmpty(legalActions).filter((entry) =>
    entry?.instanceId === selectedInstanceId ||
    entry?.braveInstanceId === selectedInstanceId ||
    entry?.hostInstanceId === selectedInstanceId
  );
  const inMain = match?.phase === "main" && !match?.battle && match?.activePlayerId === playerId;
  const inFlash = match?.battle?.flash?.priorityPlayerId === playerId;

if (selected.zone === "hand") {
  const actions = [];
  const type = selectedCard?.cardType;
  const canPlaySelected = !playableInstanceIds || playableInstanceIds.has(selectedInstanceId);
  const legalTypes = new Set(selectedLegalActions.map((entry) => entry.type));

  if (canPlaySelected && inMain && ["spirit", "ultimate", "brave", "nexus"].includes(type)) {
    actions.push({
      id: "play-selected-card",
      type: "PLAY_HAND_CARD",
      label: language === "en" ? "Play Card" : "Jogar Carta",
      instanceId: selectedInstanceId,
      emphasis: true
    });
  }

  const legalMagic = selectedLegalActions.find((entry) => entry.type === "USE_MAGIC");
  if (legalMagic && (inMain || inFlash) && type === "magic") {
    actions.push({
      id: `use-magic-${legalMagic.options?.mode || (inFlash ? "flash" : "main")}`,
      type: "BEGIN_MAGIC_COST",
      label: inFlash ? (language === "en" ? "Use Flash" : "Usar Flash") : (language === "en" ? "Use Magic" : "Usar Magic"),
      instanceId: selectedInstanceId,
      options: { mode: legalMagic.options?.mode || (inFlash ? "flash" : "main") },
      emphasis: true
    });
  }

  if (legalTypes.has("USE_HIGH_SPEED")) {
    actions.push({
      id: "use-high-speed",
      type: "USE_HIGH_SPEED",
      label: language === "en" ? "Use High Speed" : "Usar High Speed",
      instanceId: selectedInstanceId,
      options: selectedLegalActions.find((entry) => entry.type === "USE_HIGH_SPEED")?.options || { highSpeed: true },
      emphasis: true
    });
  }

  if (inMain && legalTypes.has("SET_BURST")) {
    actions.push({
      id: "set-selected-burst",
      type: "SET_BURST_CARD",
      label: language === "en" ? "Set Burst" : "Definir Burst",
      instanceId: selectedInstanceId
    });
  }

  if (inMain && legalTypes.has("SET_MIRAGE")) {
    actions.push({
      id: "set-selected-mirage",
      type: "BEGIN_MIRAGE_COST",
      label: language === "en" ? "Set Mirage" : "Definir Mirage",
      instanceId: selectedInstanceId
    });
  }

  for (const directCombine of selectedLegalActions.filter((entry) => entry.type === "SUMMON" && entry.options?.directCombineHostInstanceId)) {
    actions.push({
      id: `direct-combine-${directCombine.options.directCombineHostInstanceId}`,
      type: "DIRECT_COMBINE_BRAVE",
      label: `${language === "en" ? "Direct Combine" : "Direct Combine"} → ${directCombine.hostName || directCombine.options.directCombineHostInstanceId}`,
      instanceId: selectedInstanceId,
      hostInstanceId: directCombine.options.directCombineHostInstanceId,
      options: directCombine.options
    });
  }

  return [...actions, ...globalBattleActions].slice(0, 7);
}

  const fieldFlashAction = selectedLegalActions.find((entry) => entry.type === "ACTIVATE_FIELD_FLASH");
  if (fieldFlashAction) {
    globalBattleActions.unshift({
      id: "activate-field-flash",
      type: "ACTIVATE_FIELD_FLASH",
      label: language === "en" ? "Use Field Flash" : "Usar Field Flash",
      instanceId: selectedInstanceId,
      emphasis: true
    });
  }

  if (!inMain) return globalBattleActions;

  if (selectedCard?.cardType === "brave" && selected.zone === "other") {
    if (selected.card?.combinedWith) {
      const actions = [{
        id: "separate-brave",
        type: "SEPARATE_BRAVE",
        label: language === "en" ? "Separate Brave" : "Separar Brave",
        braveInstanceId: selectedInstanceId
      }];
      for (const exchange of legalActionMatches(legalActions, "EXCHANGE_BRAVE", selectedInstanceId)) {
        actions.push({
          id: `exchange-${exchange.hostInstanceId}`,
          type: "EXCHANGE_BRAVE",
          label: `${language === "en" ? "Exchange Brave" : "Trocar Brave"} → ${exchange.hostName || exchange.hostInstanceId}`,
          braveInstanceId: selectedInstanceId,
          hostInstanceId: exchange.hostInstanceId,
          options: exchange.options || {}
        });
      }
      return actions;
    }

    return getLegalBraveHosts(match, playerId, selectedInstanceId, cardIndex, { includeManual: true })
      .map((entry) => ({
        id: `combine-${entry.physical.instanceId}`,
        type: "COMBINE_BRAVE",
        label: `${language === "en" ? "Combine" : "Combinar"} → ${getCardName(entry.card, language)}`,
        braveInstanceId: selectedInstanceId,
        hostInstanceId: entry.physical.instanceId,
        options: { confirmCondition: Boolean(entry.manual) }
      }));
  }

  if (selected.zone === "spirits") {
    const attached = arrayOrEmpty(match.players?.[playerId]?.field?.other).find((brave) => brave?.combinedWith === selectedInstanceId);
    if (attached) {
      const actions = [{
        id: "separate-attached-brave",
        type: "SEPARATE_BRAVE",
        label: language === "en" ? "Separate Brave" : "Separar Brave",
        braveInstanceId: attached.instanceId
      }];
      for (const exchange of legalActionMatches(legalActions, "EXCHANGE_BRAVE", attached.instanceId)) {
        actions.push({
          id: `exchange-attached-${exchange.hostInstanceId}`,
          type: "EXCHANGE_BRAVE",
          label: `${language === "en" ? "Exchange Brave" : "Trocar Brave"} → ${exchange.hostName || exchange.hostInstanceId}`,
          braveInstanceId: attached.instanceId,
          hostInstanceId: exchange.hostInstanceId,
          options: exchange.options || {}
        });
      }
      return actions;
    }
  }

  return globalBattleActions;
}

export function createArenaVisualControllerBridge({
  match,
  viewerPlayerId,
  opponentPlayerId,
  cardIndex,
  language = "en",
  canMoveCores = false,
  canControlActor = false,
  actorId = null,
  selectedInstanceId = null,
  chatMessages = [],
  showAdvanceStep = true,
  canAdvanceStep = false,
  advanceStepLabel = "Avançar",
  effectDecisionTitle = "",
  effectDecisionInstruction = "",
  playableInstanceIds = [],
  attackableInstanceIds = [],
  blockableInstanceIds = [],
  playabilityRelevant = false,
  legalActions = [],
  onlineStatus = null,
  manualPolicy = null
} = {}) {
  const playerId = viewerPlayerId || Object.keys(match?.players || {})[0] || null;
  const resolvedOpponentId = opponentPlayerId || Object.keys(match?.players || {}).find((id) => id !== playerId) || null;
  const activePlayer = match?.players?.[match?.activePlayerId];
  const priorityId = match?.battle?.flash?.priorityPlayerId || null;
  const playableSet = new Set(playableInstanceIds || []);
  const attackableSet = new Set(attackableInstanceIds || []);
  const blockableSet = new Set(blockableInstanceIds || []);

  return {
    playmatId: "default",
    player: sideModel({
      match, playerId, cardIndex, language,
      playableInstanceIds: playableSet,
      attackableInstanceIds: attackableSet,
      blockableInstanceIds: blockableSet,
      playabilityRelevant
    }),
    opponent: sideModel({ match, playerId: resolvedOpponentId, cardIndex, language, hidePrivate: true }),
    currentPhase: match?.phase || "start",
    turnNumber: Number(match?.turnNumber || 1),
    activePlayerName: activePlayer?.name || match?.activePlayerId || "",
    priorityLabel: priorityId
      ? (priorityId === playerId ? "Your priority" : (match?.players?.[priorityId]?.name || "Opponent priority"))
      : (actorId === playerId && canControlActor ? "Your action" : "Waiting"),
    logEntries: normalizeLog(match?.log || match?.actionLog || []),
    chatMessages,
    pendingAction: pendingActionPresentation(match, playerId, language, cardIndex),
    availableActions: createContextActions({
      match,
      playerId,
      selectedInstanceId,
      cardIndex,
      canControlActor,
      language,
      playableInstanceIds: playableSet,
      legalActions
    }),
    showAdvanceStep,
    canAdvanceStep,
    advanceStepLabel,
    advanceStepAction: showAdvanceStep ? {
      id: "advance-phase",
      type: "ADVANCE_PHASE",
      label: advanceStepLabel,
      enabled: Boolean(canAdvanceStep)
    } : null,
    battle: battlePresentation(match, playerId, cardIndex, language),
    burstOpportunity: burstOpportunityPresentation(match, playerId, cardIndex, language),
    ultimateTrigger: ultimateTriggerPresentation({ match, playerId, cardIndex, language }),
    effectDecision: effectDecisionPresentation({
      match,
      playerId,
      cardIndex,
      language,
      title: effectDecisionTitle,
      instruction: effectDecisionInstruction
    }),
    setup: setupPresentation({ match, playerId, legalActions, language }),
    authority: authorityPresentation({ match, playerId, actorId, canControlActor, language }),
    online: onlineStatus,
    manual: {
      canUse: manualPolicy ? Boolean(manualPolicy.canUse) : Boolean(canControlActor),
      reason: manualPolicy?.reason || "",
      mode: manualPolicy?.mode || null,
      actorId: actorId || playerId,
      selectedInstanceId: selectedInstanceId || null,
      selectedZone: selectedInstanceId ? (findPhysicalCard(match, selectedInstanceId)?.zone || null) : null,
      revealed: arrayOrEmpty(match?.players?.[playerId]?.revealed).map((physical) =>
        cardPresentation({ match, physical, cardIndex, language })
      )
    },
    interaction: {
      viewerPlayerId: playerId,
      opponentPlayerId: resolvedOpponentId,
      canMoveCores: Boolean(canMoveCores),
      canControlActor: Boolean(canControlActor)
    }
  };
}

export default createArenaVisualControllerBridge;
