import test from "node:test";
import assert from "node:assert/strict";
import { MatchMode, normalizeMatchMode, isOnlineMatchMode } from "./matchModes.js";
import { MatchStatus, PlayerConnectionState, isTerminalMatchStatus } from "./matchStatus.js";
import { QueueType, isQueueType } from "./queueTypes.js";
import { OnlineError, OnlineErrorCode } from "./onlineErrors.js";

test("online domain exposes stable match modes", () => {
  assert.equal(normalizeMatchMode("RANKED"), MatchMode.RANKED);
  assert.equal(isOnlineMatchMode(MatchMode.PRIVATE), true);
  assert.equal(isOnlineMatchMode(MatchMode.LOCAL), false);
});

test("terminal match statuses are explicit", () => {
  assert.equal(isTerminalMatchStatus(MatchStatus.FINISHED), true);
  assert.equal(isTerminalMatchStatus(MatchStatus.CANCELLED), true);
  assert.equal(isTerminalMatchStatus(MatchStatus.ACTIVE), false);
  assert.equal(PlayerConnectionState.RECONNECTING, "reconnecting");
});

test("queue types only accept matchmaking queues", () => {
  assert.equal(isQueueType(QueueType.CASUAL), true);
  assert.equal(isQueueType("friend"), false);
});

test("OnlineError serializes a public error contract", () => {
  const error = new OnlineError(OnlineErrorCode.INVALID_ACTION, "Invalid action.", { actionType: "ATTACK" });
  assert.deepEqual(error.toJSON(), {
    code: "INVALID_ACTION",
    message: "Invalid action.",
    details: { actionType: "ATTACK" }
  });
});
