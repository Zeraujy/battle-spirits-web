import test from "node:test";
import assert from "node:assert/strict";
import { createArenaVisualControllerBridge } from "./ArenaVisualControllerBridge.js";

const index = new Map([
  ["TEST-001", {
    id: "TEST-001",
    cardType: "spirit",
    nameEN: "Test Spirit",
    namePT: "Test Spirit",
    colors: ["red"],
    cost: 3,
    levels: [{ level: 1, cores: 1, bp: 3000 }, { level: 2, cores: 3, bp: 5000 }],
    effectText: { en: "[Flash] Test effect.", ptBR: "[Flash] Efeito de teste." },
    image: "/test.webp"
  }],
  ["COUNTER-001", {
    id: "COUNTER-001",
    cardType: "magic",
    nameEN: "Counter Magic",
    namePT: "Counter Magic",
    colors: ["green"],
    cost: 1,
    effects: [{ type: "triggerCounter", timing: "triggerCounter" }],
    image: "/counter.webp"
  }],
  ["BRAVE-001", {
    id: "BRAVE-001",
    cardType: "brave",
    nameEN: "Test Brave",
    namePT: "Test Brave",
    colors: ["red"],
    cost: 2,
    levels: [{ level: 1, cores: 1, bp: 2000 }],
    image: "/brave.webp"
  }]
]);

function physical(instanceId, cores = 1) {
  return { instanceId, cardId: "TEST-001", cores: { regular: cores, soul: false }, exhausted: false };
}

function match() {
  return {
    turnNumber: 2,
    phase: "main",
    activePlayerId: "player1",
    players: {
      player1: {
        id: "player1", name: "Player", life: 5, reserve: 4, trashCores: 1,
        soulCore: { zone: "reserve", instanceId: null },
        hand: [physical("hand-1")], deck: [physical("deck-1")], trash: [],
        field: { spirits: [physical("field-1", 3)], nexuses: [], other: [] }, burst: null
      },
      player2: {
        id: "player2", name: "Opponent", life: 5, reserve: 3, trashCores: 0,
        soulCore: { zone: "reserve", instanceId: null },
        hand: [physical("hidden-1")], deck: [], trash: [],
        field: { spirits: [physical("enemy-1")], nexuses: [], other: [] }, burst: null
      }
    },
    log: ["Test log"]
  };
}

test("bridge exposes real resource state and field presentation", () => {
  const vm = createArenaVisualControllerBridge({
    match: match(), viewerPlayerId: "player1", cardIndex: index, language: "en", canMoveCores: true, canControlActor: true
  });
  assert.equal(vm.player.reserve.coreCount, 4);
  assert.equal(vm.player.reserve.soulCoreCount, 1);
  assert.equal(vm.player.battlefield.cards[0].level, 2);
  assert.equal(vm.player.battlefield.cards[0].bp, 5000);
  assert.equal(vm.player.battlefield.cards[0].name, "Test Spirit");
  assert.equal(vm.interaction.canMoveCores, true);
});

test("bridge never exposes opponent hand identity", () => {
  const vm = createArenaVisualControllerBridge({ match: match(), viewerPlayerId: "player1", cardIndex: index });
  assert.equal(vm.opponent.hand.count, 1);
  assert.equal(vm.opponent.hand.cards[0].hidden, true);
  assert.equal(vm.opponent.hand.cards[0].name, undefined);
});

test("bridge marks drag-based attack/block affordances and keeps Flash actions contextual", () => {
  const state = match();
  state.phase = "attack";
  const attackVm = createArenaVisualControllerBridge({
    match: state,
    viewerPlayerId: "player1",
    cardIndex: index,
    language: "en",
    canControlActor: true,
    selectedInstanceId: "field-1",
    attackableInstanceIds: ["field-1"]
  });
  assert.equal(attackVm.player.battlefield.cards[0].canAttack, true);
  assert.equal(attackVm.availableActions.some((action) => action.type === "DECLARE_ATTACK"), false);

  state.battle = {
    stage: "block",
    attackerInstanceId: "enemy-1",
    defenderPlayerId: "player1",
    flash: { priorityPlayerId: "player1" }
  };
  const flashVm = createArenaVisualControllerBridge({
    match: state,
    viewerPlayerId: "player1",
    cardIndex: index,
    language: "en",
    canControlActor: true,
    blockableInstanceIds: ["field-1"]
  });
  assert.equal(flashVm.player.battlefield.cards[0].canBlock, true);
  assert.ok(flashVm.availableActions.some((action) => action.type === "PASS_FLASH"));
  assert.equal(flashVm.battle.attackerInstanceId, "enemy-1");
});

test("bridge preserves Main Step affordability feedback for hand cards", () => {
  const vm = createArenaVisualControllerBridge({
    match: match(),
    viewerPlayerId: "player1",
    cardIndex: index,
    language: "en",
    canControlActor: true,
    playableInstanceIds: ["hand-1"],
    playabilityRelevant: true
  });
  assert.equal(vm.player.hand.cards[0].playabilityRelevant, true);
  assert.equal(vm.player.hand.cards[0].playable, true);
  assert.ok(vm.player.hand.cards[0].keywords.includes("Flash"));
});

