import test from "node:test";
import assert from "node:assert/strict";
import { createMatchSession } from "./matchSessionFactory.js";
import { createStateEnvelope, validateClientStateVersion } from "./stateSync.js";

test("server state envelope is monotonic and owned by MatchSession", () => {
  const session = createMatchSession({
    matchId: "sync-1",
    players: [{ playerId: "player1" }, { playerId: "player2" }]
  });
  session.start({ id: "game", turnNumber: 1 });
  const first = createStateEnvelope(session);
  session.replaceGameState({ id: "game", turnNumber: 2 });
  const second = createStateEnvelope(session);
  assert.equal(second.stateVersion, first.stateVersion + 1);
  assert.equal(second.serverSequence, first.serverSequence + 1);
});

test("server rejects explicitly stale client versions", () => {
  const session = createMatchSession({
    matchId: "sync-2",
    players: [{ playerId: "player1" }, { playerId: "player2" }]
  });
  session.start({ id: "game" });
  assert.equal(validateClientStateVersion(session, session.stateVersion).ok, true);
  assert.equal(validateClientStateVersion(session, session.stateVersion - 1).ok, false);
  // Backward compatibility during migration: clients that do not send a version can still act.
  assert.equal(validateClientStateVersion(session, null).ok, true);
});
