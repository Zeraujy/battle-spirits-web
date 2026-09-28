import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCard, makeCardIndex } from "../cardAdapter.js";
import { createMatch, makePhysicalCard } from "../state.js";
import { useMagic } from "../effects.js";
import { resolveEffectDecision } from "./effectEngine.js";
import { BurstEvent, openBurstOpportunityForEvent } from "./burstEngine.js";
import { combineBrave } from "../brave.js";

const cards = [
  normalizeCard({ id: "FILL", namePT: "Fill", cardType: "spirit", colors: ["red"], cost: 0, symbols: ["red"], levels: [{ level: 1, cores: 1, bp: 1000 }] }),
  normalizeCard({ id: "M-CHOICE", namePT: "Magic Choice", cardType: "magic", colors: ["red"], cost: 0, effects: [{ id: "m-choice", event: "magicMain", actions: [{ type: "chooseOption", options: [{ id: "draw", actions: [{ type: "draw", amount: 1 }] }, { id: "core", actions: [{ type: "addCoreFromVoid", amount: 1 }] }] }] }] }),
  normalizeCard({ id: "B-SUMMON", namePT: "Burst Summon", cardType: "magic", cost: 0, subtypes: ["burst"], effects: [{ id: "b-summon", type: "burst", timing: "afterOpponentSummons", actions: [{ type: "draw", amount: 1 }] }] }),
  normalizeCard({ id: "HOST", namePT: "Host", cardType: "spirit", colors: ["red"], cost: 0, symbols: ["red"], levels: [{ level: 1, cores: 1, bp: 2000 }], abilities: [{ id: "host-combined", event: "whenCombined", actions: [{ type: "draw", amount: 1 }] }] }),
  normalizeCard({ id: "BRAVE", namePT: "Brave", cardType: "brave", colors: ["white"], cost: 0, symbols: ["white"], braveBP: 2000, braveCondition: { cardTypes: ["spirit"] }, levels: [{ level: 1, cores: 1, bp: 1000 }], abilities: [{ id: "brave-braved", event: "whenBraved", actions: [{ type: "draw", amount: 1 }] }] })
];
const index = makeCardIndex(cards);
const deck = Array.from({ length: 40 }, () => "FILL");

function base() {
  const match = createMatch({ player1: { name: "A", deck }, player2: { name: "B", deck }, firstPlayerId: "player1", cardIndex: index, random: () => 0.2 });
  match.phase = "main";
  match.activePlayerId = "player1";
  return match;
}

function physical(cardId, instanceId, cores = 0) {
  return { ...makePhysicalCard(cardId, index), instanceId, cores: { regular: cores, soul: false }, exhausted: false, combinedWith: null };
}

test("Phase 13 keeps Magic out of Trash until its structured decision resolves", () => {
  let match = base();
  const magic = physical("M-CHOICE", "magic-choice");
  match.players.player1.hand.unshift(magic);
  const beforeTrash = match.players.player1.trash.length;
  const used = useMagic(match, "player1", "magic-choice", index, { mode: "main" });
  assert.equal(used.ok, true);
  assert.ok(used.match.pendingEffectDecision);
  assert.ok(used.match.pendingMagicResolution);
  assert.equal(used.match.players.player1.trash.length, beforeTrash);

  const resolved = resolveEffectDecision(used.match, "player1", { optionId: "draw" }, index);
  assert.equal(resolved.ok, true);
  assert.equal(resolved.match.pendingEffectDecision, null);
  assert.equal(resolved.match.pendingMagicResolution, null);
  assert.equal(resolved.match.players.player1.trash.at(-1).cardId, "M-CHOICE");
});

test("Phase 14 opens Burst only for the matching automatic event and player relation", () => {
  let match = base();
  match.players.player2.burst = { ...physical("B-SUMMON", "burst-set"), faceDown: true };
  match = openBurstOpportunityForEvent(match, BurstEvent.OPPONENT_SUMMONED, "player1", index, { sourcePlayerId: "player1" });
  assert.equal(match.burstOpportunity?.playerId, "player2");
  assert.equal(match.burstOpportunity?.event, BurstEvent.OPPONENT_SUMMONED);
});

test("Phase 15 Combine resolves Brave and host inherited timings", () => {
  let match = base();
  match.players.player1.field.spirits = [physical("HOST", "host", 1)];
  match.players.player1.field.other = [physical("BRAVE", "brave", 1)];
  const handBefore = match.players.player1.hand.length;
  const result = combineBrave(match, "player1", "brave", "host", index);
  assert.equal(result.ok, true);
  assert.equal(result.match.players.player1.field.other[0].combinedWith, "host");
  assert.equal(result.match.players.player1.hand.length, handBefore + 2);
});
