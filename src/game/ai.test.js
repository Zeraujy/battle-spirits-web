import test from "node:test";
import assert from "node:assert/strict";

import { normalizeCard, makeCardIndex } from "./cardAdapter.js";
import { createMatch, makePhysicalCard } from "./state.js";
import { applyGameAction } from "./reducer.js";
import { getLegalActions } from "./legalActions.js";
import { chooseAIAction, evaluateBoardState, getMatchActor, rankAIActions, rankAIPlans } from "./ai.js";

const cards = [
  normalizeCard({ id: "S0", namePT: "Scout", cardType: "spirit", colors: ["red"], cost: 0, reduction: [], symbols: ["red"], levels: [{ level: 1, cores: 1, bp: 1000 }] }),
  normalizeCard({ id: "S3", namePT: "Warrior", cardType: "spirit", colors: ["red"], cost: 0, reduction: [], symbols: ["red"], levels: [{ level: 1, cores: 1, bp: 3000 }] }),
  normalizeCard({ id: "S6", namePT: "Dragon", cardType: "spirit", colors: ["red"], cost: 0, reduction: [], symbols: ["red", "red"], levels: [{ level: 1, cores: 1, bp: 6000 }] }),
  normalizeCard({ id: "N0", namePT: "Nexus", cardType: "nexus", colors: ["blue"], cost: 0, reduction: [], symbols: ["blue"], levels: [{ level: 1, cores: 0 }] }),
  normalizeCard({ id: "M0", namePT: "Magic", cardType: "magic", colors: ["yellow"], cost: 0, reduction: [], effects: [{ type: "main", timing: "main", operations: [{ type: "draw", count: 1 }] }] }),
  normalizeCard({ id: "LVL", namePT: "Leveler", cardType: "spirit", colors: ["red"], cost: 0, reduction: [], symbols: ["red"], levels: [{ level: 1, cores: 1, bp: 1000 }, { level: 2, cores: 2, bp: 5000 }], effects: [{ id: "lvl-2", type: "constant", levels: [2], timing: "always" }] }),
  normalizeCard({ id: "FLEX", namePT: "Flexible Body", cardType: "spirit", colors: ["red"], cost: 0, reduction: [], symbols: ["red"], levels: [{ level: 1, cores: 1, bp: 1800 }, { level: 2, cores: 4, bp: 2500 }] }),
  normalizeCard({ id: "BLUE0", namePT: "Blue Scout", cardType: "spirit", colors: ["blue"], cost: 0, reduction: [], symbols: ["blue"], levels: [{ level: 1, cores: 1, bp: 1000 }] }),
  normalizeCard({ id: "COST2", namePT: "Reduced Magic", cardType: "magic", colors: ["red"], cost: 2, reduction: ["red"], effects: [{ type: "main", timing: "main", operations: [{ type: "draw", count: 1 }] }] }),
  normalizeCard({
    id: "FLASH-KILL",
    namePT: "Flash Kill",
    cardType: "magic",
    colors: ["red"],
    cost: 0,
    reduction: [],
    effects: [{ id: "flash-kill-display", type: "flash", timing: "flash" }],
    abilities: [{
      id: "flash-kill",
      event: "magicFlash",
      actions: [{
        type: "selectTarget",
        selector: { owner: "opponent", cardTypes: ["spirit"] },
        onSelect: { type: "destroy" }
      }]
    }]
  }),
  normalizeCard({
    id: "BURST-KILL",
    namePT: "Burst Kill",
    cardType: "magic",
    colors: ["red"],
    cost: 0,
    reduction: [],
    subtypes: ["burst"],
    effects: [{ id: "burst-kill-display", type: "burst", timing: "lifeDecrease" }],
    abilities: [{
      id: "burst-kill",
      event: "burstLifeDecrease",
      actions: [{
        type: "selectTarget",
        selector: { owner: "opponent", cardTypes: ["spirit"], maxBP: 6000 },
        onSelect: { type: "destroy" }
      }]
    }]
  }),
  normalizeCard({
    id: "EXHAUST-SEM",
    namePT: "Semantic Exhaust",
    cardType: "magic",
    colors: ["green"],
    cost: 0,
    reduction: [],
    abilities: [{
      id: "semantic-exhaust-main",
      event: "magicMain",
      actions: [{
        type: "selectTarget",
        selector: { owner: "opponent", cardTypes: ["spirit", "ultimate"] },
        onSelect: { type: "exhaust" }
      }]
    }]
  }),
  normalizeCard({
    id: "REFRESH-SEM",
    namePT: "Semantic Refresh",
    cardType: "magic",
    colors: ["green"],
    cost: 0,
    reduction: [],
    abilities: [{
      id: "semantic-refresh-main",
      event: "magicMain",
      actions: [{
        type: "selectTarget",
        selector: { owner: "self", cardTypes: ["spirit", "ultimate"], exhausted: true },
        onSelect: { type: "refresh" }
      }]
    }]
  }),
  normalizeCard({
    id: "BOUNCE-SEM",
    namePT: "Semantic Bounce",
    cardType: "magic",
    colors: ["white"],
    cost: 0,
    reduction: [],
    abilities: [{
      id: "semantic-bounce-main",
      event: "magicMain",
      actions: [{
        type: "selectTarget",
        selector: { owner: "opponent", cardTypes: ["spirit", "ultimate"] },
        onSelect: { type: "returnToHand" }
      }]
    }]
  }),
  normalizeCard({
    id: "BP-SEM",
    namePT: "Semantic BP",
    cardType: "magic",
    colors: ["red"],
    cost: 0,
    reduction: [],
    abilities: [{
      id: "semantic-bp-flash",
      event: "magicFlash",
      actions: [{
        type: "selectTarget",
        selector: { owner: "self", cardTypes: ["spirit", "ultimate"] },
        onSelect: { type: "modifyBP", amount: 4000, duration: "battle" }
      }]
    }]
  }),
  normalizeCard({
    id: "CORE-SEM",
    namePT: "Semantic Core",
    cardType: "magic",
    colors: ["green"],
    cost: 0,
    reduction: [],
    abilities: [{
      id: "semantic-core-main",
      event: "magicMain",
      actions: [{ type: "addCoreToReserveFromVoid", amount: 2 }]
    }]
  }),
  normalizeCard({
    id: "BURST-OTHER",
    namePT: "Burst Other Trigger",
    cardType: "magic",
    colors: ["yellow"],
    cost: 0,
    reduction: [],
    subtypes: ["burst"],
    effects: [{ id: "burst-other-display", type: "burst", timing: "opponentHandIncrease" }]
  })
];
const index = makeCardIndex(cards);
const deck = Array.from({ length: 40 }, (_, i) => ["S0", "S3", "S6", "N0"][i % 4]);

