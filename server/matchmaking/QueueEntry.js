import crypto from "node:crypto";
import { QueueType, isQueueType } from "../../src/online/domain/queueTypes.js";

export class QueueEntry {
  constructor({
    entryId = crypto.randomUUID(),
    socketId,
    queueType = QueueType.CASUAL,
    profile = {},
    deck = [],
    deckId = null,
    deckName = "Deck",
    joinedAt = Date.now(),
    rating = null,
    region = null,
    metadata = {}
  } = {}) {
    if (!socketId) throw new TypeError("QueueEntry requires socketId.");
    if (!isQueueType(queueType)) throw new TypeError(`Unsupported queue type: ${queueType}`);

    this.entryId = String(entryId);
    this.socketId = String(socketId);
    this.queueType = queueType;
    this.profile = profile && typeof profile === "object" ? { ...profile } : {};
    this.deck = Array.isArray(deck) ? [...deck] : [];
    this.deckId = deckId == null ? null : String(deckId);
    this.deckName = String(deckName || "Deck").slice(0, 120);
    this.joinedAt = Number(joinedAt) || Date.now();
    this.rating = Number.isFinite(Number(rating)) ? Number(rating) : null;
    this.region = region == null ? null : String(region);
    this.metadata = metadata && typeof metadata === "object" ? { ...metadata } : {};
  }

  requeue(at = Date.now()) {
    this.joinedAt = Number(at) || Date.now();
    return this;
  }

  snapshot() {
    return {
      entryId: this.entryId,
      socketId: this.socketId,
      queueType: this.queueType,
      profile: { ...this.profile },
      deckId: this.deckId,
      deckName: this.deckName,
      joinedAt: this.joinedAt,
      rating: this.rating,
      region: this.region,
      metadata: { ...this.metadata }
    };
  }
}
