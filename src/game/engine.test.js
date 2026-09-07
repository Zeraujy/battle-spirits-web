import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCard, makeCardIndex } from "./cardAdapter.js";
import { createMatch, makePhysicalCard } from "./state.js";
import { calculateReduction } from "./cost.js";
import { applyGameAction } from "./reducer.js";
import { getEffectiveBP } from "./selectors.js";

const cards = [
  normalizeCard({ id: "R1", namePT: "Red Test", cardType: "spirit", colors: ["red"], cost: 1, reduction: [], symbols: ["red"], levels: [{ level: 1, cores: 1, bp: 1000 }] }),
  normalizeCard({ id: "R2", namePT: "Red Cost", cardType: "spirit", colors: ["red"], cost: 3, reduction: ["red"], symbols: ["red"], levels: [{ level: 1, cores: 1, bp: 2000 }] }),
  normalizeCard({ id: "B1", namePT: "Test Brave", cardType: "brave", colors: ["red"], cost: 0, reduction: [], symbols: ["red"], braveBP: 2000, braveCondition: { cardTypes: ["spirit"] }, levels: [{ level: 1, cores: 1, bp: 1000 }] }),
  normalizeCard({ id: "M1", namePT: "Flash Test", cardType: "magic", colors: ["red"], cost: 0, reduction: [], effects: [{ type: "flash", timing: "flash", operations: [{ type: "draw", count: 1 }] }] }),
  normalizeCard({ id: "BU1", namePT: "Burst One", cardType: "magic", cost: 0, subtypes: ["burst"], effects: [{ type: "burst", timing: "afterLifeDecreases", operations: [] }] }),
  normalizeCard({ id: "BU2", namePT: "Burst Two", cardType: "magic", cost: 0, subtypes: ["burst"], effects: [{ type: "burst", timing: "afterLifeDecreases", operations: [] }] }),
  normalizeCard({ id: "MI1", namePT: "Mirage Test", cardType: "magic", cost: 2, mirage: { cost: 0, reduction: [] }, effects: [{ type: "mirage", timing: "mirage" }] }),
  normalizeCard({ id: "U1", namePT: "Ultimate Test", cardType: "ultimate", colors: ["red"], cost: 5, symbols: ["ultimate"], levels: [{ level: 3, cores: 1, bp: 9000 }], effects: [{ type: "summonCondition", condition: { cardType: "spirit", color: "red", minCount: 1 } }, { type: "ultimateTrigger", timing: "whenAttacks" }] }),
  normalizeCard({ id: "GW1", namePT: "Grandwalker Test", cardType: "Grandwalker Nexus", cost: 3, families: ["Grandwalker"], symbols: ["red"], levels: [{ level: 1, cores: 0, bp: 0 }] })
];
const index = makeCardIndex(cards);
const deck = Array.from({ length: 40 }, (_, i) => (i % 2 ? "R1" : "R2"));

function matchBase() {
  return createMatch({ player1: { name: "A", deck }, player2: { name: "B", deck }, firstPlayerId: "player1", cardIndex: index, random: () => 0.42 });
}

function fieldCard(id, instanceId, cores = 1) {
  return { ...makePhysicalCard(id, index), instanceId, cores: { regular: cores, soul: false } };
}

test("match starts with Eternal defaults", () => {
  const match = matchBase();
  assert.equal(match.players.player1.life, 5);
  assert.equal(match.players.player1.reserve, 3);
  assert.equal(match.players.player1.hand.length, 4);
  assert.equal(match.phase, "start");
  assert.equal(match.players.player1.soulCore.zone, "reserve");
});

test("first player skips core and attack on first turn via phase flow", () => {
  let match = matchBase();
  let result = applyGameAction(match, { type: "ADVANCE_PHASE" }, "player1", index);
  assert.equal(result.match.phase, "core");
  assert.equal(result.match.players.player1.reserve, 3);
  match = result.match;
  for (let i = 0; i < 4; i += 1) match = applyGameAction(match, { type: "ADVANCE_PHASE" }, "player1", index).match;
  assert.equal(match.phase, "end");
});

test("reduction uses matching field symbols", () => {
  const match = matchBase();
  match.players.player1.field.spirits.push(fieldCard("R1", "x"));
  const cost = calculateReduction(match, "player1", index.get("R2"), index);
  assert.equal(cost.payable, 2);
});

test("battle follows flash1 -> block -> resolve and unblocked damage uses symbols", () => {
  let match = matchBase();
  match.phase = "attack";
  match.players.player1.field.spirits = [fieldCard("R1", "attacker")];
  let r = applyGameAction(match, { type: "DECLARE_ATTACK", instanceId: "attacker" }, "player1", index);
  assert.equal(r.match.battle.stage, "flash1");
  r = applyGameAction(r.match, { type: "PASS_FLASH" }, "player2", index);
  r = applyGameAction(r.match, { type: "PASS_FLASH" }, "player1", index);
  assert.equal(r.match.battle.stage, "block");
  r = applyGameAction(r.match, { type: "DECLINE_BLOCK" }, "player2", index);
  assert.equal(r.match.battle.stage, "resolve");
  r = applyGameAction(r.match, { type: "RESOLVE_BATTLE" }, "player1", index);
  assert.equal(r.match.players.player2.life, 4);
  assert.equal(r.match.players.player2.reserve, 4);
  assert.equal(r.match.battle, null);
});

