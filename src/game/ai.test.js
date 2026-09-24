import test from "node:test";
import assert from "node:assert/strict";

import { normalizeCard, makeCardIndex } from "./cardAdapter.js";
import { createMatch, makePhysicalCard } from "./state.js";
import { applyGameAction } from "./reducer.js";
import { getLegalActions } from "./legalActions.js";
import { chooseAIAction, evaluateBoardState, getMatchActor, rankAIActions } from "./ai.js";

const cards = [
  normalizeCard({ id: "S0", namePT: "Scout", cardType: "spirit", colors: ["red"], cost: 0, reduction: [], symbols: ["red"], levels: [{ level: 1, cores: 1, bp: 1000 }] }),
  normalizeCard({ id: "S3", namePT: "Warrior", cardType: "spirit", colors: ["red"], cost: 0, reduction: [], symbols: ["red"], levels: [{ level: 1, cores: 1, bp: 3000 }] }),
  normalizeCard({ id: "S6", namePT: "Dragon", cardType: "spirit", colors: ["red"], cost: 0, reduction: [], symbols: ["red", "red"], levels: [{ level: 1, cores: 1, bp: 6000 }] }),
  normalizeCard({ id: "N0", namePT: "Nexus", cardType: "nexus", colors: ["blue"], cost: 0, reduction: [], symbols: ["blue"], levels: [{ level: 1, cores: 0 }] }),
  normalizeCard({ id: "M0", namePT: "Magic", cardType: "magic", colors: ["yellow"], cost: 0, reduction: [], effects: [{ type: "main", timing: "main", operations: [{ type: "draw", count: 1 }] }] }),
  normalizeCard({ id: "LVL", namePT: "Leveler", cardType: "spirit", colors: ["red"], cost: 0, reduction: [], symbols: ["red"], levels: [{ level: 1, cores: 1, bp: 1000 }, { level: 2, cores: 2, bp: 5000 }], effects: [{ id: "lvl-2", type: "constant", levels: [2], timing: "always" }] }),
  normalizeCard({ id: "FLEX", namePT: "Flexible Body", cardType: "spirit", colors: ["red"], cost: 0, reduction: [], symbols: ["red"], levels: [{ level: 1, cores: 1, bp: 1800 }, { level: 2, cores: 4, bp: 2500 }] }),
  normalizeCard({ id: "BLUE0", namePT: "Blue Scout", cardType: "spirit", colors: ["blue"], cost: 0, reduction: [], symbols: ["blue"], levels: [{ level: 1, cores: 1, bp: 1000 }] }),
  normalizeCard({ id: "COST2", namePT: "Reduced Magic", cardType: "magic", colors: ["red"], cost: 2, reduction: ["red"], effects: [{ type: "main", timing: "main", operations: [{ type: "draw", count: 1 }] }] })
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