function baseMatch(firstPlayerId = "player2") {
  return createMatch({
    player1: { name: "Human", deck },
    player2: { name: "CPU", deck },
    firstPlayerId,
    cardIndex: index,
    seed: "ai-beta-2"
  });
}

function fieldCard(cardId, instanceId, cores = 1) {
  return {
    ...makePhysicalCard(cardId, index),
    instanceId,
    exhausted: false,
    cores: { regular: cores, soul: false }
  };
}

test("AI Beta 2 only chooses an action exposed by getLegalActions", () => {
  const match = baseMatch("player2");
  const action = chooseAIAction(match, "player2", index, { difficulty: "hard" });
  const legal = getLegalActions(match, "player2", index).map((entry) => JSON.stringify(entry.action));
  assert.ok(action);
  assert.ok(legal.includes(JSON.stringify(action)));
  const result = applyGameAction(match, action, "player2", index);
  assert.equal(result.ok, true);
});

test("AI Beta 2 attacks for lethal instead of advancing the phase", () => {
  const match = baseMatch("player2");
  match.phase = "attack";
  match.players.player1.life = 2;
  match.players.player1.field.spirits = [];
  match.players.player2.field.spirits = [fieldCard("S6", "lethal-attacker")];

  const ranked = rankAIActions(match, "player2", index, { difficulty: "hard" });
  assert.equal(ranked[0].action.type, "DECLARE_ATTACK");
  assert.equal(ranked[0].action.instanceId, "lethal-attacker");
});

test("AI Beta 2 blocks an otherwise lethal attack when a blocker exists", () => {
  const match = baseMatch("player1");
  match.phase = "attack";
  match.players.player2.life = 1;
  match.players.player1.field.spirits = [fieldCard("S6", "enemy-attacker")];
  match.players.player2.field.spirits = [fieldCard("S3", "cpu-blocker")];
  match.battle = {
    id: "battle-ai-test",
    attackerPlayerId: "player1",
    defenderPlayerId: "player2",
    attackerInstanceId: "enemy-attacker",
    blockerInstanceId: null,
    stage: "block",
    flash: null,
    restrictions: {}
  };

  assert.equal(getMatchActor(match), "player2");
  const action = chooseAIAction(match, "player2", index, { difficulty: "hard" });
  assert.equal(action.type, "DECLARE_BLOCK");
  assert.equal(action.instanceId, "cpu-blocker");
});

