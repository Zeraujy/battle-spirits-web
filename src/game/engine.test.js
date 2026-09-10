import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCard, makeCardIndex } from "./cardAdapter.js";
import { createMatch, makePhysicalCard } from "./state.js";
import { calculateReduction } from "./cost.js";
import { applyGameAction } from "./reducer.js";
import { getEffectiveBP, getEffectiveCost, getEffectiveColors, getEffectiveFamilies } from "./selectors.js";
import { evaluateBraveCondition, getLegalBraveHosts, getBraveSeparationPreview } from "./brave.js";
import { resolveCardEvent } from "./effectEngine/effectEngine.js";
import { collectFieldTargets } from "./effectEngine/targetResolver.js";

const cards = [
  normalizeCard({ id: "R1", namePT: "Red Test", cardType: "spirit", colors: ["red"], cost: 1, reduction: [], symbols: ["red"], levels: [{ level: 1, cores: 1, bp: 1000 }] }),
  normalizeCard({ id: "R2", namePT: "Red Cost", cardType: "spirit", colors: ["red"], cost: 3, reduction: ["red"], symbols: ["red"], levels: [{ level: 1, cores: 1, bp: 2000 }] }),
  normalizeCard({ id: "B1", namePT: "Test Brave", cardType: "brave", colors: ["red"], cost: 0, reduction: [], symbols: ["red"], braveBP: 2000, braveCondition: { cardTypes: ["spirit"] }, levels: [{ level: 1, cores: 1, bp: 1000 }] }),
  normalizeCard({ id: "B3", namePT: "Legacy Family Brave", cardType: "brave", colors: ["white"], cost: 2, reduction: [], symbols: ["white"], families: ["Machine Beast"], braveBP: 3000, braveCondition: { type: "family", value: "Terra Dragon" }, levels: [{ level: 1, cores: 1, bp: 2000 }] }),
  normalizeCard({ id: "B4", namePT: "Ultimate Cost Brave", cardType: "brave", colors: ["green"], cost: 3, reduction: [], symbols: ["green"], families: ["Exalted Sword"], braveBP: 4000, braveCondition: { type: "costAtLeast", value: 5, cardTypes: ["ultimate"] }, levels: [{ level: 1, cores: 1, bp: 2000 }] }),
  normalizeCard({ id: "TD1", namePT: "Terra Host", cardType: "spirit", colors: ["red"], cost: 4, reduction: [], symbols: ["red"], families: ["Terra Dragon"], levels: [{ level: 1, cores: 1, bp: 4000 }] }),
  normalizeCard({ id: "M1", namePT: "Flash Test", cardType: "magic", colors: ["red"], cost: 0, reduction: [], effects: [{ type: "flash", timing: "flash", operations: [{ type: "draw", count: 1 }] }] }),
  normalizeCard({ id: "BU1", namePT: "Burst One", cardType: "magic", cost: 0, subtypes: ["burst"], effects: [{ type: "burst", timing: "afterLifeDecreases", operations: [] }] }),
  normalizeCard({ id: "BU2", namePT: "Burst Two", cardType: "magic", cost: 0, subtypes: ["burst"], effects: [{ type: "burst", timing: "afterLifeDecreases", operations: [] }] }),
  normalizeCard({ id: "MI1", namePT: "Mirage Test", cardType: "magic", cost: 2, mirage: { cost: 0, reduction: [] }, effects: [{ type: "mirage", timing: "mirage" }] }),
  normalizeCard({ id: "U1", namePT: "Ultimate Test", cardType: "ultimate", colors: ["red"], cost: 5, symbols: ["ultimate"], levels: [{ level: 3, cores: 1, bp: 9000 }], effects: [{ type: "summonCondition", condition: { cardType: "spirit", color: "red", minCount: 1 } }, { type: "ultimateTrigger", timing: "whenAttacks" }] }),
  normalizeCard({ id: "U2", namePT: "Ultimate Trigger Restriction", cardType: "ultimate", colors: ["white"], cost: 5, symbols: ["ultimate"], levels: [{ level: 3, cores: 1, bp: 9000 }], effects: [{ id: "u2-trigger", type: "ultimateTrigger", timing: "whenAttacks", levels: [3], text: { ptBR: "Em um acerto, este Ultimate não pode ser bloqueado por Spirits do oponente.", en: "On a hit, this Ultimate cannot be blocked by opposing Spirits." } }], abilities: [{ id: "u2-hit", event: "ultimateTriggerHit", actions: [{ type: "cannotBeBlockedBySpirits" }] }] }),
  normalizeCard({ id: "U3", namePT: "Level Gated Ultimate", cardType: "ultimate", colors: ["green"], cost: 6, symbols: ["ultimate"], levels: [{ level: 3, cores: 1, bp: 9000 }, { level: 4, cores: 3, bp: 13000 }], effects: [{ id: "u3-trigger", type: "ultimateTrigger", timing: "whenAttacks", levels: [4], text: { ptBR: "Ultimate Trigger no LV4.", en: "Ultimate Trigger at LV4." } }] }),
  normalizeCard({ id: "U4", namePT: "Ultimate Trigger Decision", cardType: "ultimate", colors: ["green"], cost: 7, symbols: ["ultimate"], levels: [{ level: 3, cores: 1, bp: 10000 }], effects: [{ id: "u4-trigger", type: "ultimateTrigger", timing: "whenAttacks", levels: [3], text: { ptBR: "Em um acerto, destrua 1 Spirit do oponente.", en: "On a hit, destroy 1 opposing Spirit." } }], abilities: [{ id: "u4-hit", event: "ultimateTriggerHit", actions: [{ type: "selectTarget", selector: { owner: "opponent", cardTypes: ["spirit"] }, onSelect: { type: "destroy" } }] }] }),
  normalizeCard({ id: "GW1", namePT: "Grandwalker Test", cardType: "Grandwalker Nexus", cost: 3, families: ["Grandwalker"], symbols: ["red"], levels: [{ level: 1, cores: 0, bp: 0 }] }),
  normalizeCard({ id: "E1", namePT: "Summon Draw", cardType: "spirit", colors: ["red"], cost: 0, symbols: ["red"], levels: [{ level: 1, cores: 1, bp: 1000 }], abilities: [{ id: "e1-summon", event: "whenSummoned", actions: [{ type: "draw", amount: 1 }] }] }),
  normalizeCard({ id: "E2", namePT: "Attack BP", cardType: "spirit", colors: ["red"], cost: 0, symbols: ["red"], levels: [{ level: 1, cores: 1, bp: 1000 }], abilities: [{ id: "e2-attack", event: "whenAttacks", levels: [1], actions: [{ type: "modifyBP", amount: 2000, duration: "battle" }] }] }),
  normalizeCard({ id: "N1", namePT: "Deploy Core", cardType: "nexus", colors: ["blue"], cost: 0, symbols: ["blue"], levels: [{ level: 1, cores: 0, bp: 0 }], effects: [{ id: "n1-deploy", timing: "whenDeployed", operations: [{ type: "reserveCoreFromVoid", count: 2 }] }] }),
  normalizeCard({ id: "D1", namePT: "Destroyed Draw", cardType: "spirit", colors: ["red"], cost: 0, symbols: ["red"], levels: [{ level: 1, cores: 1, bp: 1000 }], abilities: [{ id: "d1-destroyed", event: "whenDestroyed", actions: [{ type: "draw", count: 1 }] }] }),
  normalizeCard({ id: "ST1", namePT: "Select Target Test", cardType: "spirit", colors: ["red"], cost: 0, symbols: ["red"], levels: [{ level: 1, cores: 1, bp: 1000 }], abilities: [{ id: "st1-summon", event: "whenSummoned", actions: [{ type: "selectTarget", selector: { owner: "opponent", cardTypes: ["nexus"] }, onSelect: { type: "destroy" } }] }] }),
  normalizeCard({ id: "TR1", namePT: "Trash Target Test", cardType: "spirit", colors: ["red"], cost: 0, symbols: ["red"], levels: [{ level: 1, cores: 1, bp: 1000 }], abilities: [{ id: "tr1-summon", event: "whenSummoned", actions: [{ type: "selectTrashTarget", selector: { owner: "own", cardTypes: ["spirit"] }, onSelect: { type: "returnToHand" } }] }] }),
  normalizeCard({ id: "B2", namePT: "Combined Brave Trigger", cardType: "brave", colors: ["red"], cost: 0, symbols: [], braveBP: 1000, braveCondition: { cardTypes: ["spirit"] }, levels: [{ level: 1, cores: 1, bp: 1000 }], abilities: [{ id: "b2-combined-attack", event: "whenAttacks", requiresCombined: true, actions: [{ type: "draw", amount: 1 }] }] }),
  normalizeCard({ id: "AM1", namePT: "Ambiguous Target", cardType: "spirit", colors: ["red"], cost: 0, symbols: ["red"], levels: [{ level: 1, cores: 1, bp: 1000 }], abilities: [{ id: "am1-summon", event: "whenSummoned", actions: [{ type: "destroy", target: { owner: "opponent", cardTypes: ["spirit"] } }] }] }),
  normalizeCard({ id: "G1", namePT: "Green Symbol", cardType: "spirit", colors: ["green"], cost: 0, symbols: ["green"], levels: [{ level: 1, cores: 1, bp: 1000 }] }),
  normalizeCard({ id: "C1", namePT: "Conditional Test", cardType: "spirit", colors: ["red"], cost: 0, symbols: ["red"], levels: [{ level: 1, cores: 1, bp: 1000 }], abilities: [{ id: "c1-summon", event: "whenSummoned", actions: [{ type: "conditional", condition: { type: "controlsSymbolColor", color: "green" }, actions: [{ type: "draw", amount: 1 }] }] }] }),
  normalizeCard({ id: "CO1", namePT: "Choose Option Test", cardType: "spirit", colors: ["red"], cost: 0, symbols: ["red"], levels: [{ level: 1, cores: 1, bp: 1000 }], abilities: [{ id: "co1-summon", event: "whenSummoned", actions: [{ type: "chooseOption", options: [{ id: "draw", actions: [{ type: "draw", amount: 1 }] }, { id: "core", actions: [{ type: "addCoreFromVoid", amount: 1 }] }] }] }] }),
  normalizeCard({ id: "MT1", namePT: "Multiple Target Test", cardType: "spirit", colors: ["red"], cost: 0, symbols: ["red"], levels: [{ level: 1, cores: 1, bp: 1000 }], abilities: [{ id: "mt1-summon", event: "whenSummoned", actions: [{ type: "selectMultipleTargets", selector: { owner: "opponent", cardTypes: ["spirit"] }, maxTargets: 2, onConfirm: { type: "destroy" } }] }] }),
  normalizeCard({ id: "DQ1", namePT: "Decision Continuation", cardType: "spirit", colors: ["red"], cost: 0, symbols: ["red"], levels: [{ level: 1, cores: 1, bp: 1000 }], abilities: [{ id: "dq1-summon", event: "whenSummoned", actions: [{ type: "selectTarget", selector: { owner: "opponent", cardTypes: ["spirit"] }, onSelect: { type: "destroy" }, afterSelect: [{ type: "draw", amount: 1 }] }, { type: "addCoreToReserveFromVoid", amount: 1 }] }] }),
  normalizeCard({ id: "AT1", namePT: "Attack Decision", cardType: "spirit", colors: ["red"], cost: 0, symbols: ["red"], levels: [{ level: 1, cores: 1, bp: 1000 }], abilities: [{ id: "at1-attack", event: "whenAttacks", actions: [{ type: "selectTarget", selector: { owner: "opponent", cardTypes: ["spirit"] }, onSelect: { type: "destroy" } }] }] })
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
  let r = applyGameAction(match, { type: "DECLARE_ATTACK", instanceId: "ultimate" }, "player1", index);
  assert.equal(r.ok, true);
  assert.equal(r.match.players.player2.trash.length, beforeTrash + 1);
  assert.equal(r.match.battle.stage, "ultimateTrigger");
  assert.equal(r.match.battle.ultimateTrigger.hit, true);
  assert.equal(r.match.battle.ultimateTrigger.revealedCardId, "R1");
  assert.equal(r.manualResolutionNeeded, false);

  // A carta de teste não possui efeito de HIT estruturado; o fallback manual
  // só é sinalizado quando o jogador confirma a resolução do U-Trigger.
  r = applyGameAction(r.match, { type: "RESOLVE_ULTIMATE_TRIGGER" }, "player1", index);
  assert.equal(r.ok, true);
  assert.equal(r.match.battle.stage, "flash1");
  assert.equal(r.manualResolutionNeeded, true);
});

