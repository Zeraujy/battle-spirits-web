import assert from "node:assert/strict";
import test from "node:test";
import { createArenaVisualOnlineStatus } from "./arenaVisualOnlineStatus.js";

test("online status presents server clock and opponent reconnect countdown", () => {
  const now = 1_000_000;
  const status = createArenaVisualOnlineStatus({
    mode: "online",
    viewerPlayerId: "player1",
    opponentPlayerId: "player2",
    socketConnected: true,
    now,
    turnRemainingSeconds: 42,
    roomState: {
      started: true,
      matchSync: { stateVersion: 12 },
      players: {
        player1: { connected: true, connectionState: "connected" },
        player2: { connected: false, connectionState: "reconnecting", reconnectDeadline: now + 15_000 }
      }
    }
  });
  assert.equal(status.enabled, true);
  assert.equal(status.turnRemainingSeconds, 42);
  assert.equal(status.serverAuthoritative, true);
  assert.equal(status.opponentNeedsReconnect, true);
  assert.equal(status.opponentReconnectRemainingSeconds, 15);
});

test("socket disconnect forces viewer reconnect presentation without changing match state", () => {
  const status = createArenaVisualOnlineStatus({
    mode: "ranked",
    viewerPlayerId: "player1",
    opponentPlayerId: "player2",
    socketConnected: false,
    roomState: { players: { player1: { connectionState: "connected" }, player2: { connectionState: "connected" } } }
  });
  assert.equal(status.viewerConnectionState, "reconnecting");
  assert.equal(status.viewerNeedsReconnect, true);
  assert.equal(status.serverAuthoritative, true);
});
