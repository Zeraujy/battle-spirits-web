export class RankedMatchContext {
  constructor({ firstEntry, secondEntry, season = "S0", matchedAt = Date.now() } = {}) {
    if (!firstEntry || !secondEntry) throw new TypeError("RankedMatchContext requires two queue entries.");
    this.firstEntry = firstEntry;
    this.secondEntry = secondEntry;
    this.season = String(season || "S0");
    this.matchedAt = Number(matchedAt) || Date.now();
    this.ratingGap = Math.abs(Number(firstEntry.rating || 0) - Number(secondEntry.rating || 0));
  }

  entries() {
    return [this.firstEntry, this.secondEntry];
  }

  snapshot() {
    return {
      season: this.season,
      matchedAt: this.matchedAt,
      ratingGap: this.ratingGap,
      players: this.entries().map((entry) => ({
        socketId: entry.socketId,
        rating: entry.rating,
        userId: entry.metadata?.userId || null
      }))
    };
  }
}
