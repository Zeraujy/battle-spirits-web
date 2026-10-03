import test from "node:test";
import assert from "node:assert/strict";
import {
  ARENA_HAND_CARD_DRAG_MIME,
  createHandCardInteractionPayload,
  readHandCardDragPayload,
  writeHandCardDragPayload
} from "./handInteraction.js";

function fakeTransfer() {
  const values = new Map();
  return {
    types: [],
    effectAllowed: "none",
    setData(type, value) {
      values.set(type, value);
      if (!this.types.includes(type)) this.types.push(type);
    },
    getData(type) {
      return values.get(type) || "";
    }
  };
}

test("hand payload keeps only presentation-safe drag identity", () => {
  assert.deepEqual(
    createHandCardInteractionPayload({
      playerId: "player1",
      instanceId: "instance-9",
      cardId: "SD10-001",
      cardType: "spirit"
    }),
    {
      playerId: "player1",
      instanceId: "instance-9",
      cardId: "SD10-001",
      cardType: "spirit",
      sourceZone: "hand"
    }
  );
});

test("hand payload round-trips through browser drag data", () => {
  const dataTransfer = fakeTransfer();
  const event = { dataTransfer };
  const payload = createHandCardInteractionPayload({
    playerId: "player1",
    instanceId: "instance-2",
    cardId: "BS13-001"
  });

  assert.equal(writeHandCardDragPayload(event, payload), true);
  assert.ok(dataTransfer.types.includes(ARENA_HAND_CARD_DRAG_MIME));
  assert.deepEqual(readHandCardDragPayload(event), payload);
});
