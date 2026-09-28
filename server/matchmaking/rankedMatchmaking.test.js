import test from "node:test";
import assert from "node:assert/strict";
import { QueueType } from "../../src/online/domain/queueTypes.js";
import { MatchmakingQueue } from "./MatchmakingQueue.js";
import { QueueEntry } from "./QueueEntry.js";
import { RankedMatchmaker } from "./RankedMatchmaker.js";

test("ranked matchmaker chooses closest eligible rating", () => {
  const queue = new MatchmakingQueue({ queueType: QueueType.RANKED });
  queue.enqueue(new QueueEntry({ socketId: "a", queueType: QueueType.RANKED, rating: 1000, metadata: { userId: "u1" } }));
  queue.enqueue(new QueueEntry({ socketId: "b", queueType: QueueType.RANKED, rating: 1160, metadata: { userId: "u2" } }));
  queue.enqueue(new QueueEntry({ socketId: "c", queueType: QueueType.RANKED, rating: 1040, metadata: { userId: "u3" } }));
  const entry = new QueueEntry({ socketId: "d", queueType: QueueType.RANKED, rating: 1030, metadata: { userId: "u4" } });
  const matchmaker = new RankedMatchmaker({ queue, searchWindow: () => 200 });
  const context = matchmaker.takeMatch(entry);
  assert.ok(context);
  assert.equal(context.firstEntry.socketId, "c");
  assert.equal(context.secondEntry.socketId, "d");
  assert.equal(context.ratingGap, 10);
});

test("ranked matchmaker never pairs the same account", () => {
  const queue = new MatchmakingQueue({ queueType: QueueType.RANKED });
  queue.enqueue(new QueueEntry({ socketId: "a", queueType: QueueType.RANKED, rating: 1000, metadata: { userId: "same" } }));
  const entry = new QueueEntry({ socketId: "b", queueType: QueueType.RANKED, rating: 1000, metadata: { userId: "same" } });
  const matchmaker = new RankedMatchmaker({ queue, searchWindow: () => 1000 });
  assert.equal(matchmaker.takeMatch(entry), null);
  assert.equal(queue.size, 1);
});
