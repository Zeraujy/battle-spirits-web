# v5.1.0 Phase 6 — Condition Engine v2

`src/game/effectEngine/conditionEngine.js` is the canonical condition evaluator.
`conditionResolver.js` remains as a compatibility facade.

## Logical composition

- `all` / `and`
- `any` / `or`
- `not`

## Typed conditions introduced

- `lifeAtMost`, `lifeAtLeast`, `life`
- `handSize`
- `reserve`
- `trashCores`
- `fieldCount`
- `symbolCount`
- `controlsColor`
- `controlsCardType`
- `controlsFamily`
- `controlsSymbolColor`
- `phase`
- `activePlayer`
- `sourceLevel`
- `sourceCost`
- `sourceState`
- `soulCoreLocation`
- `battleState`
- existing Ultimate Trigger predicates

Numeric conditions accept `equals`, `min`, `max`, `atLeast`, `atMost`, or `value + operator`.

Legacy condition shapes remain supported so the card pool can migrate incrementally.