test("bridge sanitizes effect decisions for the unified utility panel", () => {
  const state = match();
  state.pendingEffectDecision = {
    id: "decision-1",
    playerId: "player1",
    kind: "selectTarget",
    minimum: 1,
    maximum: 1,
    candidates: [{ instanceId: "enemy-1" }],
    continuationEvents: [{ private: true }],
    context: { private: true }
  };
  const vm = createArenaVisualControllerBridge({
    match: state,
    viewerPlayerId: "player1",
    cardIndex: index,
    language: "en",
    canControlActor: true,
    effectDecisionTitle: "Choose target",
    effectDecisionInstruction: "Select one valid card."
  });
  assert.equal(vm.effectDecision.id, "decision-1");
  assert.equal(vm.effectDecision.candidates[0].instanceId, "enemy-1");
  assert.equal(vm.effectDecision.candidates[0].name, "Test Spirit");
  assert.equal(vm.effectDecision.context, undefined);
  assert.equal(vm.effectDecision.continuationEvents, undefined);
});

test("bridge presents Ultimate Trigger and exposes Trigger Counter cards only to the responding viewer", () => {
  const state = match();
  state.players.player2.hand = [{ instanceId: "counter-1", cardId: "COUNTER-001", cores: { regular: 0, soul: false }, exhausted: false }];
  state.battle = {
    stage: "ultimateTrigger",
    attackerInstanceId: "field-1",
    defenderPlayerId: "player2",
    ultimateTrigger: {
      kind: "ultimate",
      status: "counterWindow",
      controllerPlayerId: "player1",
      counterPlayerId: "player2",
      sourceCardId: "TEST-001",
      sourceInstanceId: "field-1",
      sourceCost: 3,
      revealedCardId: "TEST-001",
      revealedInstanceId: "revealed-1",
      revealedCost: 1,
      originalHit: true,
      hit: true,
      countered: false,
      effectTextEN: "Trigger hit effect."
    }
  };

  const responder = createArenaVisualControllerBridge({
    match: state,
    viewerPlayerId: "player2",
    cardIndex: index,
    language: "en",
    canControlActor: true
  });
  assert.equal(responder.ultimateTrigger.status, "counterWindow");
  assert.equal(responder.ultimateTrigger.resultLabel, "HIT");
  assert.equal(responder.ultimateTrigger.counterCards.length, 1);
  assert.equal(responder.ultimateTrigger.counterCards[0].instanceId, "counter-1");

  const controller = createArenaVisualControllerBridge({
    match: state,
    viewerPlayerId: "player1",
    cardIndex: index,
    language: "en",
    canControlActor: false
  });
  assert.equal(controller.ultimateTrigger.counterCards.length, 0);
  assert.equal(controller.ultimateTrigger.waiting, true);
});


test("Phase 04 bridge exposes complete battle timing presentation", () => {
  const state = match();
  state.phase = "attack";
  state.battle = {
    stage: "flash1",
    attackerInstanceId: "field-1",
    attackerPlayerId: "player1",
    defenderPlayerId: "player2",
    blockerInstanceId: null,
    flash: { priorityPlayerId: "player2" }
  };

  const vm = createArenaVisualControllerBridge({
    match: state,
    viewerPlayerId: "player2",
    cardIndex: index,
    language: "en",
    canControlActor: true
  });

  assert.equal(vm.battle.stageLabel, "First Flash Timing");
  assert.equal(vm.battle.attacker.name, "Test Spirit");
  assert.equal(vm.battle.attacker.bp, 5000);
  assert.equal(vm.battle.directAttack, true);
  assert.equal(vm.battle.viewerHasFlashPriority, true);
});

test("Phase 05 bridge exposes Mirage and legal High Speed / Field Flash actions without resolving them", () => {
  const state = match();
  state.players.player1.mirage = physical("mirage-1");
  state.battle = {
    stage: "flash1",
    attackerInstanceId: "enemy-1",
    attackerPlayerId: "player2",
    defenderPlayerId: "player1",
    flash: { priorityPlayerId: "player1" }
  };

  const handVm = createArenaVisualControllerBridge({
    match: state,
    viewerPlayerId: "player1",
    cardIndex: index,
    language: "en",
    canControlActor: true,
    selectedInstanceId: "hand-1",
    legalActions: [{ type: "USE_HIGH_SPEED", instanceId: "hand-1", options: { highSpeed: true } }]
  });
  assert.equal(handVm.player.mirage.count, 1);
  assert.equal(handVm.player.mirage.cards[0].instanceId, "mirage-1");
  assert.ok(handVm.availableActions.some((action) => action.type === "USE_HIGH_SPEED"));

  const fieldVm = createArenaVisualControllerBridge({
    match: state,
    viewerPlayerId: "player1",
    cardIndex: index,
    language: "en",
    canControlActor: true,
    selectedInstanceId: "field-1",
    legalActions: [{ type: "ACTIVATE_FIELD_FLASH", instanceId: "field-1" }]
  });
  assert.ok(fieldVm.availableActions.some((action) => action.type === "ACTIVATE_FIELD_FLASH"));
});