test("AI board evaluation does not inspect opponent hidden hand identities", () => {
  const a = baseMatch("player2");
  const b = structuredClone(a);
  a.phase = "main";
  b.phase = "main";

  a.players.player1.hand = [
    { ...makePhysicalCard("S0", index), instanceId: "hidden-a" },
    { ...makePhysicalCard("S0", index), instanceId: "hidden-b" }
  ];
  b.players.player1.hand = [
    { ...makePhysicalCard("S6", index), instanceId: "hidden-c" },
    { ...makePhysicalCard("M0", index), instanceId: "hidden-d" }
  ];

  assert.equal(evaluateBoardState(a, "player2", index), evaluateBoardState(b, "player2", index));
});


test("AI Beta 2 normal difficulty is deterministic for a seeded match state", () => {
  const match = baseMatch("player2");
  match.phase = "main";
  match.players.player2.hand = [
    { ...makePhysicalCard("S0", index), instanceId: "seeded-a" },
    { ...makePhysicalCard("S3", index), instanceId: "seeded-b" },
    { ...makePhysicalCard("N0", index), instanceId: "seeded-c" }
  ];

  const a = chooseAIAction(match, "player2", index, { difficulty: "normal" });
  const b = chooseAIAction(structuredClone(match), "player2", index, { difficulty: "normal" });
  assert.deepEqual(a, b);
});

test("AI vs AI can advance through many legal actions without an illegal move", () => {
  let match = baseMatch("player1");
  let steps = 0;

  while (!match.winnerId && steps < 180) {
    const actor = getMatchActor(match);
    assert.ok(actor, "match should have an actor while active");

    const action = chooseAIAction(match, actor, index, {
      difficulty: "hard",
      turnActionCount: steps % 60,
      maxTurnActions: 45
    });
    assert.ok(action, `AI should have a legal action at step ${steps}, phase ${match.phase}`);

    const legal = getLegalActions(match, actor, index).map((entry) => JSON.stringify(entry.action));
    assert.ok(legal.includes(JSON.stringify(action)), `action must remain legal at step ${steps}`);

    const result = applyGameAction(match, action, actor, index);
    assert.equal(result.ok, true, result.error || `illegal AI action at step ${steps}`);
    match = result.match;
    steps += 1;
  }

  assert.ok(steps >= 20, "AI simulation should exercise a meaningful action sequence");
});

test("Combat Intelligence holds the last blocker when a non-lethal attack would expose lethal next turn", () => {
  const match = baseMatch("player2");
  match.phase = "attack";
  match.players.player2.life = 1;
  match.players.player1.life = 5;
  match.players.player1.field.spirits = [fieldCard("S3", "enemy-next-turn")];
  match.players.player2.field.spirits = [fieldCard("S6", "cpu-last-blocker")];

  const action = chooseAIAction(match, "player2", index, { difficulty: "hard" });
  assert.equal(action.type, "ADVANCE_PHASE");
});

test("Combat Intelligence refuses a casual suicide attack into a much stronger blocker", () => {
  const match = baseMatch("player2");
  match.phase = "attack";
  match.players.player1.life = 5;
  match.players.player1.field.spirits = [fieldCard("S6", "enemy-wall")];
  match.players.player2.field.spirits = [fieldCard("S3", "cpu-small-attacker")];

  const ranked = rankAIActions(match, "player2", index, { difficulty: "hard" });
  assert.equal(ranked[0].action.type, "ADVANCE_PHASE");
  const attack = ranked.find((entry) => entry.action.type === "DECLARE_ATTACK");
  assert.ok(attack);
  assert.ok(attack.score < ranked[0].score);
});

