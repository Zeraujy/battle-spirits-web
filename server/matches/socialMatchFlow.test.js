import test from "node:test";
import assert from "node:assert/strict";
import { createPrivateMatchDescriptor } from "./PrivateMatchRoom.js";
import { RematchRequest } from "./RematchRequest.js";

test("private match descriptor keeps the invite code normalized", () => {
  const value = createPrivateMatchDescriptor({ roomCode: " ab12cd " });
  assert.equal(value.roomCode, "AB12CD");
  assert.equal(value.joinMethod, "roomCode");
});

test("rematch requires every player to accept", () => {
  const request = new RematchRequest({ playerIds: ["player1", "player2"] });
  request.request("player1");
  assert.equal(request.isComplete(), false);
  request.request("player2");
  assert.equal(request.isComplete(), true);
});