test("Phase 05 bridge exposes Mirage manual-cost and Brave exchange/direct-combine actions from legal descriptors", () => {
  const main = match();
  const mirageVm = createArenaVisualControllerBridge({
    match: main,
    viewerPlayerId: "player1",
    cardIndex: index,
    language: "en",
    canControlActor: true,
    selectedInstanceId: "hand-1",
    legalActions: [{ type: "SET_MIRAGE", instanceId: "hand-1" }]
  });
  assert.ok(mirageVm.availableActions.some((action) => action.type === "BEGIN_MIRAGE_COST"));

  main.players.player1.hand.push({ instanceId: "brave-hand", cardId: "BRAVE-001", cores: { regular: 0, soul: false }, exhausted: false });
  const directVm = createArenaVisualControllerBridge({
    match: main,
    viewerPlayerId: "player1",
    cardIndex: index,
    language: "en",
    canControlActor: true,
    selectedInstanceId: "brave-hand",
    playableInstanceIds: ["brave-hand"],
    legalActions: [{
      type: "SUMMON",
      instanceId: "brave-hand",
      options: { directCombineHostInstanceId: "field-1" },
      hostName: "Test Spirit"
    }]
  });
  assert.ok(directVm.availableActions.some((action) => action.type === "DIRECT_COMBINE_BRAVE"));

  main.players.player1.field.other.push({
    instanceId: "brave-field",
    cardId: "BRAVE-001",
    cardType: "brave",
    cores: { regular: 1, soul: false },
    exhausted: false,
    combinedWith: "field-1"
  });
  const exchangeVm = createArenaVisualControllerBridge({
    match: main,
    viewerPlayerId: "player1",
    cardIndex: index,
    language: "en",
    canControlActor: true,
    selectedInstanceId: "brave-field",
    legalActions: [{
      type: "EXCHANGE_BRAVE",
      braveInstanceId: "brave-field",
      hostInstanceId: "enemy-host",
      hostName: "Other Host",
      options: { confirmCondition: false }
    }]
  });
  assert.ok(exchangeVm.availableActions.some((action) => action.type === "EXCHANGE_BRAVE"));
});


test("Phase 05 Burst presentation reveals the set Burst only to the deciding player", () => {
  const state = match();
  state.players.player1.burst = physical("burst-1");
  state.burstOpportunity = { playerId: "player1", cause: "lifeDecrease", sourceInstanceId: "enemy-1" };

  const owner = createArenaVisualControllerBridge({
    match: state,
    viewerPlayerId: "player1",
    cardIndex: index,
    language: "en",
    canControlActor: true
  });
  assert.equal(owner.burstOpportunity.waiting, false);
  assert.equal(owner.burstOpportunity.hidden, false);
  assert.equal(owner.burstOpportunity.card.name, "Test Spirit");

  const opponent = createArenaVisualControllerBridge({
    match: state,
    viewerPlayerId: "player2",
    cardIndex: index,
    language: "en",
    canControlActor: false
  });
  assert.equal(opponent.burstOpportunity.waiting, true);
  assert.equal(opponent.burstOpportunity.hidden, true);
  assert.equal(opponent.burstOpportunity.card, null);
});


test("Phase 06 bridge presents opening setup, Mulligan and authority without changing setup rules", () => {
  const state = match();
  state.turnNumber = 1;
  state.phase = "start";
  state.firstPlayerId = "player1";
  state.players.player1.mulliganUsed = false;

  const vm = createArenaVisualControllerBridge({
    match: state,
    viewerPlayerId: "player1",
    cardIndex: index,
    language: "en",
    actorId: "player1",
    canControlActor: true,
    legalActions: [{ type: "MULLIGAN", actorId: "player1" }]
  });

  assert.equal(vm.setup.openingSetup, true);
  assert.equal(vm.setup.mulliganAvailable, true);
  assert.equal(vm.setup.firstPlayerName, "Player");
  assert.equal(vm.authority.state, "your-action");
});

test("Phase 06 authority status distinguishes CPU/opponent-controlled states", () => {
  const state = match();
  state.ai = { playerId: "player2", humanPlayerId: "player1" };
  state.activePlayerId = "player2";

  const vm = createArenaVisualControllerBridge({
    match: state,
    viewerPlayerId: "player1",
    cardIndex: index,
    language: "en",
    actorId: "player2",
    canControlActor: false
  });

  assert.equal(vm.authority.state, "cpu");
  assert.equal(vm.authority.blocking, true);
});