test("Combat Intelligence uses the smallest sufficient blocker for a lethal hit", () => {
  const match = baseMatch("player1");
  match.phase = "attack";
  match.players.player2.life = 1;
  match.players.player1.field.spirits = [fieldCard("S0", "enemy-small-attacker")];
  match.players.player2.field.spirits = [
    fieldCard("S3", "cpu-efficient-blocker"),
    fieldCard("S6", "cpu-premium-blocker")
  ];
  match.battle = {
    id: "battle-efficient-block",
    attackerPlayerId: "player1",
    defenderPlayerId: "player2",
    attackerInstanceId: "enemy-small-attacker",
    blockerInstanceId: null,
    stage: "block",
    flash: null,
    restrictions: {}
  };

  const action = chooseAIAction(match, "player2", index, { difficulty: "hard" });
  assert.equal(action.type, "DECLARE_BLOCK");
  assert.equal(action.instanceId, "cpu-efficient-blocker");
});

test("Combat Intelligence still takes immediate lethal even when defending next turn would be dangerous", () => {
  const match = baseMatch("player2");
  match.phase = "attack";
  match.players.player2.life = 1;
  match.players.player1.life = 2;
  match.players.player1.field.spirits = [fieldCard("S3", "enemy-threat")];
  match.players.player2.field.spirits = [fieldCard("S6", "cpu-lethal-attacker")];

  const action = chooseAIAction(match, "player2", index, { difficulty: "hard" });
  assert.equal(action.type, "DECLARE_ATTACK");
  assert.equal(action.instanceId, "cpu-lethal-attacker");
});


test("Core Management exposes higher-Level summon placements as legal Rules Engine actions", () => {
  const match = baseMatch("player2");
  match.phase = "main";
  match.players.player2.reserve = 4;
  match.players.player2.hand = [{ ...makePhysicalCard("LVL", index), instanceId: "level-summon" }];

  const legal = getLegalActions(match, "player2", index).map((entry) => entry.action);
  assert.ok(legal.some((action) =>
    action.type === "SUMMON" &&
    action.instanceId === "level-summon" &&
    action.options?.coresToPlace === 2
  ));
});

test("Core Management levels an existing Spirit when Reserve is healthy and the next Level is valuable", () => {
  const match = baseMatch("player2");
  match.phase = "main";
  match.players.player2.reserve = 3;
  match.players.player2.hand = [];
  match.players.player2.field.spirits = [fieldCard("LVL", "cpu-level-target", 1)];

  const action = chooseAIAction(match, "player2", index, { difficulty: "hard" });
  assert.equal(action.type, "MOVE_CORE");
  assert.equal(action.move?.to?.instanceId, "cpu-level-target");
});

test("Core Management prefers a resource-efficient summon line over overcommitting all Reserve", () => {
  const match = baseMatch("player2");
  match.phase = "main";
  match.players.player2.reserve = 4;
  match.players.player2.soulCore = { zone: "trash", instanceId: null };
  match.players.player2.hand = [
    { ...makePhysicalCard("FLEX", index), instanceId: "flex-card" },
    { ...makePhysicalCard("S0", index), instanceId: "follow-up-card" }
  ];

  const ranked = rankAIActions(match, "player2", index, { difficulty: "hard" });
  const minimum = ranked.find((entry) =>
    entry.action.type === "SUMMON" &&
    entry.action.instanceId === "flex-card" &&
    entry.action.options?.coresToPlace == null
  );
  const maxLevel = ranked.find((entry) =>
    entry.action.type === "SUMMON" &&
    entry.action.instanceId === "flex-card" &&
    entry.action.options?.coresToPlace === 4
  );

  assert.ok(minimum && maxLevel);
  assert.ok(minimum.score > maxLevel.score, `minimum=${minimum.score} max=${maxLevel.score}`);
});

test("Core Management values field symbols that reduce cards still in its own hand", () => {
  const red = baseMatch("player2");
  const blue = structuredClone(red);
  red.phase = "main";
  blue.phase = "main";
  red.players.player2.hand = [{ ...makePhysicalCard("COST2", index), instanceId: "reduced-hand-red" }];
  blue.players.player2.hand = [{ ...makePhysicalCard("COST2", index), instanceId: "reduced-hand-blue" }];
  red.players.player2.field.spirits = [fieldCard("S0", "red-symbol", 1)];
  blue.players.player2.field.spirits = [fieldCard("BLUE0", "blue-symbol", 1)];

  assert.ok(evaluateBoardState(red, "player2", index) > evaluateBoardState(blue, "player2", index));
});


