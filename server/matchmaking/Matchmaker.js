export class Matchmaker {
  constructor({ queue, isEligible = () => true } = {}) {
    if (!queue) throw new TypeError("Matchmaker requires a queue.");
    this.queue = queue;
    this.isEligible = isEligible;
  }

  takePair() {
    const first = this.queue.shiftEligible((entry) => this.isEligible(entry));
    if (!first) return null;

    const second = this.queue.shiftEligible((entry) => {
      return entry.socketId !== first.socketId && this.isEligible(entry, first);
    });

    if (!second) {
      this.queue.enqueue(first.requeue(first.joinedAt));
      return null;
    }

    return [first, second];
  }
}