test("using Magic during Flash resets passes and transfers priority", () => {
  let match = matchBase();
  match.phase = "attack";
  match.players.player1.field.spirits = [fieldCard("R1", "attacker")];
  match.players.player2.hand.unshift({ ...makePhysicalCard("M1", index), instanceId: "magic" });
  match = applyGameAction(match, { type: "DECLARE_ATTACK", instanceId: "attacker" }, "player1", index).match;
  const r = applyGameAction(match, { type: "USE_MAGIC", instanceId: "magic", options: { mode: "flash" } }, "player2", index);
  assert.equal(r.ok, true);
  assert.equal(r.match.battle.flash.priorityPlayerId, "player1");
  assert.equal(r.match.battle.flash.consecutivePasses, 0);
  assert.equal(r.match.players.player2.trash.at(-1).cardId, "M1");
});

test("Brave combine moves its cores to the host and adds BP", () => {
  let match = matchBase();
  match.phase = "main";
  match.players.player1.field.spirits = [fieldCard("R1", "host", 1)];
  match.players.player1.field.other = [fieldCard("B1", "brave", 1)];
  const r = applyGameAction(match, { type: "COMBINE_BRAVE", braveInstanceId: "brave", hostInstanceId: "host" }, "player1", index);
  assert.equal(r.ok, true);
  assert.equal(r.match.players.player1.field.spirits[0].cores.regular, 2);
  assert.equal(r.match.players.player1.field.other[0].combinedWith, "host");
  assert.equal(getEffectiveBP(r.match, index, r.match.players.player1.field.spirits[0]), 3000);
});

test("Brave can be summoned directly combined without needing Lv1 cores on itself", () => {
  let match = matchBase();
  match.phase = "main";
  match.players.player1.field.spirits = [fieldCard("R1", "host", 1)];
  match.players.player1.hand.unshift({ ...makePhysicalCard("B1", index), instanceId: "brave-hand" });
  const reserveBefore = match.players.player1.reserve;
  const r = applyGameAction(match, { type: "SUMMON", instanceId: "brave-hand", options: { directCombineHostInstanceId: "host" } }, "player1", index);
  assert.equal(r.ok, true);
  const brave = r.match.players.player1.field.other.find((c) => c.cardId === "B1");
  assert.equal(brave.combinedWith, "host");
  assert.equal(brave.cores.regular, 0);
  assert.equal(r.match.players.player1.reserve, reserveBefore);
});

test("Set Burst is limited to one set action per turn", () => {
  let match = matchBase();
  match.phase = "main";
  match.players.player1.hand.unshift({ ...makePhysicalCard("BU1", index), instanceId: "bu1" }, { ...makePhysicalCard("BU2", index), instanceId: "bu2" });
  let r = applyGameAction(match, { type: "SET_BURST", instanceId: "bu1" }, "player1", index);
  assert.equal(r.ok, true);
  r = applyGameAction(r.match, { type: "SET_BURST", instanceId: "bu2" }, "player1", index);
  assert.equal(r.ok, false);
});

test("Mirage uses its own cost and has a separate once-per-turn set action", () => {
  let match = matchBase();
  match.phase = "main";
  match.players.player1.hand.unshift({ ...makePhysicalCard("MI1", index), instanceId: "mi1" });
  const reserveBefore = match.players.player1.reserve;
  const r = applyGameAction(match, { type: "SET_MIRAGE", instanceId: "mi1" }, "player1", index);
  assert.equal(r.ok, true);
  assert.equal(r.match.players.player1.mirage.cardId, "MI1");
  assert.equal(r.match.players.player1.reserve, reserveBefore);
  assert.equal(r.match.players.player1.turnFlags.mirageSet, true);
});


test("Ultimate enforces a structured Summoning Condition", () => {
  let match = matchBase();
  match.phase = "main";
  match.players.player1.hand.unshift({ ...makePhysicalCard("U1", index), instanceId: "ultimate-hand" });
  let r = applyGameAction(match, { type: "SUMMON", instanceId: "ultimate-hand" }, "player1", index);
  assert.equal(r.ok, false);
  match.players.player1.field.spirits = [fieldCard("R1", "condition-spirit")];
  // Cost 5 is intentionally too high after condition succeeds, proving condition is checked separately.
  r = applyGameAction(match, { type: "SUMMON", instanceId: "ultimate-hand" }, "player1", index);
  assert.equal(r.ok, false);
  assert.match(r.error, /Cores insuficientes|custo/i);
});

test("Ultimate Trigger reveals the opponent top card and records HIT/GUARD state", () => {
  let match = matchBase();
  match.phase = "attack";
  match.players.player1.field.spirits = [fieldCard("U1", "ultimate", 1)];
  match.players.player2.deck = [{ ...makePhysicalCard("R1", index), instanceId: "revealed" }, ...match.players.player2.deck];
  const beforeTrash = match.players.player2.trash.length;
  const r = applyGameAction(match, { type: "DECLARE_ATTACK", instanceId: "ultimate" }, "player1", index);
  assert.equal(r.ok, true);
  assert.equal(r.match.players.player2.trash.length, beforeTrash + 1);
  assert.equal(r.match.battle.ultimateTrigger.hit, true);
  assert.equal(r.match.battle.ultimateTrigger.revealedCardId, "R1");
  assert.equal(r.manualResolutionNeeded, true);
});

test("Grandwalker/Grandstone-style Nexus cores are not movable as normal field cores", () => {
  let match = matchBase();
  match.phase = "main";
  match.players.player1.field.nexuses = [fieldCard("GW1", "grandwalker", 2)];
  const r = applyGameAction(match, { type: "MOVE_CORE", move: { from: { zone: "card", instanceId: "grandwalker" }, to: { zone: "reserve" }, coreType: "regular" } }, "player1", index);
  assert.equal(r.ok, false);
});