test("Flash Intelligence exposes only the Magic timings printed on structured cards", () => {
  const match = baseMatch("player2");
  match.phase = "main";
  match.players.player2.hand = [
    { ...makePhysicalCard("M0", index), instanceId: "main-only" },
    { ...makePhysicalCard("FLASH-KILL", index), instanceId: "flash-only" }
  ];

  const legal = getLegalActions(match, "player2", index).map((entry) => entry.action);
  assert.ok(legal.some((action) => action.type === "USE_MAGIC" && action.instanceId === "main-only" && action.options?.mode === "main"));
  assert.ok(!legal.some((action) => action.type === "USE_MAGIC" && action.instanceId === "main-only" && action.options?.mode === "flash"));
  assert.ok(legal.some((action) => action.type === "USE_MAGIC" && action.instanceId === "flash-only" && action.options?.mode === "flash"));
  assert.ok(!legal.some((action) => action.type === "USE_MAGIC" && action.instanceId === "flash-only" && action.options?.mode === "main"));
});

test("Flash Intelligence uses a useful Flash response when an attacker threatens lethal", () => {
  const match = baseMatch("player1");
  match.phase = "attack";
  match.players.player2.life = 1;
  match.players.player1.field.spirits = [fieldCard("S6", "flash-lethal-attacker")];
  match.players.player2.field.spirits = [];
  match.players.player2.hand = [{ ...makePhysicalCard("FLASH-KILL", index), instanceId: "flash-answer" }];
  match.battle = {
    id: "flash-lethal",
    attackerPlayerId: "player1",
    defenderPlayerId: "player2",
    attackerInstanceId: "flash-lethal-attacker",
    blockerInstanceId: null,
    stage: "flash1",
    flash: { number: 1, priorityPlayerId: "player2", consecutivePasses: 0 },
    restrictions: {}
  };

  const action = chooseAIAction(match, "player2", index, { difficulty: "hard" });
  assert.equal(action.type, "USE_MAGIC");
  assert.equal(action.instanceId, "flash-answer");
  assert.equal(action.options?.mode, "flash");
});

test("Flash Intelligence passes instead of wasting a Flash with no valid target", () => {
  const match = baseMatch("player1");
  match.phase = "attack";
  match.players.player1.field.spirits = [fieldCard("S6", "missing-target-attacker")];
  // Move the attacker out of the field after creating the battle to emulate a
  // battle whose relevant opposing body was already removed by another effect.
  match.players.player1.field.spirits = [];
  match.players.player2.hand = [{ ...makePhysicalCard("FLASH-KILL", index), instanceId: "dead-flash" }];
  match.battle = {
    id: "flash-no-target",
    attackerPlayerId: "player1",
    defenderPlayerId: "player2",
    attackerInstanceId: "missing-target-attacker",
    blockerInstanceId: null,
    stage: "flash1",
    flash: { number: 1, priorityPlayerId: "player2", consecutivePasses: 0 },
    restrictions: {}
  };

  const action = chooseAIAction(match, "player2", index, { difficulty: "hard" });
  assert.equal(action.type, "PASS_FLASH");
});

test("Burst Intelligence recognizes lifeDecrease as an automatic Life-decrease Burst timing", () => {
  const match = baseMatch("player2");
  match.phase = "main";
  match.players.player2.life = 2;
  match.players.player2.hand = [
    { ...makePhysicalCard("BURST-KILL", index), instanceId: "supported-burst" },
    { ...makePhysicalCard("BURST-OTHER", index), instanceId: "manual-burst" }
  ];

  const ranked = rankAIActions(match, "player2", index, { difficulty: "hard" });
  const supported = ranked.find((entry) => entry.action.type === "SET_BURST" && entry.action.instanceId === "supported-burst");
  const manual = ranked.find((entry) => entry.action.type === "SET_BURST" && entry.action.instanceId === "manual-burst");
  assert.ok(supported && manual);
  assert.ok(supported.score > manual.score, `supported=${supported.score} manual=${manual.score}`);
});

test("Burst Intelligence activates a Life-decrease Burst when it has a valuable legal target", () => {
  const match = baseMatch("player1");
  match.phase = "attack";
  match.players.player2.life = 2;
  match.players.player1.field.spirits = [fieldCard("S6", "burst-target")];
  match.players.player2.burst = { ...makePhysicalCard("BURST-KILL", index), instanceId: "set-burst", faceDown: true };
  match.burstOpportunity = {
    playerId: "player2",
    event: "burstLifeDecrease",
    amount: 1,
    cause: "unblockedAttack",
    sourcePlayerId: "player1",
    battleId: "burst-test"
  };

  const action = chooseAIAction(match, "player2", index, { difficulty: "hard" });
  assert.equal(action.type, "ACTIVATE_BURST");
});

