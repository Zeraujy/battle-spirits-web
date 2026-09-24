import test from "node:test";
import assert from "node:assert/strict";

import { normalizeCard, makeCardIndex } from "./cardAdapter.js";
import { createMatch, makePhysicalCard } from "./state.js";
import { getLegalActions } from "./legalActions.js";
import { validateMatchState } from "./stateValidation.js";
import { applyGameAction } from "./reducer.js";
import { createMatchSnapshot, restoreMatchSnapshot, replayStructuredActions } from "./snapshots.js";

const cards = [
  normalizeCard({ id: "S1", namePT: "Spirit Test", cardType: "spirit", colors: ["red"], cost: 0, reduction: [], symbols: ["red"], levels: [{ level: 1, cores: 1, bp: 1000 }] }),
  normalizeCard({ id: "N1", namePT: "Nexus Test", cardType: "nexus", colors: ["blue"], cost: 0, reduction: [], symbols: ["blue"], levels: [{ level: 1, cores: 0 }] }),
  normalizeCard({ id: "M1", namePT: "Magic Test", cardType: "magic", colors: ["yellow"], cost: 0, reduction: [], effects: [] })
];
const index = makeCardIndex(cards);
const deck = Array.from({ length: 40 }, (_, i) => ["S1", "N1", "M1"][i % 3]);

function seededMatch(seed = "v321-test") {
  return createMatch({
    player1: { name: "P1", deck },
    player2: { name: "P2", deck },
    firstPlayerId: "player1",
    cardIndex: index,
    seed
  });
}

test("v3.2.1 seeded matches produce the same card order", () => {
  const a = seededMatch("same-seed");
  const b = seededMatch("same-seed");
  assert.deepEqual(a.players.player1.hand.map((c) => c.cardId), b.players.player1.hand.map((c) => c.cardId));
  assert.deepEqual(a.players.player1.deck.map((c) => c.cardId), b.players.player1.deck.map((c) => c.cardId));
  assert.equal(a.randomSeed, "same-seed");
});

test("v3.2.1 legal actions expose phase advance and playable Main Step cards", () => {
  const match = seededMatch();
  match.phase = "main";
  match.players.player1.hand = [
    { ...makePhysicalCard("S1", index), instanceId: "legal-spirit" },
    { ...makePhysicalCard("N1", index), instanceId: "legal-nexus" },
    { ...makePhysicalCard("M1", index), instanceId: "legal-magic" }
  ];
  const legal = getLegalActions(match, "player1", index);
  const types = legal.map((entry) => entry.type);
  assert.ok(types.includes("ADVANCE_PHASE"));
  assert.ok(legal.some((entry) => entry.action.type === "SUMMON" && entry.action.instanceId === "legal-spirit"));
  assert.ok(legal.some((entry) => entry.action.type === "DEPLOY_NEXUS" && entry.action.instanceId === "legal-nexus"));
  assert.ok(legal.some((entry) => entry.action.type === "USE_MAGIC" && entry.action.instanceId === "legal-magic"));
});

test("v3.2.1 successful actions create a structured action log", () => {
  const match = seededMatch();
  const result = applyGameAction(match, { type: "ADVANCE_PHASE" }, "player1", index);
  assert.equal(result.ok, true);
  assert.equal(result.match.actionLog.length, 1);
  assert.equal(result.match.actionLog[0].sequence, 1);
  assert.equal(result.match.actionLog[0].type, "ADVANCE_PHASE");
  assert.equal(result.match.actionLog[0].phaseBefore, "start");
  assert.equal(result.match.actionLog[0].phaseAfter, "core");
});

test("v3.2.1 integrity validator catches cards duplicated across zones", () => {
  const match = seededMatch();
  const duplicate = match.players.player1.hand[0];
  match.players.player1.trash.push(duplicate);
  const integrity = validateMatchState(match, index);
  assert.equal(integrity.ok, false);
  assert.ok(integrity.errors.some((error) => error.includes(duplicate.instanceId)));
});

test("v3.2.1 snapshots restore and structured actions can be replayed", () => {
  const initial = seededMatch("replay-seed");
  const snapshot = createMatchSnapshot(initial, { label: "before action" });
  const restored = restoreMatchSnapshot(snapshot, index);
  assert.equal(restored.ok, true);
  assert.equal(restored.match.phase, "start");

  const result = applyGameAction(initial, { type: "ADVANCE_PHASE" }, "player1", index);
  assert.equal(result.ok, true);
  const replay = replayStructuredActions(restored.match, result.match.actionLog, index);
  assert.equal(replay.ok, true);
  assert.equal(replay.match.phase, "core");
});
