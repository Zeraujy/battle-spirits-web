import assert from "node:assert/strict";
import test from "node:test";
import {
  ARENA_VISUAL_EXIT_STRATEGY,
  createArenaVisualSurrenderResult,
  resolveArenaVisualExitStrategy
} from "./arenaVisualExitController.js";

test("Arena Visual exit strategy keeps local surrender local and uses server concede online", () => {
  assert.equal(resolveArenaVisualExitStrategy({ mode: "local", hasConcede: true }), ARENA_VISUAL_EXIT_STRATEGY.LOCAL);
  assert.equal(resolveArenaVisualExitStrategy({ mode: "ai", hasConcede: true }), ARENA_VISUAL_EXIT_STRATEGY.LOCAL);
  assert.equal(resolveArenaVisualExitStrategy({ mode: "online", hasConcede: true }), ARENA_VISUAL_EXIT_STRATEGY.ONLINE_CONCEDE);
  assert.equal(resolveArenaVisualExitStrategy({ mode: "ranked", hasConcede: true }), ARENA_VISUAL_EXIT_STRATEGY.ONLINE_CONCEDE);
  assert.equal(resolveArenaVisualExitStrategy({ mode: "online", hasConcede: false }), ARENA_VISUAL_EXIT_STRATEGY.ONLINE_EXIT);
});

test("Arena Visual local surrender creates a terminal match state", () => {
  const match = { id: "m1", players: { p1: {}, p2: {} } };
  const result = createArenaVisualSurrenderResult(match, "p1", "p2");
  assert.equal(result.winnerId, "p2");
  assert.equal(result.winnerReason, "surrender");
  assert.equal(result.surrenderedPlayerId, "p1");
});