test("Burst Intelligence keeps a set Burst when activation has no legal effect target", () => {
  const match = baseMatch("player1");
  match.phase = "attack";
  match.players.player2.life = 2;
  match.players.player1.field.spirits = [];
  match.players.player2.burst = { ...makePhysicalCard("BURST-KILL", index), instanceId: "set-burst-empty", faceDown: true };
  match.burstOpportunity = {
    playerId: "player2",
    event: "burstLifeDecrease",
    amount: 1,
    cause: "unblockedAttack",
    sourcePlayerId: "player1",
    battleId: "burst-empty-test"
  };

  const action = chooseAIAction(match, "player2", index, { difficulty: "hard" });
  assert.equal(action.type, "PASS_BURST");
});

test("Card Effect Intelligence exhausts the highest-value opposing threat", () => {
  const match = baseMatch("player2");
  match.phase = "main";
  match.players.player2.hand = [{ ...makePhysicalCard("EXHAUST-SEM", index), instanceId: "semantic-exhaust" }];
  match.players.player1.field.spirits = [
    fieldCard("S0", "exhaust-weak"),
    fieldCard("S6", "exhaust-strong")
  ];

  const opened = applyGameAction(
    match,
    { type: "USE_MAGIC", instanceId: "semantic-exhaust", options: { mode: "main" } },
    "player2",
    index
  );
  assert.equal(opened.ok, true);
  assert.ok(opened.match.pendingEffectDecision);

  const action = chooseAIAction(opened.match, "player2", index, { difficulty: "hard" });
  assert.equal(action.type, "RESOLVE_EFFECT_DECISION");
  assert.deepEqual(action.payload?.selectedInstanceIds, ["exhaust-strong"]);
});

test("Card Effect Intelligence refreshes the strongest useful own body", () => {
  const match = baseMatch("player2");
  match.phase = "main";
  match.players.player2.hand = [{ ...makePhysicalCard("REFRESH-SEM", index), instanceId: "semantic-refresh" }];
  const weak = fieldCard("S0", "refresh-weak");
  const strong = fieldCard("S6", "refresh-strong");
  weak.exhausted = true;
  strong.exhausted = true;
  match.players.player2.field.spirits = [weak, strong];

  const opened = applyGameAction(
    match,
    { type: "USE_MAGIC", instanceId: "semantic-refresh", options: { mode: "main" } },
    "player2",
    index
  );
  assert.equal(opened.ok, true);

  const action = chooseAIAction(opened.match, "player2", index, { difficulty: "hard" });
  assert.deepEqual(action.payload?.selectedInstanceIds, ["refresh-strong"]);
});

test("Card Effect Intelligence bounces the more valuable opposing body", () => {
  const match = baseMatch("player2");
  match.phase = "main";
  match.players.player2.hand = [{ ...makePhysicalCard("BOUNCE-SEM", index), instanceId: "semantic-bounce" }];
  match.players.player1.field.spirits = [
    fieldCard("S0", "bounce-weak"),
    fieldCard("S6", "bounce-strong")
  ];

  const opened = applyGameAction(
    match,
    { type: "USE_MAGIC", instanceId: "semantic-bounce", options: { mode: "main" } },
    "player2",
    index
  );
  assert.equal(opened.ok, true);

  const action = chooseAIAction(opened.match, "player2", index, { difficulty: "hard" });
  assert.deepEqual(action.payload?.selectedInstanceIds, ["bounce-strong"]);
});

test("Card Effect Intelligence prefers a BP buff on the body currently fighting", () => {
  const match = baseMatch("player2");
  match.phase = "attack";
  match.players.player2.hand = [{ ...makePhysicalCard("BP-SEM", index), instanceId: "semantic-bp" }];
  match.players.player2.field.spirits = [
    fieldCard("S0", "bp-attacker"),
    fieldCard("S6", "bp-backline")
  ];
  match.players.player1.field.spirits = [fieldCard("S3", "bp-blocker")];
  match.battle = {
    id: "semantic-bp-battle",
    attackerPlayerId: "player2",
    defenderPlayerId: "player1",
    attackerInstanceId: "bp-attacker",
    blockerInstanceId: "bp-blocker",
    stage: "flash2",
    flash: { number: 2, priorityPlayerId: "player2", consecutivePasses: 0 },
    restrictions: {}
  };

  const opened = applyGameAction(
    match,
    { type: "USE_MAGIC", instanceId: "semantic-bp", options: { mode: "flash" } },
    "player2",
    index
  );
  assert.equal(opened.ok, true);

  const action = chooseAIAction(opened.match, "player2", index, { difficulty: "hard" });
  assert.deepEqual(action.payload?.selectedInstanceIds, ["bp-attacker"]);
});

