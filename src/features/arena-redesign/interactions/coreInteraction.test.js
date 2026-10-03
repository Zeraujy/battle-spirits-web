import test from "node:test";
import assert from "node:assert/strict";
import {
  createCoreInteractionPayload,
  isSameCoreSelection
} from "./coreInteraction.js";

test("Core interaction payload keeps authority-facing movement fields", () => {
  assert.deepEqual(
    createCoreInteractionPayload({
      playerId: "player1",
      zone: "reserve",
      coreType: "soul",
      tokenIndex: "soul"
    }),
    {
      playerId: "player1",
      zone: "reserve",
      instanceId: null,
      coreType: "soul",
      tokenIndex: "soul"
    }
  );
});

test("Core selection matching is exact", () => {
  const payload = createCoreInteractionPayload({
    playerId: "player1",
    zone: "card",
    instanceId: "spirit-1",
    tokenIndex: 2
  });
  assert.equal(isSameCoreSelection({ ...payload }, payload), true);
  assert.equal(isSameCoreSelection({ ...payload, tokenIndex: 1 }, payload), false);
});
