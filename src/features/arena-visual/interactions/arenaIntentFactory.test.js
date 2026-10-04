import test from "node:test";
import assert from "node:assert/strict";
import { ARENA_VISUAL_INTENTS, createArenaVisualIntent, moveCoreIntent } from "./arenaIntentFactory.js";
import { createArenaInteractionBus } from "./arenaInteractionBus.js";
import { routeArenaVisualIntent } from "../controller/arenaVisualIntentRouter.js";

test("interaction bus forwards a normalized intent to the controller", () => {
  const seen = [];
  const bus = createArenaInteractionBus({ requestIntent: (intent) => seen.push(intent) });
  const intent = createArenaVisualIntent(ARENA_VISUAL_INTENTS.SELECT_CARD, { instanceId: "card-1" });
  assert.equal(bus.emit(intent), true);
  assert.equal(seen[0].payload.instanceId, "card-1");
});

test("move core intent routes through one controller boundary", () => {
  let routed = null;
  const intent = moveCoreIntent(
    { zone: "reserve", coreType: "regular", playerId: "player1" },
    { zone: "card", instanceId: "spirit-1" }
  );
  routeArenaVisualIntent(intent, {
    moveCore(source, target) { routed = { source, target }; }
  });
  assert.equal(routed.source.zone, "reserve");
  assert.equal(routed.target.instanceId, "spirit-1");
});
