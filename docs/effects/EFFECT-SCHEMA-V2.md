# Effect Schema v2 — v5.1.0 Phase 2

Effect Schema v2 is the declarative contract for card mechanics. New automation should be expressed as data before card-specific code is considered.

## Minimal executable effect

```json
{
  "schemaVersion": 2,
  "id": "example-when-summoned",
  "trigger": {
    "event": "whenSummoned",
    "scope": "source",
    "eventPlayer": "self"
  },
  "conditions": [],
  "actions": [
    { "type": "draw", "count": 1 }
  ]
}
```

## Contract

- `schemaVersion`: must be `2`.
- `id`: stable identifier for migration, logs and regression tests. Strongly recommended.
- `trigger.event`: canonical event from `canonicalEvents.js`; legacy aliases are normalized at load/runtime boundaries.
- `trigger.scope`:
  - `source`: the event belongs to this physical card. This is the compatibility-safe default.
  - `controllerField`: the card listens while it is on its controller's battlefield and can react to events created by another card/player.
- `trigger.eventPlayer`:
  - `self`: event player is the controller of the effect source.
  - `opponent`: event player is the opponent of the effect source controller.
  - `any`: no player-relation restriction.
- `conditions`: zero or more condition objects evaluated by the condition resolver.
- `actions`: ordered actions consumed by the existing action resolver.

## Example: observe an opponent summon

```json
{
  "schemaVersion": 2,
  "id": "watch-opponent-summon",
  "trigger": {
    "event": "whenSummoned",
    "scope": "controllerField",
    "eventPlayer": "opponent"
  },
  "conditions": [
    { "ownerTurn": false }
  ],
  "actions": [
    { "type": "draw", "count": 1 }
  ]
}
```

The effect source is the listening card. The triggering card/player is available in dispatcher context as `eventSourcePlayerId`, `eventSourceInstanceId`, `eventSourceCardId` and `eventPlayerId`.

## Compatibility rules

Legacy entries without `schemaVersion: 2` remain source-scoped. They are not automatically promoted to battlefield observers. This is deliberate: migrating old data must never silently change gameplay semantics.

`effects`, `abilities`, `actions`, `operations`, `condition` and `conditions` remain readable while cards are migrated incrementally.

## Validation API

`src/game/effectEngine/effectSchema.js` exports:

- `normalizeEffectSchemaV2()`
- `validateEffectSchemaV2()`
- `defineEffect()`
- `isEffectSchemaV2()`
- `EffectTriggerScope`
- `EventPlayerRelation`

The validator rejects unknown canonical events, unsupported trigger scopes/player relations and action types that the runtime cannot currently resolve.
