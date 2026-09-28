import test from "node:test";
import assert from "node:assert/strict";
import {
  EffectEvent,
  isCanonicalEvent,
  isRuntimeDispatchedEvent,
  normalizeCanonicalEvent
} from "./canonicalEvents.js";

test("canonical events preserve current runtime aliases", () => {
  assert.equal(normalizeCanonicalEvent("onSummon"), EffectEvent.WHEN_SUMMONED);
  assert.equal(normalizeCanonicalEvent("Flash"), EffectEvent.MAGIC_FLASH);
  assert.equal(normalizeCanonicalEvent("afterLifeDecreases"), EffectEvent.BURST_LIFE_DECREASE);
  assert.equal(normalizeCanonicalEvent("yourAttackStep"), EffectEvent.ATTACK_STEP);
});

test("canonical model distinguishes defined events from runtime-dispatched events", () => {
  assert.equal(isCanonicalEvent("whenBattles"), true);
  assert.equal(isRuntimeDispatchedEvent("whenBattles"), true);
  assert.equal(isRuntimeDispatchedEvent("whenSummoned"), true);
  assert.equal(isRuntimeDispatchedEvent("attackStep"), true);
  assert.equal(isRuntimeDispatchedEvent("wouldBeDestroyed"), true);
});