test("Grandwalker/Grandstone-style Nexus cores are not movable as normal field cores", () => {
  let match = matchBase();
  match.phase = "main";
  match.players.player1.field.nexuses = [fieldCard("GW1", "grandwalker", 2)];
  const r = applyGameAction(match, { type: "MOVE_CORE", move: { from: { zone: "card", instanceId: "grandwalker" }, to: { zone: "reserve" }, coreType: "regular" } }, "player1", index);
  assert.equal(r.ok, false);
});


test("Effect Engine resolves legacy abilities on summon automatically", () => {
  let match = matchBase();
  match.phase = "main";
  match.players.player1.hand.unshift({ ...makePhysicalCard("E1", index), instanceId: "e1-hand" });
  const deckBefore = match.players.player1.deck.length;
  const handBefore = match.players.player1.hand.length;
  const r = applyGameAction(match, { type: "SUMMON", instanceId: "e1-hand" }, "player1", index);
  assert.equal(r.ok, true);
  assert.equal(r.match.players.player1.deck.length, deckBefore - 1);
  assert.equal(r.match.players.player1.hand.length, handBefore);
  assert.equal(r.manualResolutionNeeded, false);
});

test("Effect Engine resolves whenAttacks BP modifier using the source as target", () => {
  let match = matchBase();
  match.phase = "attack";
  match.players.player1.field.spirits = [fieldCard("E2", "effect-attacker", 1)];
  let r = applyGameAction(match, { type: "DECLARE_ATTACK", instanceId: "effect-attacker" }, "player1", index);
  assert.equal(r.ok, true);
  const attacker = r.match.players.player1.field.spirits.find((card) => card.instanceId === "effect-attacker");
  assert.equal(attacker.effectModifiers.length, 1);
  assert.equal(getEffectiveBP(r.match, index, attacker), 3000);
  r = applyGameAction(r.match, { type: "PASS_FLASH" }, "player2", index);
  r = applyGameAction(r.match, { type: "PASS_FLASH" }, "player1", index);
  r = applyGameAction(r.match, { type: "DECLINE_BLOCK" }, "player2", index);
  r = applyGameAction(r.match, { type: "RESOLVE_BATTLE" }, "player1", index);
  const afterBattle = r.match.players.player1.field.spirits.find((card) => card.instanceId === "effect-attacker");
  assert.equal(afterBattle.effectModifiers.length, 0);
  assert.equal(getEffectiveBP(r.match, index, afterBattle), 1000);
});

