import test from "node:test";
import assert from "node:assert/strict";

import { buildAITacticalMemory, tacticalMemoryActionBias } from "./aiTacticalMemory.js";

function makeMatch(overrides = {}) {
  return {
    turnNumber: 6,
    players: {
      player1: {
        life: 4,
        reserve: 3,
        hand: [{ cardId: "SECRET-A" }],
        deck: [{ cardId: "HIDDEN-1" }, { cardId: "HIDDEN-2" }],
        burst: { instanceId: "burst-facedown", cardId: "SECRET-BURST" },
        field: { spirits: [], ultimates: [], braves: [], nexuses: [] }
      },
      player2: {
        life: 3,
        reserve: 2,
        hand: [],
        deck: [],
        burst: null,
        field: { spirits: [], ultimates: [], braves: [], nexuses: [] }
      }
    },
    actionLog: [
      { actorId: "player1", type: "DECLARE_ATTACK", action: { type: "DECLARE_ATTACK", instanceId: "public-attacker-1" } },
      { actorId: "player1", type: "PASS_FLASH", action: { type: "PASS_FLASH" } },
      { actorId: "player1", type: "USE_MAGIC", action: { type: "USE_MAGIC", instanceId: "revealed-magic", options: { mode: "flash" } } },
      { actorId: "player1", type: "SET_BURST", action: { type: "SET_BURST", instanceId: "unknown-facedown" } },
      { actorId: "player1", type: "DECLARE_BLOCK", action: { type: "DECLARE_BLOCK", instanceId: "public-blocker" } },
      { actorId: "player1", type: "DECLARE_ATTACK", action: { type: "DECLARE_ATTACK", instanceId: "public-attacker-2" } }
    ],
    ...overrides
  };
}

test("Tactical Memory is derived only from public actions, not hidden opponent cards", () => {
  const first = makeMatch();
  const second = structuredClone(first);
  second.players.player1.hand = [{ cardId: "TOTALLY-DIFFERENT-SECRET" }, { cardId: "ANOTHER-SECRET" }];
  second.players.player1.deck = [{ cardId: "X" }, { cardId: "Y" }, { cardId: "Z" }];
  second.players.player1.burst.cardId = "DIFFERENT-HIDDEN-BURST";

  const a = buildAITacticalMemory(first, "player2");
  const b = buildAITacticalMemory(second, "player2");

  assert.deepEqual(a.counters, b.counters);
  assert.deepEqual(a.tendencies, b.tendencies);
  assert.equal(a.source, "public-actions-only");
});

test("Hard CPU Tactical Memory reacts to observed Flash/Burst habits without changing legality", () => {
  const match = makeMatch();
  const memory = buildAITacticalMemory(match, "player2");
  const hard = tacticalMemoryActionBias(match, "player2", { type: "DECLARE_ATTACK", instanceId: "cpu-attacker" }, memory, "hard");
  const easy = tacticalMemoryActionBias(match, "player2", { type: "DECLARE_ATTACK", instanceId: "cpu-attacker" }, memory, "easy");

  assert.ok(hard.score < 0);
  assert.ok(hard.reasons.some((entry) => entry.type === "memory-flash-threat"));
  assert.ok(hard.reasons.some((entry) => entry.type === "memory-burst-habit"));
  assert.equal(easy.score, 0);
  assert.deepEqual(easy.reasons, []);
});
