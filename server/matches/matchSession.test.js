import test from "node:test";
import assert from "node:assert/strict";
import { MatchStatus, PlayerConnectionState } from "../../src/online/domain/matchStatus.js";
import { createMatchSession } from "./matchSessionFactory.js";
import { MatchRegistry } from "./MatchRegistry.js";

test("MatchSession starts waiting and becomes authoritative when game state is attached", () => {
  const session = createMatchSession({
    matchId: "match-1",
    players: [
      { playerId: "player1", socketId: "socket-1", profile: { name: "A" } },
      { playerId: "player2", socketId: "socket-2", profile: { name: "B" } }
    ]
  });

  assert.equal(session.status, MatchStatus.WAITING);
  assert.equal(session.stateVersion, 0);

  session.start({ id: "game-1", turnNumber: 1 });
  assert.equal(session.status, MatchStatus.ACTIVE);
  assert.equal(session.stateVersion, 1);
  assert.equal(session.gameState.turnNumber, 1);
});

test("MatchSession increments stateVersion without waiting for presentation layers", () => {
  const session = createMatchSession({
    matchId: "match-2",
    players: [
      { playerId: "player1", socketId: "socket-1" },
      { playerId: "player2", socketId: "socket-2" }
    ],
    gameState: { id: "game-2", turnNumber: 1 }
  });

  const version = session.replaceGameState({ id: "game-2", turnNumber: 2 });
  assert.equal(version, 1);
  assert.equal(session.gameState.turnNumber, 2);
});

test("MatchPlayer tracks connection state independently from game state", () => {
  const session = createMatchSession({
    matchId: "match-3",
    players: [{ playerId: "player1", socketId: "socket-1" }]
  });
  const player = session.getPlayer("player1");
  player.disconnect();
  assert.equal(player.connectionState, PlayerConnectionState.DISCONNECTED);
  assert.equal(player.socketId, null);
  player.connect("socket-2");
  assert.equal(player.connectionState, PlayerConnectionState.CONNECTED);
  assert.equal(player.socketId, "socket-2");
});

test("MatchRegistry indexes sessions without changing the legacy room system", () => {
  const registry = new MatchRegistry();
  const session = createMatchSession({ matchId: "match-4" });
  registry.register(session);
  assert.equal(registry.size, 1);
  assert.equal(registry.get("match-4"), session);
});

test("MatchSession reconnects from the authoritative session token", () => {
  const session = createMatchSession({
    matchId: "match-reconnect",
    players: [
      { playerId: "player1", socketId: "socket-1", sessionToken: "token-1" },
      { playerId: "player2", socketId: "socket-2", sessionToken: "token-2" }
    ]
  });
  session.start({ id: "game-reconnect", turnNumber: 1 });
  session.beginReconnect("player1", { reconnectWindowMs: 5000 });
  assert.equal(session.status, MatchStatus.RECONNECTING);
  assert.equal(session.reconnectPlayer("player1", "socket-3", "wrong"), null);
  assert.ok(session.reconnectPlayer("player1", "socket-3", "token-1"));
  assert.equal(session.status, MatchStatus.ACTIVE);
  assert.equal(session.getPlayer("player1").socketId, "socket-3");
});
