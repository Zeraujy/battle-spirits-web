import test from "node:test";
import assert from "node:assert/strict";

import {
  EffectQueueStatus,
  drainEffectQueue,
  enqueueEffectEvents,
  getEffectQueue
} from "./effectQueue.js";

test("Effect Queue preserves FIFO order", () => {
  let match = { players: {}, log: [] };
  match = enqueueEffectEvents(match, [{ event: "A" }, { event: "B" }, { event: "C" }]).match;
  const seen = [];
  const result = drainEffectQueue(match, (working, item) => {
    seen.push(item.payload.event);
    return { match: working };
  });

  assert.deepEqual(seen, ["A", "B", "C"]);
  assert.equal(result.processed, 3);
  assert.equal(getEffectQueue(result.match).status, EffectQueueStatus.IDLE);
  assert.equal(getEffectQueue(result.match).completedCount, 3);
});

test("Effect Queue pauses while a player choice is pending and resumes later", () => {
  let match = { players: {}, log: [] };
  match = enqueueEffectEvents(match, [{ event: "choice" }, { event: "after" }]).match;

  const first = drainEffectQueue(match, (working, item) => {
    if (item.payload.event === "choice") {
      return { match: { ...working, pendingEffectDecision: { id: "decision-1", playerId: "player1" } } };
    }
    return { match: working };
  });

  assert.equal(first.waiting, true);
  assert.equal(getEffectQueue(first.match).status, EffectQueueStatus.WAITING_FOR_CHOICE);
  assert.equal(getEffectQueue(first.match).items.length, 1);

  const cleared = { ...first.match, pendingEffectDecision: null };
  const second = drainEffectQueue(cleared, (working) => ({ match: working }));
  assert.equal(second.processed, 1);
  assert.equal(getEffectQueue(second.match).items.length, 0);
  assert.equal(getEffectQueue(second.match).status, EffectQueueStatus.IDLE);
});
