import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCard, makeCardIndex } from "../cardAdapter.js";
import { createMatch, makePhysicalCard } from "../state.js";
import { applyGameAction } from "../reducer.js";
import { resolveOperations, resolveEffectDecision } from "./effectEngine.js";

const cards = [
  normalizeCard({ id: "LOW", namePT: "Low", cardType: "spirit", colors: ["red"], cost: 1, symbols: ["red"], levels: [{ level: 1, cores: 1, bp: 1000 }] }),
  normalizeCard({ id: "HIGH", namePT: "High", cardType: "spirit", colors: ["red"], cost: 8, symbols: ["red"], levels: [{ level: 1, cores: 1, bp: 1000 }] }),
  normalizeCard({ id: "MAG", namePT: "Magic Reveal", cardType: "magic", colors: ["yellow"], cost: 0, effects: [] }),
  normalizeCard({
    id: "U-GUARD",
    namePT: "Ultimate Guard",
    cardType: "ultimate",
    colors: ["red"],
    cost: 5,
    symbols: ["ultimate"],
    levels: [{ level: 3, cores: 1, bp: 9000 }],
    effects: [{ id: "guard-trigger", type: "ultimateTrigger", timing: "whenAttacks", levels: [3] }],
    abilities: [
      { id: "guard-event", event: "ultimateTriggerGuard", actions: [{ type: "draw", amount: 1 }] },
      { id: "resolved-event", event: "ultimateTriggerResolved", actions: [{ type: "addCoreToReserveFromVoid", amount: 1 }] }
    ]
  }),
  normalizeCard({
    id: "U-CRIT",
    namePT: "Ultimate Critical",
    cardType: "ultimate",
    colors: ["yellow"],
    cost: 7,
    symbols: ["ultimate"],
    levels: [{ level: 3, cores: 1, bp: 10000 }],
    effects: [
      { id: "crit-trigger", type: "ultimateTrigger", timing: "whenAttacks", levels: [3] },
      { id: "crit-effect", type: "criticalHit", timing: "ultimateTriggerHit", levels: [3], condition: { type: "ultimateTriggerRevealedCardType", cardType: "magic" }, operations: [{ type: "draw", amount: 1 }] }
    ]
  })
];

const index = makeCardIndex(cards);
const deck = Array.from({ length: 40 }, () => "LOW");

function base() {
  const match = createMatch({ player1: { name: "A", deck }, player2: { name: "B", deck }, firstPlayerId: "player1", cardIndex: index, random: () => 0.2 });
  match.phase = "attack";
  match.activePlayerId = "player1";
  return match;
}

function physical(cardId, instanceId, cores = 1) {
  return { ...makePhysicalCard(cardId, index), instanceId, cores: { regular: cores, soul: false }, exhausted: false, combinedWith: null };
}

test("Phase 16 dispatches Ultimate Trigger GUARD and resolved events", () => {
  let match = base();
  match.players.player1.field.spirits = [physical("U-GUARD", "guard", 1)];
  match.players.player2.deck = [physical("HIGH", "guard-reveal"), ...match.players.player2.deck];
  const handBefore = match.players.player1.hand.length;
  const reserveBefore = match.players.player1.reserve;
  let result = applyGameAction(match, { type: "DECLARE_ATTACK", instanceId: "guard" }, "player1", index);
  assert.equal(result.ok, true);
  assert.equal(result.match.battle.ultimateTrigger.hit, false);
  result = applyGameAction(result.match, { type: "RESOLVE_ULTIMATE_TRIGGER" }, "player1", index);
  assert.equal(result.ok, true);
  assert.equal(result.match.players.player1.hand.length, handBefore + 1);
  assert.equal(result.match.players.player1.reserve, reserveBefore + 1);
  assert.equal(result.match.battle.stage, "flash1");
});

test("Phase 16 resolves Critical Hit through the canonical dispatcher", () => {
  let match = base();
  match.players.player1.field.spirits = [physical("U-CRIT", "critical", 1)];
  match.players.player2.deck = [physical("MAG", "critical-reveal"), ...match.players.player2.deck];
  const handBefore = match.players.player1.hand.length;
  let result = applyGameAction(match, { type: "DECLARE_ATTACK", instanceId: "critical" }, "player1", index);
  assert.equal(result.match.battle.ultimateTrigger.hit, true);
  assert.equal(result.match.battle.ultimateTrigger.criticalHit?.eligible, true);
  result = applyGameAction(result.match, { type: "RESOLVE_ULTIMATE_TRIGGER" }, "player1", index);
  assert.equal(result.ok, true);
  assert.equal(result.match.players.player1.hand.length, handBefore + 1);
});

test("Phase 17 resolves structured Yes/No decisions", () => {
  let match = base();
  match.phase = "main";
  const before = match.players.player1.hand.length;
  const opened = resolveOperations(match, "player1", [{
    type: "chooseYesNo",
    yesActions: [{ type: "draw", amount: 1 }],
    noActions: [{ type: "addCoreToReserveFromVoid", amount: 1 }]
  }], index, { sourcePlayerId: "player1" });
  assert.equal(opened.match.pendingEffectDecision?.kind, "chooseYesNo");
  const resolved = resolveEffectDecision(opened.match, "player1", { optionId: "yes" }, index);
  assert.equal(resolved.ok, true);
  assert.equal(resolved.match.players.player1.hand.length, before + 1);
  assert.equal(resolved.match.pendingEffectDecision, null);
});

test("Phase 17 selects cards from hand as a structured decision", () => {
  let match = base();
  match.phase = "main";
  match.players.player1.hand = [physical("LOW", "h1"), physical("HIGH", "h2")];
  const opened = resolveOperations(match, "player1", [{
    type: "chooseCardsFromHand",
    minTargets: 1,
    maxTargets: 1,
    selector: { owner: "self", cardTypes: ["spirit"] },
    onConfirm: [{ type: "discard", target: "selected" }]
  }], index, { sourcePlayerId: "player1" });
  assert.equal(opened.match.pendingEffectDecision?.kind, "chooseCardsFromHand");
  const resolved = resolveEffectDecision(opened.match, "player1", { selectedInstanceIds: ["h1"] }, index);
  assert.equal(resolved.ok, true);
  assert.equal(resolved.match.players.player1.hand.some((card) => card.instanceId === "h1"), false);
  assert.equal(resolved.match.players.player1.trash.some((card) => card.instanceId === "h1"), true);
});

test("Phase 17 applies authoritative Core distribution", () => {
  let match = base();
  match.phase = "main";
  match.players.player1.reserve = 4;
  match.players.player1.field.spirits = [physical("LOW", "c1", 1), physical("LOW", "c2", 1)];
  const opened = resolveOperations(match, "player1", [{
    type: "chooseCoreDistribution",
    amount: 2,
    from: "reserve",
    selector: { owner: "self", cardTypes: ["spirit"] }
  }], index, { sourcePlayerId: "player1" });
  assert.equal(opened.match.pendingEffectDecision?.kind, "chooseCoreDistribution");
  const resolved = resolveEffectDecision(opened.match, "player1", { coreDistribution: { c1: 1, c2: 1 } }, index);
  assert.equal(resolved.ok, true);
  assert.equal(resolved.match.players.player1.reserve, 2);
  assert.equal(resolved.match.players.player1.field.spirits[0].cores.regular, 2);
  assert.equal(resolved.match.players.player1.field.spirits[1].cores.regular, 2);
});
