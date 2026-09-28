import test from "node:test";
import assert from "node:assert/strict";

import {
  EFFECT_SCHEMA_VERSION,
  EffectTriggerScope,
  EventPlayerRelation,
  defineEffect,
  isEffectSchemaV2,
  normalizeEffectSchemaV2,
  validateEffectSchemaV2
} from "./effectSchema.js";


test("Effect Schema v2 normalizes canonical trigger and conditions", () => {
  const effect = normalizeEffectSchemaV2({
    schemaVersion: 2,
    id: "test-summon",
    trigger: { event: "summon", scope: "source", eventPlayer: "self" },
    condition: { ownerTurn: true },
    operations: [{ type: "draw", count: 1 }]
  });

  assert.equal(effect.schemaVersion, EFFECT_SCHEMA_VERSION);
  assert.equal(effect.trigger.event, "whenSummoned");
  assert.equal(effect.trigger.scope, EffectTriggerScope.SOURCE);
  assert.equal(effect.trigger.eventPlayer, EventPlayerRelation.SELF);
  assert.deepEqual(effect.conditions, [{ ownerTurn: true }]);
  assert.equal(effect.actions[0].type, "draw");
  assert.equal(isEffectSchemaV2(effect), true);
});


test("Effect Schema v2 validation rejects unknown events/actions/scopes", () => {
  const result = validateEffectSchemaV2({
    schemaVersion: 2,
    trigger: { event: "notARealEvent", scope: "somewhere" },
    actions: [{ type: "notImplemented" }]
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /Unknown canonical event/);
  assert.match(result.errors.join(" "), /Unsupported trigger.scope/);
  assert.match(result.errors.join(" "), /Unsupported action type/);
});


test("defineEffect produces an executable v2 definition", () => {
  const effect = defineEffect({
    id: "observer",
    trigger: {
      event: "whenSummoned",
      scope: EffectTriggerScope.CONTROLLER_FIELD,
      eventPlayer: EventPlayerRelation.OPPONENT
    },
    actions: [{ type: "draw", count: 1 }]
  });

  assert.equal(effect.schemaVersion, 2);
  assert.equal(effect.trigger.event, "whenSummoned");
  assert.equal(effect.actions.length, 1);
});