test("Card Effect Intelligence exposes semantic reasons for draw and Core generation", () => {
  const draw = baseMatch("player2");
  draw.phase = "main";
  draw.players.player2.hand = [{ ...makePhysicalCard("M0", index), instanceId: "semantic-draw" }];
  const drawRanked = rankAIActions(draw, "player2", index, { difficulty: "hard" });
  const drawAction = drawRanked.find((entry) => entry.action.type === "USE_MAGIC" && entry.action.instanceId === "semantic-draw");
  assert.ok(drawAction);
  assert.ok(drawAction.effectReasons.some((reason) => reason.type === "draw"));

  const core = baseMatch("player2");
  core.phase = "main";
  core.players.player2.hand = [{ ...makePhysicalCard("CORE-SEM", index), instanceId: "semantic-core" }];
  const coreRanked = rankAIActions(core, "player2", index, { difficulty: "hard" });
  const coreAction = coreRanked.find((entry) => entry.action.type === "USE_MAGIC" && entry.action.instanceId === "semantic-core");
  assert.ok(coreAction);
  assert.ok(coreAction.effectReasons.some((reason) => reason.type === "core"));
});

test("Card Effect Intelligence still ignores opponent hidden hand identities", () => {
  const a = baseMatch("player2");
  const b = structuredClone(a);
  a.phase = "main";
  b.phase = "main";
  a.players.player2.hand = [{ ...makePhysicalCard("CORE-SEM", index), instanceId: "semantic-private" }];
  b.players.player2.hand = [{ ...makePhysicalCard("CORE-SEM", index), instanceId: "semantic-private" }];
  a.players.player1.hand = [
    { ...makePhysicalCard("S0", index), instanceId: "hidden-semantic-a" },
    { ...makePhysicalCard("S0", index), instanceId: "hidden-semantic-b" }
  ];
  b.players.player1.hand = [
    { ...makePhysicalCard("S6", index), instanceId: "hidden-semantic-c" },
    { ...makePhysicalCard("M0", index), instanceId: "hidden-semantic-d" }
  ];

  const aAction = rankAIActions(a, "player2", index, { difficulty: "hard" })
    .find((entry) => entry.action.type === "USE_MAGIC" && entry.action.instanceId === "semantic-private");
  const bAction = rankAIActions(b, "player2", index, { difficulty: "hard" })
    .find((entry) => entry.action.type === "USE_MAGIC" && entry.action.instanceId === "semantic-private");

  assert.ok(aAction && bAction);
  assert.equal(aAction.score, bAction.score);
  assert.deepEqual(aAction.effectReasons, bAction.effectReasons);
});


test("Planning / Lookahead sees Main -> Attack lethal before committing the phase advance", () => {
  const match = baseMatch("player2");
  match.turnNumber = 2;
  match.phase = "main";
  match.players.player1.life = 2;
  match.players.player1.field.spirits = [];
  match.players.player2.hand = [];
  match.players.player2.field.spirits = [fieldCard("S6", "planned-lethal")];

  const plans = rankAIPlans(match, "player2", index, { difficulty: "hard" });
  assert.equal(plans[0].action.type, "ADVANCE_PHASE");
  assert.ok(plans[0].planScore > plans[0].immediateScore);
  assert.deepEqual(plans[0].planActions.slice(0, 2), [
    { type: "ADVANCE_PHASE" },
    { type: "DECLARE_ATTACK", instanceId: "planned-lethal" }
  ]);
});

test("Planning / Lookahead returns a sequence made only from legal Rules Engine actions", () => {
  const match = baseMatch("player2");
  match.turnNumber = 2;
  match.phase = "main";
  match.players.player2.reserve = 4;
  match.players.player2.hand = [
    { ...makePhysicalCard("FLEX", index), instanceId: "plan-flex" },
    { ...makePhysicalCard("S0", index), instanceId: "plan-follow-up" }
  ];

  const plan = rankAIPlans(match, "player2", index, { difficulty: "hard" })[0];
  assert.ok(plan.planActions.length >= 2);

  let state = match;
  for (const plannedAction of plan.planActions) {
    assert.equal(getMatchActor(state), "player2");
    const legal = getLegalActions(state, "player2", index).map((entry) => JSON.stringify(entry.action));
    assert.ok(legal.includes(JSON.stringify(plannedAction)), `planned action must remain legal: ${JSON.stringify(plannedAction)}`);
    const result = applyGameAction(state, plannedAction, "player2", index);
    assert.equal(result.ok, true, result.error || "planned action should apply");
    state = result.match;
    if (state.winnerId || getMatchActor(state) !== "player2") break;
  }
});