test("Effect Engine resolves Nexus whenDeployed operations", () => {
  let match = matchBase();
  match.phase = "main";
  match.players.player1.hand.unshift({ ...makePhysicalCard("N1", index), instanceId: "n1-hand" });
  const reserveBefore = match.players.player1.reserve;
  const r = applyGameAction(match, { type: "DEPLOY_NEXUS", instanceId: "n1-hand" }, "player1", index);
  assert.equal(r.ok, true);
  assert.equal(r.match.players.player1.reserve, reserveBefore + 2);
  assert.equal(r.manualResolutionNeeded, false);
});

test("Effect Engine resolves whenDestroyed after battle destruction", () => {
  let match = matchBase();
  match.phase = "attack";
  match.players.player1.field.spirits = [fieldCard("D1", "d1-attacker", 1)];
  match.players.player2.field.spirits = [fieldCard("R1", "r1-blocker", 1)];
  const deckBefore = match.players.player1.deck.length;
  let r = applyGameAction(match, { type: "DECLARE_ATTACK", instanceId: "d1-attacker" }, "player1", index);
  r = applyGameAction(r.match, { type: "PASS_FLASH" }, "player2", index);
  r = applyGameAction(r.match, { type: "PASS_FLASH" }, "player1", index);
  r = applyGameAction(r.match, { type: "DECLARE_BLOCK", instanceId: "r1-blocker" }, "player2", index);
  r = applyGameAction(r.match, { type: "PASS_FLASH" }, "player2", index);
  r = applyGameAction(r.match, { type: "PASS_FLASH" }, "player1", index);
  r = applyGameAction(r.match, { type: "RESOLVE_BATTLE" }, "player1", index);
  assert.equal(r.ok, true);
  assert.equal(r.match.players.player1.deck.length, deckBefore - 1);
  assert.equal(r.match.players.player1.trash.some((card) => card.cardId === "D1"), true);
});

