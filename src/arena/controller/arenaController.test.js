import test from "node:test";
import assert from "node:assert/strict";

import {
  dispatchArenaIntent,
  resolveArenaActorId,
  resolveArenaPerspective
} from "./arenaController.js";

function baseMatch(overrides = {}) {
  return {
    activePlayerId: "p1",
    players: {
      p1: { id: "p1" },
      p2: { id: "p2" }
    },
    ...overrides
  };
}

test("resolveArenaActorId follows authoritative decision/priority precedence", () => {
  assert.equal(
    resolveArenaActorId(baseMatch({ pendingEffectDecision: { playerId: "p2" } })),
    "p2"
  );

  assert.equal(
    resolveArenaActorId(baseMatch({ burstOpportunity: { playerId: "p2" } })),
    "p2"
  );

  assert.equal(
    resolveArenaActorId(baseMatch({
      battle: {
        stage: "ultimateTrigger",
        ultimateTrigger: {
          status: "counterWindow",
          counterPlayerId: "p2",
          controllerPlayerId: "p1"
        }
      }
    })),
    "p2"
  );

  assert.equal(
    resolveArenaActorId(baseMatch({ battle: { flash: { priorityPlayerId: "p2" } } })),
    "p2"
  );

  assert.equal(
    resolveArenaActorId(baseMatch({ battle: { stage: "block", defenderPlayerId: "p2" } })),
    "p2"
  );

  assert.equal(resolveArenaActorId(baseMatch()), "p1");
});

test("resolveArenaPerspective preserves local, CPU and online viewpoints", () => {
  assert.deepEqual(
    resolveArenaPerspective({ match: baseMatch() }),
    {
      actorId: "p1",
      canControlActor: true,
      bottomId: "p1",
      topId: "p2"
    }
  );

  assert.deepEqual(
    resolveArenaPerspective({
      match: baseMatch({ activePlayerId: "p2" }),
      aiMode: true,
      humanPlayerId: "p1"
    }),
    {
      actorId: "p2",
      canControlActor: false,
      bottomId: "p1",
      topId: "p2"
    }
  );

  assert.deepEqual(
    resolveArenaPerspective({
      match: baseMatch({ activePlayerId: "p2" }),
      online: true,
      viewerPlayerId: "p1"
    }),
    {
      actorId: "p2",
      canControlActor: false,
      bottomId: "p1",
      topId: "p2"
    }
  );
});

test("dispatchArenaIntent blocks online actions from the wrong viewer", () => {
  const result = dispatchArenaIntent({
    online: true,
    viewerPlayerId: "p1",
    asPlayerId: "p2",
    onlineClient: { action() { throw new Error("must not be called"); } },
    match: baseMatch(),
    action: { type: "PASS" },
    cardIndex: {}
  });

  assert.deepEqual(result, {
    transport: "blocked",
    ok: false,
    reason: "WAIT_FOR_OTHER_PLAYER"
  });
});

test("dispatchArenaIntent forwards authorized online actions without interpreting legality", () => {
  let payload = null;
  let callbackValue = null;

  const result = dispatchArenaIntent({
    online: true,
    viewerPlayerId: "p1",
    asPlayerId: "p1",
    onlineClient: {
      action(nextPayload, callback) {
        payload = nextPayload;
        callback({ ok: true, match: { id: "server-state" } });
      }
    },
    match: baseMatch(),
    action: { type: "PASS" },
    cardIndex: {},
    onOnlineResult(value) {
      callbackValue = value;
    }
  });

  assert.deepEqual(payload, { action: { type: "PASS" } });
  assert.deepEqual(callbackValue, { ok: true, match: { id: "server-state" } });
  assert.deepEqual(result, { transport: "online", ok: true });
});
