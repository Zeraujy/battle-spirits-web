import test from "node:test";
import assert from "node:assert/strict";
import { acceptServerSync, compareStateVersion, createClientSyncState, SyncStatus } from "./stateSync.js";

test("state version comparison detects current, stale and ahead clients", () => {
  assert.equal(compareStateVersion(4, 4), SyncStatus.CURRENT);
  assert.equal(compareStateVersion(3, 4), SyncStatus.STALE);
  assert.equal(compareStateVersion(5, 4), SyncStatus.AHEAD);
  assert.equal(compareStateVersion(null, 4), SyncStatus.UNKNOWN);
});

test("client sync never rolls back to an older server sequence", () => {
  const current = createClientSyncState({ matchId: "m1", stateVersion: 7, serverSequence: 9 });
  const ignored = acceptServerSync(current, { matchSync: { matchId: "m1", stateVersion: 6, serverSequence: 8 } });
  assert.equal(ignored.stateVersion, 7);
  assert.equal(ignored.serverSequence, 9);

  const accepted = acceptServerSync(current, { matchSync: { matchId: "m1", stateVersion: 8, serverSequence: 10 } });
  assert.equal(accepted.stateVersion, 8);
  assert.equal(accepted.serverSequence, 10);
});