test("Effect Engine falls back to manual resolution when a target choice is ambiguous", () => {
  let match = matchBase();
  match.players.player1.field.spirits = [fieldCard("AM1", "ambiguous-source", 1)];
  match.players.player2.field.spirits = [fieldCard("R1", "target-a", 1), fieldCard("R2", "target-b", 1)];
  const result = resolveCardEvent(match, { event: "whenSummoned", sourcePlayerId: "player1", sourceInstanceId: "ambiguous-source" }, index);
  assert.equal(result.manualResolutionNeeded, true);
  assert.equal(result.match.players.player2.field.spirits.length, 2);
  assert.match(result.notes.join(" "), /Escolha manual/i);
});


test("Effect Engine understands selectTarget + onSelect from the current database format", () => {
  let match = matchBase();
  match.players.player1.field.spirits = [fieldCard("ST1", "select-source", 1)];
  match.players.player2.field.nexuses = [fieldCard("N1", "only-nexus", 0)];
  const result = resolveCardEvent(match, { event: "whenSummoned", sourcePlayerId: "player1", sourceInstanceId: "select-source" }, index);
  assert.equal(result.manualResolutionNeeded, false);
  assert.equal(result.match.players.player2.field.nexuses.length, 0);
  assert.equal(result.match.players.player2.trash.some((card) => card.instanceId === "only-nexus"), true);
});

test("Effect Engine understands selectTrashTarget and returns the selected card to hand", () => {
  let match = matchBase();
  match.players.player1.field.spirits = [fieldCard("TR1", "trash-source", 1)];
  match.players.player1.trash = [{ ...makePhysicalCard("R1", index), instanceId: "trash-spirit" }];
  const result = resolveCardEvent(match, { event: "whenSummoned", sourcePlayerId: "player1", sourceInstanceId: "trash-source" }, index);
  assert.equal(result.manualResolutionNeeded, false);
  assert.equal(result.match.players.player1.trash.length, 0);
  assert.equal(result.match.players.player1.hand.some((card) => card.instanceId === "trash-spirit"), true);
});

test("Combined Brave whenAttacks ability is triggered through its host", () => {
  let match = matchBase();
  match.phase = "main";
  match.players.player1.field.spirits = [fieldCard("R1", "brave-host", 1)];
  match.players.player1.field.other = [fieldCard("B2", "brave-trigger", 1)];
  let r = applyGameAction(match, { type: "COMBINE_BRAVE", braveInstanceId: "brave-trigger", hostInstanceId: "brave-host" }, "player1", index);
  assert.equal(r.ok, true);
  match = r.match;
  match.phase = "attack";
  const deckBefore = match.players.player1.deck.length;
  r = applyGameAction(match, { type: "DECLARE_ATTACK", instanceId: "brave-host" }, "player1", index);
  assert.equal(r.ok, true);
  assert.equal(r.match.players.player1.deck.length, deckBefore - 1);
});


test("Effect Engine understands controlsSymbolColor conditions used by Rush-style abilities", () => {
  let match = matchBase();
  match.players.player1.field.spirits = [fieldCard("C1", "conditional-source", 1)];
  const beforeWithoutGreen = match.players.player1.deck.length;
  let result = resolveCardEvent(match, { event: "whenSummoned", sourcePlayerId: "player1", sourceInstanceId: "conditional-source" }, index);
  assert.equal(result.match.players.player1.deck.length, beforeWithoutGreen);

  match = matchBase();
  match.players.player1.field.spirits = [fieldCard("C1", "conditional-source", 1), fieldCard("G1", "green-symbol", 1)];
  const beforeWithGreen = match.players.player1.deck.length;
  result = resolveCardEvent(match, { event: "whenSummoned", sourcePlayerId: "player1", sourceInstanceId: "conditional-source" }, index);
  assert.equal(result.match.players.player1.deck.length, beforeWithGreen - 1);
  assert.equal(result.manualResolutionNeeded, false);
});