test("Planning / Lookahead gives Hard a deeper horizon than Normal in a multi-action Main Step", () => {
  const match = baseMatch("player2");
  match.turnNumber = 2;
  match.phase = "main";
  match.players.player2.reserve = 5;
  match.players.player2.hand = [
    { ...makePhysicalCard("S0", index), instanceId: "depth-a" },
    { ...makePhysicalCard("S3", index), instanceId: "depth-b" },
    { ...makePhysicalCard("N0", index), instanceId: "depth-c" }
  ];

  const normal = rankAIPlans(match, "player2", index, { difficulty: "normal" });
  const hard = rankAIPlans(match, "player2", index, { difficulty: "hard" });
  const normalDepth = Math.max(...normal.map((entry) => entry.planDepth));
  const hardDepth = Math.max(...hard.map((entry) => entry.planDepth));
  assert.ok(hardDepth > normalDepth, `normal=${normalDepth} hard=${hardDepth}`);
});

test("Planning / Lookahead stops at hidden-information boundaries and replans after a draw", () => {
  const match = baseMatch("player2");
  match.turnNumber = 2;
  match.phase = "main";
  match.players.player2.reserve = 3;
  match.players.player2.hand = [{ ...makePhysicalCard("M0", index), instanceId: "planning-draw" }];

  const drawPlan = rankAIPlans(match, "player2", index, { difficulty: "hard" })
    .find((entry) => entry.action.type === "USE_MAGIC" && entry.action.instanceId === "planning-draw");
  assert.ok(drawPlan);
  assert.equal(drawPlan.planDepth, 0);
  assert.equal(drawPlan.planActions.length, 1);
});

test("Planning / Lookahead remains deterministic for the same seeded Hard state", () => {
  const match = baseMatch("player2");
  match.turnNumber = 2;
  match.phase = "main";
  match.players.player2.reserve = 4;
  match.players.player2.hand = [
    { ...makePhysicalCard("S0", index), instanceId: "hard-plan-a" },
    { ...makePhysicalCard("S3", index), instanceId: "hard-plan-b" },
    { ...makePhysicalCard("N0", index), instanceId: "hard-plan-c" }
  ];

  const a = rankAIPlans(match, "player2", index, { difficulty: "hard" })[0];
  const b = rankAIPlans(structuredClone(match), "player2", index, { difficulty: "hard" })[0];
  assert.deepEqual(a.action, b.action);
  assert.equal(a.planScore, b.planScore);
  assert.deepEqual(a.planActions, b.planActions);
});


test("Planning / Lookahead does not peek at the identity of an unknown future draw", () => {
  const a = baseMatch("player2");
  const b = structuredClone(a);
  a.turnNumber = 2;
  b.turnNumber = 2;
  a.phase = "main";
  b.phase = "main";
  a.players.player2.reserve = 3;
  b.players.player2.reserve = 3;
  a.players.player2.hand = [{ ...makePhysicalCard("M0", index), instanceId: "fair-draw" }];
  b.players.player2.hand = [{ ...makePhysicalCard("M0", index), instanceId: "fair-draw" }];
  a.players.player2.deck[0] = { ...makePhysicalCard("S0", index), instanceId: "unknown-top-a" };
  b.players.player2.deck[0] = { ...makePhysicalCard("S6", index), instanceId: "unknown-top-b" };

  const aDraw = rankAIActions(a, "player2", index, { difficulty: "hard" })
    .find((entry) => entry.action.type === "USE_MAGIC" && entry.action.instanceId === "fair-draw");
  const bDraw = rankAIActions(b, "player2", index, { difficulty: "hard" })
    .find((entry) => entry.action.type === "USE_MAGIC" && entry.action.instanceId === "fair-draw");

  assert.ok(aDraw && bDraw);
  assert.equal(aDraw.score, bDraw.score);
  assert.equal(aDraw.delta, bDraw.delta);
});
