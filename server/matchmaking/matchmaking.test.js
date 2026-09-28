import test from "node:test";
import assert from "node:assert/strict";
import { QueueType } from "../../src/online/domain/queueTypes.js";
import { Matchmaker, MatchmakingQueue, QueueEntry, ReadyCheckRegistry } from "./index.js";

test("casual queue keeps one entry per socket", () => {
  const queue = new MatchmakingQueue({ queueType: QueueType.CASUAL });
  const first = queue.enqueue({ socketId: "a", profile: { name: "A" } });
  const duplicate = queue.enqueue({ socketId: "a", profile: { name: "Other" } });
  assert.equal(queue.size, 1);
  assert.equal(first, duplicate);
});

test("matchmaker pairs FIFO entries", () => {
  const queue = new MatchmakingQueue({ queueType: QueueType.CASUAL });
  queue.enqueue(new QueueEntry({ socketId: "a" }));
  queue.enqueue(new QueueEntry({ socketId: "b" }));
  const pair = new Matchmaker({ queue }).takePair();
  assert.deepEqual(pair.map((entry) => entry.socketId), ["a", "b"]);
  assert.equal(queue.size, 0);
});

test("ready check tracks readiness independently for each player", () => {
  const registry = new ReadyCheckRegistry({ windowMs: 60_000 });
  const a = new QueueEntry({ socketId: "a", profile: { name: "A" } });
  const b = new QueueEntry({ socketId: "b", profile: { name: "B" } });
  const session = registry.create([a, b]);
  assert.equal(session.markReady("a"), true);
  assert.equal(session.snapshotFor("a").playerReady, true);
  assert.equal(session.snapshotFor("b").opponentReady, true);
  assert.equal(session.isComplete(), false);
  session.markReady("b");
  assert.equal(session.isComplete(), true);
  registry.delete(session.readyCheckId);
});
