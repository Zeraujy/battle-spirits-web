import test from "node:test";
import assert from "node:assert/strict";
import { MatchPlayer } from "../matches/MatchPlayer.js";
import { ReconnectManager } from "./ReconnectManager.js";
import { DisconnectReason, PlayerConnectionState } from "../../src/online/domain/matchStatus.js";

test("reconnect uses the server token and deadline rather than client state", () => {
  let now = 1000;
  const manager = new ReconnectManager({ reconnectWindowMs: 5000, now: () => now });
  const player = new MatchPlayer({ playerId: "player1", socketId: "s1", sessionToken: "secret" });
  manager.begin(player, DisconnectReason.SOCKET_DISCONNECT);
  assert.equal(player.connectionState, PlayerConnectionState.RECONNECTING);
  assert.equal(player.reconnectDeadline, 6000);
  assert.equal(manager.resume(player, "s2", "wrong"), false);
  assert.equal(manager.resume(player, "s2", "secret"), true);
  assert.equal(player.socketId, "s2");
});

test("expired reconnect windows cannot restore a match session", () => {
  let now = 1000;
  const manager = new ReconnectManager({ reconnectWindowMs: 100, now: () => now });
  const player = new MatchPlayer({ playerId: "player1", socketId: "s1", sessionToken: "secret" });
  manager.begin(player);
  now = 1200;
  assert.equal(manager.resume(player, "s2", "secret"), false);
  assert.equal(manager.expire(player), true);
  assert.equal(player.connectionState, PlayerConnectionState.TIMED_OUT);
});