test("Effect Engine keeps chooseOption manual when more than one valid option exists", () => {
  let match = matchBase();
  match.players.player1.field.spirits = [fieldCard("CO1", "choose-source", 1)];
  const deckBefore = match.players.player1.deck.length;
  const result = resolveCardEvent(match, { event: "whenSummoned", sourcePlayerId: "player1", sourceInstanceId: "choose-source" }, index);
  assert.equal(result.manualResolutionNeeded, true);
  assert.equal(result.match.players.player1.deck.length, deckBefore);
  assert.match(result.notes.join(" "), /Escolha manual/i);
});

test("Effect Engine recognizes selectMultipleTargets and waits for the player choice", () => {
  let match = matchBase();
  match.players.player1.field.spirits = [fieldCard("MT1", "multiple-source", 1)];
  match.players.player2.field.spirits = [fieldCard("R1", "multi-a", 1), fieldCard("R2", "multi-b", 1)];
  const result = resolveCardEvent(match, { event: "whenSummoned", sourcePlayerId: "player1", sourceInstanceId: "multiple-source" }, index);
  assert.equal(result.manualResolutionNeeded, true);
  assert.equal(result.match.players.player2.field.spirits.length, 2);
  assert.match(result.notes.join(" "), /múltiplos alvos|Escolha manual/i);
});


test("Decision Queue resolves an ambiguous direct target through the reducer", () => {
  let match = matchBase();
  match.players.player1.field.spirits = [fieldCard("AM1", "ambiguous-source", 1)];
  match.players.player2.field.spirits = [fieldCard("R1", "target-a", 1), fieldCard("R2", "target-b", 1)];
  const event = resolveCardEvent(match, { event: "whenSummoned", sourcePlayerId: "player1", sourceInstanceId: "ambiguous-source" }, index);
  assert.equal(event.match.pendingEffectDecision?.kind, "selectTarget");
  assert.equal(event.match.pendingEffectDecision?.candidates.length, 2);
  const r = applyGameAction(event.match, { type: "RESOLVE_EFFECT_DECISION", payload: { selectedInstanceIds: ["target-a"] } }, "player1", index);
  assert.equal(r.ok, true);
  assert.equal(r.match.pendingEffectDecision, null);
  assert.equal(r.match.players.player2.field.spirits.some((card) => card.instanceId === "target-a"), false);
  assert.equal(r.match.players.player2.field.spirits.some((card) => card.instanceId === "target-b"), true);
});

test("Decision Queue resolves chooseOption and continues automatically", () => {
  let match = matchBase();
  match.players.player1.field.spirits = [fieldCard("CO1", "choose-source", 1)];
  const deckBefore = match.players.player1.deck.length;
  const event = resolveCardEvent(match, { event: "whenSummoned", sourcePlayerId: "player1", sourceInstanceId: "choose-source" }, index);
  assert.equal(event.match.pendingEffectDecision?.kind, "chooseOption");
  const r = applyGameAction(event.match, { type: "RESOLVE_EFFECT_DECISION", payload: { optionId: "draw" } }, "player1", index);
  assert.equal(r.ok, true);
  assert.equal(r.match.pendingEffectDecision, null);
  assert.equal(r.match.players.player1.deck.length, deckBefore - 1);
});

test("Decision Queue resolves multiple targets", () => {
  let match = matchBase();
  match.players.player1.field.spirits = [fieldCard("MT1", "multiple-source", 1)];
  match.players.player2.field.spirits = [fieldCard("R1", "multi-a", 1), fieldCard("R2", "multi-b", 1), fieldCard("R1", "multi-c", 1)];
  const event = resolveCardEvent(match, { event: "whenSummoned", sourcePlayerId: "player1", sourceInstanceId: "multiple-source" }, index);
  assert.equal(event.match.pendingEffectDecision?.kind, "selectMultipleTargets");
  const r = applyGameAction(event.match, { type: "RESOLVE_EFFECT_DECISION", payload: { selectedInstanceIds: ["multi-a", "multi-b"] } }, "player1", index);
  assert.equal(r.ok, true);
  assert.equal(r.match.pendingEffectDecision, null);
  assert.equal(r.match.players.player2.field.spirits.length, 1);
  assert.equal(r.match.players.player2.field.spirits[0].instanceId, "multi-c");
});

test("Decision Queue resolves Trash target selection", () => {
  let match = matchBase();
  match.players.player1.field.spirits = [fieldCard("TR1", "trash-source", 1)];
  match.players.player1.trash = [
    { ...makePhysicalCard("R1", index), instanceId: "trash-a" },
    { ...makePhysicalCard("R2", index), instanceId: "trash-b" }
  ];
  const event = resolveCardEvent(match, { event: "whenSummoned", sourcePlayerId: "player1", sourceInstanceId: "trash-source" }, index);
  assert.equal(event.match.pendingEffectDecision?.kind, "selectTrashTarget");
  const r = applyGameAction(event.match, { type: "RESOLVE_EFFECT_DECISION", payload: { selectedInstanceIds: ["trash-b"] } }, "player1", index);
  assert.equal(r.ok, true);
  assert.equal(r.match.pendingEffectDecision, null);
  assert.equal(r.match.players.player1.trash.some((card) => card.instanceId === "trash-b"), false);
  assert.equal(r.match.players.player1.hand.some((card) => card.instanceId === "trash-b"), true);
});

