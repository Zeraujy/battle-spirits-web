import test from "node:test";
import assert from "node:assert/strict";
import { PlayerConnectionState } from "../domain/matchStatus.js";
import { connectionLabel, isConnectionRecoverable, normalizeConnectionState } from "./connectionState.js";

test("connection state normalization remains presentation-only", () => {
  assert.equal(normalizeConnectionState(PlayerConnectionState.CONNECTED), PlayerConnectionState.CONNECTED);
  assert.equal(normalizeConnectionState("invalid"), PlayerConnectionState.DISCONNECTED);
  assert.equal(isConnectionRecoverable(PlayerConnectionState.RECONNECTING), true);
  assert.equal(isConnectionRecoverable(PlayerConnectionState.TIMED_OUT), false);
  assert.equal(connectionLabel(PlayerConnectionState.CONNECTED), "Connected");
});
