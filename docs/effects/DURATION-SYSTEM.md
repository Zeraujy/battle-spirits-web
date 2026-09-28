# v5.1.0 Phase 9 — Duration System

`src/game/effectEngine/durationSystem.js` defines the canonical duration vocabulary used by modifiers and future temporary mechanics.

## Canonical durations

- `thisBattle`
- `thisAttack`
- `thisTurn`
- `untilEndStep`
- `whileSourceExists`
- `whileConditionTrue`
- `permanent`

Legacy aliases such as `battle`, `turn`, `untilEndOfBattle` and `untilEndOfTurn` normalize into these canonical values.

## Identity binding

Duration specs record the context in which they were created:

- `turnNumber`
- `battleId`
- `sourceInstanceId`
- `createdPhase`

This prevents a modifier created in one battle or turn from leaking into a later one.

## Cleanup

Battle cleanup expires `thisBattle` / `thisAttack` modifiers.
Turn cleanup expires `thisTurn` / `untilEndStep` modifiers.
`whileSourceExists` is evaluated against the battlefield dynamically.
`whileConditionTrue` is reconciled by the Trigger Dispatcher using the Condition Engine v2.

The existing per-physical-card BP modifier format remains readable for backward compatibility while new continuous effects use the centralized `ModifierRegistry`.