test("Decision Queue preserves afterSelect and remaining actions", () => {
  let match = matchBase();
  match.players.player1.field.spirits = [fieldCard("DQ1", "dq-source", 1)];
  match.players.player2.field.spirits = [fieldCard("R1", "dq-a", 1), fieldCard("R2", "dq-b", 1)];
  const deckBefore = match.players.player1.deck.length;
  const reserveBefore = match.players.player1.reserve;
  const event = resolveCardEvent(match, { event: "whenSummoned", sourcePlayerId: "player1", sourceInstanceId: "dq-source" }, index);
  assert.equal(event.match.pendingEffectDecision?.kind, "selectTarget");
  const r = applyGameAction(event.match, { type: "RESOLVE_EFFECT_DECISION", payload: { selectedInstanceIds: ["dq-a"] } }, "player1", index);
  assert.equal(r.ok, true);
  assert.equal(r.match.pendingEffectDecision, null);
  assert.equal(r.match.players.player2.field.spirits.some((card) => card.instanceId === "dq-a"), false);
  assert.equal(r.match.players.player1.deck.length, deckBefore - 1);
  assert.equal(r.match.players.player1.reserve, reserveBefore + 1);
});

test("Reducer blocks unrelated game actions while an effect decision is pending", () => {
  let match = matchBase();
  match.players.player1.field.spirits = [fieldCard("AM1", "ambiguous-source", 1)];
  match.players.player2.field.spirits = [fieldCard("R1", "target-a", 1), fieldCard("R2", "target-b", 1)];
  match = resolveCardEvent(match, { event: "whenSummoned", sourcePlayerId: "player1", sourceInstanceId: "ambiguous-source" }, index).match;
  const r = applyGameAction(match, { type: "ADVANCE_PHASE" }, "player1", index);
  assert.equal(r.ok, false);
  assert.match(r.error, /decisão de efeito pendente/i);
});


test("Decision Queue preserves a Combined Brave trigger queued behind another decision", () => {
  let match = matchBase();
  match.phase = "main";
  match.players.player1.field.spirits = [fieldCard("AT1", "queue-host", 1)];
  match.players.player1.field.other = [fieldCard("B2", "queue-brave", 1)];
  let r = applyGameAction(match, { type: "COMBINE_BRAVE", braveInstanceId: "queue-brave", hostInstanceId: "queue-host" }, "player1", index);
  assert.equal(r.ok, true);
  match = r.match;
  match.phase = "attack";
  match.players.player2.field.spirits = [fieldCard("R1", "queue-target-a", 1), fieldCard("R2", "queue-target-b", 1)];
  const deckBefore = match.players.player1.deck.length;
  r = applyGameAction(match, { type: "DECLARE_ATTACK", instanceId: "queue-host" }, "player1", index);
  assert.equal(r.ok, true);
  assert.equal(r.match.pendingEffectDecision?.kind, "selectTarget");
  assert.equal(r.match.pendingEffectDecision?.continuationEvents?.length, 1);
  r = applyGameAction(r.match, { type: "RESOLVE_EFFECT_DECISION", payload: { selectedInstanceIds: ["queue-target-a"] } }, "player1", index);
  assert.equal(r.ok, true);
  assert.equal(r.match.pendingEffectDecision, null);
  assert.equal(r.match.players.player1.deck.length, deckBefore - 1);
});


test("Brave v2 understands legacy family Combine conditions", () => {
  const brave = index.get("B3");
  const terra = index.get("TD1");
  const wrong = index.get("R1");
  const ok = evaluateBraveCondition(brave, terra);
  const fail = evaluateBraveCondition(brave, wrong);
  assert.equal(ok.matches, true);
  assert.equal(ok.manual, false);
  assert.equal(fail.matches, false);
  assert.match(fail.reason, /família|family/i);
});

test("Brave v2 exposes only legal structured Combine hosts", () => {
  let match = matchBase();
  match.phase = "main";
  match.players.player1.field.other = [fieldCard("B3", "legacy-brave", 1)];
  match.players.player1.field.spirits = [
    fieldCard("R1", "wrong-host", 1),
    fieldCard("TD1", "terra-host", 1)
  ];
  const hosts = getLegalBraveHosts(match, "player1", "legacy-brave", index);
  assert.deepEqual(hosts.map((item) => item.physical.instanceId), ["terra-host"]);
});

test("Brave v2 rejects a structured Combine condition even when confirmCondition is true", () => {
  let match = matchBase();
  match.phase = "main";
  match.players.player1.field.other = [fieldCard("B3", "legacy-brave", 1)];
  match.players.player1.field.spirits = [fieldCard("R1", "wrong-host", 1)];
  const r = applyGameAction(match, {
    type: "COMBINE_BRAVE",
    braveInstanceId: "legacy-brave",
    hostInstanceId: "wrong-host",
    options: { confirmCondition: true }
  }, "player1", index);
  assert.equal(r.ok, false);
});

