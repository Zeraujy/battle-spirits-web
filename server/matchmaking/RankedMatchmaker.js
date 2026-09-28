import { RankedMatchContext } from "./RankedMatchContext.js";

export class RankedMatchmaker {
  constructor({ queue, season = "S0", searchWindow = () => 150 } = {}) {
    if (!queue) throw new TypeError("RankedMatchmaker requires a queue.");
    this.queue = queue;
    this.season = String(season || "S0");
    this.searchWindow = searchWindow;
  }

  findOpponentIndex(entry, now = Date.now()) {
    let bestIndex = -1;
    let bestGap = Infinity;
    const ownUserId = entry.metadata?.userId || null;

    for (let index = 0; index < this.queue.entries.length; index += 1) {
      const candidate = this.queue.entries[index];
      if (!candidate || candidate.socketId === entry.socketId) continue;
      if (ownUserId && candidate.metadata?.userId === ownUserId) continue;

      const gap = Math.abs(Number(candidate.rating || 0) - Number(entry.rating || 0));
      const allowedGap = Math.max(
        Number(this.searchWindow(entry, now)) || 0,
        Number(this.searchWindow(candidate, now)) || 0
      );
      if (gap > allowedGap) continue;
      if (gap < bestGap) {
        bestGap = gap;
        bestIndex = index;
      }
    }

    return bestIndex;
  }

  takeMatch(entry, now = Date.now()) {
    const index = this.findOpponentIndex(entry, now);
    if (index < 0) return null;
    const opponent = this.queue.entries[index];
    this.queue.removeBySocket(opponent.socketId);
    return new RankedMatchContext({
      firstEntry: opponent,
      secondEntry: entry,
      season: this.season,
      matchedAt: now
    });
  }
}
