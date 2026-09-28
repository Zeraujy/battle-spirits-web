export class RematchRequest {
  constructor({ playerIds = ["player1", "player2"], createdAt = Date.now() } = {}) {
    this.playerIds = [...new Set(playerIds.map(String))];
    this.createdAt = Number(createdAt);
    this.accepted = new Set();
  }

  request(playerId) {
    const id = String(playerId || "");
    if (!this.playerIds.includes(id)) return false;
    this.accepted.add(id);
    return true;
  }

  isComplete() {
    return this.playerIds.length > 0 && this.playerIds.every((id) => this.accepted.has(id));
  }

  snapshot() {
    return {
      createdAt: this.createdAt,
      acceptedPlayerIds: [...this.accepted],
      votes: Object.fromEntries(this.playerIds.map((id) => [id, this.accepted.has(id)]))
    };
  }
}