test("Brave v2 adds Cost and Color but preserves the host Family while combined", () => {
  let match = matchBase();
  match.phase = "main";
  match.players.player1.field.other = [fieldCard("B4", "cost-brave", 1)];
  match.players.player1.field.spirits = [fieldCard("U2", "ultimate-host", 1)];
  let r = applyGameAction(match, {
    type: "COMBINE_BRAVE",
    braveInstanceId: "cost-brave",
    hostInstanceId: "ultimate-host"
  }, "player1", index);
  assert.equal(r.ok, true);
  const host = r.match.players.player1.field.spirits.find((card) => card.instanceId === "ultimate-host");
  assert.equal(getEffectiveCost(r.match, index, host), 8);
  assert.deepEqual(new Set(getEffectiveColors(r.match, index, host)), new Set(["white", "green"]));
  assert.equal(getEffectiveFamilies(r.match, index, host).includes("Exalted Sword"), false);
});

test("Brave v2 separation preview reports whether the Brave can maintain LV1", () => {
  let match = matchBase();
  match.phase = "main";
  match.players.player1.reserve = 0;
  match.players.player1.soulCore = { zone: "trash", instanceId: null };
  match.players.player1.field.spirits = [fieldCard("TD1", "host", 2)];
  match.players.player1.field.other = [{ ...fieldCard("B3", "brave", 0), combinedWith: "host" }];
  const preview = getBraveSeparationPreview(match, "player1", "brave", index);
  assert.equal(preview.minimum, 1);
  assert.equal(preview.hostRegular, 2);
  assert.equal(preview.survives, true);
});

test("Ultimate Trigger v2 pauses the battle before Flash Timing 1", () => {
  let match = matchBase();
  match.phase = "attack";
  match.players.player1.field.spirits = [fieldCard("U2", "u2", 1)];
  match.players.player2.deck = [{ ...makePhysicalCard("R1", index), instanceId: "trigger-reveal" }, ...match.players.player2.deck];
  const beforeTrash = match.players.player2.trash.length;
  const r = applyGameAction(match, { type: "DECLARE_ATTACK", instanceId: "u2" }, "player1", index);
  assert.equal(r.ok, true);
  assert.equal(r.match.battle.stage, "ultimateTrigger");
  assert.equal(r.match.battle.flash, null);
  assert.equal(r.match.battle.ultimateTrigger.hit, true);
  assert.equal(r.match.players.player2.trash.length, beforeTrash + 1);
});

test("Ultimate Trigger v2 resolves HIT effects before Flash Timing 1", () => {
  let match = matchBase();
  match.phase = "attack";
  match.players.player1.field.spirits = [fieldCard("U2", "u2", 1)];
  match.players.player2.deck = [{ ...makePhysicalCard("R1", index), instanceId: "trigger-reveal" }, ...match.players.player2.deck];
  let r = applyGameAction(match, { type: "DECLARE_ATTACK", instanceId: "u2" }, "player1", index);
  r = applyGameAction(r.match, { type: "RESOLVE_ULTIMATE_TRIGGER" }, "player1", index);
  assert.equal(r.ok, true);
  assert.equal(r.match.battle.stage, "flash1");
  assert.equal(r.match.battle.flash.priorityPlayerId, "player2");
  assert.equal(r.match.battle.restrictions.spiritsCannotBlock, true);
  assert.equal(r.manualResolutionNeeded, false);
});

test("Ultimate Trigger HIT restriction prevents Spirit and Brave-in-Spirit-State blockers", () => {
  let match = matchBase();
  match.phase = "attack";
  match.players.player1.field.spirits = [fieldCard("U2", "u2", 1)];
  match.players.player2.field.spirits = [fieldCard("R1", "spirit-blocker", 1)];
  match.players.player2.field.other = [fieldCard("B1", "brave-blocker", 1)];
  match.players.player2.deck = [{ ...makePhysicalCard("R1", index), instanceId: "trigger-reveal" }, ...match.players.player2.deck];
  let r = applyGameAction(match, { type: "DECLARE_ATTACK", instanceId: "u2" }, "player1", index);
  r = applyGameAction(r.match, { type: "RESOLVE_ULTIMATE_TRIGGER" }, "player1", index);
  r = applyGameAction(r.match, { type: "PASS_FLASH" }, "player2", index);
  r = applyGameAction(r.match, { type: "PASS_FLASH" }, "player1", index);
  assert.equal(r.match.battle.stage, "block");
  const spiritBlock = applyGameAction(r.match, { type: "DECLARE_BLOCK", instanceId: "spirit-blocker" }, "player2", index);
  const braveBlock = applyGameAction(r.match, { type: "DECLARE_BLOCK", instanceId: "brave-blocker" }, "player2", index);
  assert.equal(spiritBlock.ok, false);
  assert.equal(braveBlock.ok, false);
});

test("Ultimate Trigger v2 respects the effect Level requirement", () => {
  let match = matchBase();
  match.phase = "attack";
  match.players.player1.field.spirits = [fieldCard("U3", "u3", 1)];
  const deckBefore = match.players.player2.deck.length;
  const r = applyGameAction(match, { type: "DECLARE_ATTACK", instanceId: "u3" }, "player1", index);
  assert.equal(r.ok, true);
  assert.equal(r.match.battle.stage, "flash1");
  assert.equal(r.match.battle.ultimateTrigger, undefined);
  assert.equal(r.match.players.player2.deck.length, deckBefore);
});

