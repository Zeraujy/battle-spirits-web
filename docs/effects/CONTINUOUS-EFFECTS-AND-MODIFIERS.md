# v5.1.0 Phase 8 — Continuous Effects & Modifiers

Triggered effects and continuous effects now use separate runtime concepts.

## Triggered effect

A triggered effect enters the Effect Queue and resolves operations once.

```
Event -> Trigger Dispatcher -> Effect Queue -> Actions
```

## Continuous effect

A continuous source registers a descriptor in `match.modifierRegistry`.

```
Source enters field
  -> continuous Effect Schema v2 entry
  -> addModifier
  -> ModifierRegistry
  -> effective property getters
```

The registry stores:

- `property`
- `operation`
- `value`
- `selector`
- `controllerId`
- `sourceInstanceId`
- `sourceEffectId`
- `condition`
- `duration`

Current effective properties include:

- `bp`
- `cost`
- `symbols`
- `colors`
- `keywords` (registry support; consumers can adopt it as mechanics migrate)

`getEffectiveBP`, `getEffectiveCost`, `getEffectiveSymbols` and `getEffectiveColors` now read the modifier registry.

## Source lifecycle

`whileSourceExists` is evaluated dynamically. A modifier whose source has left the field stops affecting effective values immediately and is pruned when the resolver/dispatcher reconciles modifiers.

## Example

```json
{
  "schemaVersion": 2,
  "id": "red-spirit-aura",
  "trigger": {
    "event": "continuous",
    "scope": "source"
  },
  "actions": [
    {
      "type": "addModifier",
      "property": "bp",
      "operation": "add",
      "value": 2000,
      "selector": {
        "owner": "self",
        "cardType": "spirit",
        "color": "red"
      },
      "duration": "whileSourceExists"
    }
  ]
}
```

Continuous entries are automatically activated for a source when it is Summoned/Deployed. Catalog migration remains explicit: legacy text does not become a continuous modifier automatically.
