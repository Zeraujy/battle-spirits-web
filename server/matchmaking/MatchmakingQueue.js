import { QueueType, isQueueType } from "../../src/online/domain/queueTypes.js";
import { QueueEntry } from "./QueueEntry.js";

export class MatchmakingQueue {
  constructor({ queueType = QueueType.CASUAL } = {}) {
    if (!isQueueType(queueType)) throw new TypeError(`Unsupported queue type: ${queueType}`);
    this.queueType = queueType;
    this.entries = [];
    this.bySocket = new Map();
  }

  get size() {
    return this.entries.length;
  }

  hasSocket(socketId) {
    return this.bySocket.has(String(socketId || ""));
  }

  getBySocket(socketId) {
    return this.bySocket.get(String(socketId || "")) || null;
  }

  enqueue(value) {
    const entry = value instanceof QueueEntry ? value : new QueueEntry({ ...value, queueType: this.queueType });
    if (entry.queueType !== this.queueType) throw new TypeError("Queue entry type does not match this queue.");

    const existing = this.getBySocket(entry.socketId);
    if (existing) return existing;

    this.entries.push(entry);
    this.bySocket.set(entry.socketId, entry);
    return entry;
  }

  removeBySocket(socketId) {
    const key = String(socketId || "");
    const entry = this.bySocket.get(key);
    if (!entry) return null;
    this.bySocket.delete(key);
    const index = this.entries.findIndex((candidate) => candidate.socketId === key);
    if (index >= 0) this.entries.splice(index, 1);
    return entry;
  }

  shiftEligible(predicate = () => true) {
    for (let index = 0; index < this.entries.length; index += 1) {
      const entry = this.entries[index];
      if (!predicate(entry)) continue;
      this.entries.splice(index, 1);
      this.bySocket.delete(entry.socketId);
      return entry;
    }
    return null;
  }

  clear() {
    const previous = [...this.entries];
    this.entries.length = 0;
    this.bySocket.clear();
    return previous;
  }

  snapshot() {
    return this.entries.map((entry) => entry.snapshot());
  }
}