test("Ultimate Trigger v2 uses the combined Brave Cost for HIT/GUARD comparison", () => {
  let match = matchBase();
  match.phase = "main";
  match.players.player1.field.spirits = [fieldCard("U2", "u2", 1)];
  match.players.player1.field.other = [fieldCard("B4", "cost-brave", 1)];
  let r = applyGameAction(match, { type: "COMBINE_BRAVE", braveInstanceId: "cost-brave", hostInstanceId: "u2" }, "player1", index);
  assert.equal(r.ok, true);
  match = r.match;
  match.phase = "attack";
  // U2 Cost 5 + Brave Cost 3 = 8. A Cost 7 deve produzir HIT.
  match.players.player2.deck = [{ ...makePhysicalCard("U4", index), instanceId: "cost-seven" }, ...match.players.player2.deck];
  r = applyGameAction(match, { type: "DECLARE_ATTACK", instanceId: "u2" }, "player1", index);
  assert.equal(r.match.battle.ultimateTrigger.sourceCost, 8);
  assert.equal(r.match.battle.ultimateTrigger.revealedCost, 7);
  assert.equal(r.match.battle.ultimateTrigger.hit, true);
});

test("Ultimate Trigger v2 resumes automatically after a Decision Queue choice", () => {
  let match = matchBase();
  match.phase = "attack";
  match.players.player1.field.spirits = [fieldCard("U4", "u4", 1)];
  match.players.player2.field.spirits = [
    fieldCard("R1", "target-a", 1),
    fieldCard("R2", "target-b", 1)
  ];
  match.players.player2.deck = [{ ...makePhysicalCard("R1", index), instanceId: "trigger-reveal" }, ...match.players.player2.deck];
  let r = applyGameAction(match, { type: "DECLARE_ATTACK", instanceId: "u4" }, "player1", index);
  assert.equal(r.match.battle.stage, "ultimateTrigger");
  r = applyGameAction(r.match, { type: "RESOLVE_ULTIMATE_TRIGGER" }, "player1", index);
  assert.equal(r.ok, true);
  assert.equal(r.match.pendingEffectDecision?.kind, "selectTarget");
  assert.equal(r.match.battle.stage, "ultimateTrigger");
  r = applyGameAction(r.match, {
    type: "RESOLVE_EFFECT_DECISION",
    payload: { selectedInstanceIds: ["target-a"] }
  }, "player1", index);
  assert.equal(r.ok, true);
  assert.equal(r.match.pendingEffectDecision, null);
  assert.equal(r.match.battle.stage, "flash1");
  assert.equal(r.match.players.player2.field.spirits.some((card) => card.instanceId === "target-a"), false);
});


test("Brave v2 treats an uncombined Brave as a Spirit for effect targeting", () => {
  const match = matchBase();
  match.players.player2.field.other = [fieldCard("B1", "spirit-state-brave", 1)];
  const targets = collectFieldTargets(match, index, { owner: "opponent", cardTypes: ["spirit"] }, { sourcePlayerId: "player1" });
  assert.equal(targets.some((entry) => entry.physical.instanceId === "spirit-state-brave"), true);
});

test("Ultimate Trigger v2 treats equal Cost as GUARD", () => {
  let match = matchBase();
  match.phase = "attack";
  match.players.player1.field.spirits = [fieldCard("U2", "u2", 1)];
  match.players.player2.deck = [{ ...makePhysicalCard("U1", index), instanceId: "equal-five" }, ...match.players.player2.deck];
  const r = applyGameAction(match, { type: "DECLARE_ATTACK", instanceId: "u2" }, "player1", index);
  assert.equal(r.ok, true);
  assert.equal(r.match.battle.ultimateTrigger.sourceCost, 5);
  assert.equal(r.match.battle.ultimateTrigger.revealedCost, 5);
  assert.equal(r.match.battle.ultimateTrigger.hit, false);
});

test("Ultimate Trigger v2 can only be resolved by its controller", () => {
  let match = matchBase();
  match.phase = "attack";
  match.players.player1.field.spirits = [fieldCard("U2", "u2", 1)];
  match.players.player2.deck = [{ ...makePhysicalCard("R1", index), instanceId: "trigger-reveal" }, ...match.players.player2.deck];
  const attack = applyGameAction(match, { type: "DECLARE_ATTACK", instanceId: "u2" }, "player1", index);
  const wrong = applyGameAction(attack.match, { type: "RESOLVE_ULTIMATE_TRIGGER" }, "player2", index);
  assert.equal(wrong.ok, false);
  assert.match(wrong.error, /atacante|jogador/i);
});

test("Ultimate Trigger v2 blocks Flash actions until its stage is resolved", () => {
  let match = matchBase();
  match.phase = "attack";
  match.players.player1.field.spirits = [fieldCard("U2", "u2", 1)];
  match.players.player2.deck = [{ ...makePhysicalCard("R1", index), instanceId: "trigger-reveal" }, ...match.players.player2.deck];
  const attack = applyGameAction(match, { type: "DECLARE_ATTACK", instanceId: "u2" }, "player1", index);
  const earlyPass = applyGameAction(attack.match, { type: "PASS_FLASH" }, "player2", index);
  assert.equal(earlyPass.ok, false);
  assert.match(earlyPass.error, /Ultimate Trigger/i);
});
