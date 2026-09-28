export function createPrivateMatchDescriptor({ roomCode, hostPlayerId = "player1", createdAt = Date.now() } = {}) {
  const code = String(roomCode || "").trim().toUpperCase();
  if (!code) throw new Error("Private match requires a room code.");
  return Object.freeze({
    roomCode: code,
    hostPlayerId: String(hostPlayerId || "player1"),
    createdAt: Number(createdAt),
    joinMethod: "roomCode"
  });
}
