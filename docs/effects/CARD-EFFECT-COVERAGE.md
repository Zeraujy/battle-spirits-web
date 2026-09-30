# Card Effect Coverage — v5.1.0 Card Effects & Mechanics Engine (Phase 0–20)

> Scope: runtime gameplay catalog (`src/data/cards.json`). Artwork-only/public database records that are not loaded into the gameplay catalog are intentionally excluded.

## Baseline

- Runtime cards audited: **365**
- Sets audited: **11**
- Structured effect/ability entries inspected: **1019**
- Effect Schema v2 entries: **553**
- Fully automated cards: **316 (86.6%)**
- Partially automated cards: **0**
- Unstructured effect text: **7**
- Explicit no-effect cards: **16**

The audit is intentionally conservative. A card is only `AUTOMATED` when its executable entries use a canonical event that is currently dispatched by the runtime, all conditions are understood, all action types are supported, and no documented effect remains unresolved.

## Status legend

| Status | Meaning |
| --- | --- |
| `AUTOMATED` | Runtime can dispatch and resolve every mapped effect entry. |
| `PARTIAL` | At least one effect is automated, but another documented/mechanical part is unresolved. |
| `MANUAL` | Effect is represented, but still lacks executable operations. |
| `UNSUPPORTED_TRIGGER` | Trigger exists in data but is not yet canonical/runtime-dispatched. |
| `UNSUPPORTED_CONDITION` | Trigger/action path exists, but a condition is not understood. |
| `UNSUPPORTED_ACTION` | Structured operation type is not implemented by the resolver. |
| `UNSTRUCTURED_TEXT` | Card has gameplay text but no structured effect/ability entries. |
| `NO_EFFECT` | Card explicitly states that it has no effect. |

## Coverage by set

| Set | Cards | Automated | Partial | Manual | Unsupported trigger | Unsupported condition | Unsupported action | Unstructured | No effect |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| BS13 | 90 | 84 | 0 | 0 | 0 | 0 | 0 | 0 | 6 |
| BSC49 | 117 | 83 | 0 | 4 | 22 | 0 | 0 | 7 | 1 |
| SD10 | 18 | 17 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| SD11 | 18 | 17 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| SD13 | 18 | 15 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| SD15 | 18 | 17 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| SD17 | 18 | 17 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| SD19 | 17 | 16 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| SD20 | 17 | 16 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| SD23 | 17 | 17 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| SD28 | 17 | 17 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## Structured entry baseline

- Automated executable entries: **677**
- Entries blocked by trigger coverage: **38**
- Entries blocked by condition coverage: **0**
- Entries blocked by action coverage: **0**
- Represented but non-executable/manual entries: **304**

## Highest-priority trigger gaps

| Trigger/timing | Entries |
| --- | ---: |
| `whileOnField` | 3 |
| `whenAttacksOrBlocks` | 2 |
| `whileInField` | 2 |
| `whileLevel2Or3` | 2 |
| `afterCost4PlusMagicResolves` | 1 |
| `afterDivineTrust` | 1 |
| `onEligibleSummonDescendOrPlacement` | 1 |
| `onEligibleSummonOrPlacement` | 1 |
| `opposingUnitLeavesByYourEffect` | 1 |
| `whenAttacksFlash` | 1 |
| `whenBlueNexusExhausted` | 1 |
| `whenBravedOrCombinedCardWouldLeave` | 1 |
| `whenDepletedOrDestroyedByOpponent` | 1 |
| `whenDiscardedByBlueEffect` | 1 |
| `whenDiscardedByGreenOnlyEffect` | 1 |
| `whenDiscardedFromHand` | 1 |
| `whenExhaustedEitherAttackStep` | 1 |
| `whenLifeReducedByOpponentEffect` | 1 |
| `whenOpenedFromDeckByGreenEffect` | 1 |
| `whenOpponentSpiritUltimateMilled` | 1 |
| `whenOtherEligibleSpiritSummoned` | 1 |
| `whenReturnedFromTrashByYellowEffect` | 1 |
| `whenSummonedOrAttacks` | 1 |
| `whenYellowBravedSpiritAttacks` | 1 |
| `whenYourSpiritOrUltimateDestroyed` | 1 |
| `whileAttackingAndRefreshed` | 1 |
| `whileCardOrSpirit` | 1 |
| `whileInFieldOrTrash` | 1 |
| `whileInHand` | 1 |
| `whileLevel1` | 1 |

## Unsupported action/condition gaps

- Unsupported action types: none
- Unsupported condition forms: none

## Engine additions — Phases 7–18

- Core Action Library is centralized and currently exposes **83 generic action types** to Schema v2.
- Continuous effects use `match.modifierRegistry` rather than one-shot state mutation.
- Effective BP, Cost, Symbols and Colors can consume continuous modifiers dynamically.
- Canonical durations: `thisBattle`, `thisAttack`, `thisTurn`, `untilEndStep`, `whileSourceExists`, `whileConditionTrue`, `permanent`.
- `continuous` is now runtime-dispatched for explicit Schema v2 source effects on Summon/Deploy; legacy continuous text remains untouched until migrated.
- Replacement/prevention windows now cover `wouldBeDestroyed` and `wouldLoseLife` with declarative `preventEvent` / `replaceEvent` actions.
- Battle flow now dispatches `whenBlocked`, `whenBattles`, `beforeBattleResolution`, `afterBattleResolution`, and `lifeDecreased` with normalized battle context.
- All seven turn phases now dispatch canonical step events; legacy `your/opponent/either` step timings have a narrow ambient compatibility path.
- Magic, Burst and Brave automation now share the same decision/trigger infrastructure instead of falling back immediately to manual resolution.
- Ultimate mechanics formalize HIT/GUARD, Trigger Counter, Critical Hit, XU Trigger and post-resolution events inside the canonical Effect Engine flow.
- Complex Player Decisions now support targets, multiple cards, Yes/No, Hand/Trash/Deck selection, ordering and authoritative Core distribution.
- Arena Effect Resolution UI renders structured decision panels and keeps the legacy manual panel as exceptional fallback only.

## Canonical Event Model — Phase 1

The canonical list is defined in `src/game/effectEngine/canonicalEvents.js`. Legacy aliases normalize into these names without changing current gameplay behavior.

| Canonical event | Runtime dispatch today |
| --- | --- |
| `whenSummoned` | Yes |
| `whenDeployed` | Yes |
| `whenAttacks` | Yes |
| `whenBlocks` | Yes |
| `whenBattles` | Yes |
| `whenBlocked` | Yes |
| `whenBraved` | Yes |
| `whenCombined` | Yes |
| `whenAdvented` | Yes |
| `whenDestroyed` | Yes |
| `wouldBeDestroyed` | Yes |
| `wouldLoseLife` | Yes |
| `beforeBattleResolution` | Yes |
| `afterBattleResolution` | Yes |
| `lifeDecreased` | Yes |
| `magicMain` | Yes |
| `magicFlash` | Yes |
| `magicResolved` | Yes |
| `burstLifeDecrease` | Yes |
| `burstOpponentSummon` | Yes |
| `burstOpponentMagic` | Yes |
| `burstOwnSpiritDestroyed` | Yes |
| `burstOpponentHandIncrease` | Yes |
| `burst` | No — foundation only |
| `mirage` | No — foundation only |
| `continuous` | Yes |
| `startStep` | Yes |
| `coreStep` | Yes |
| `drawStep` | Yes |
| `refreshStep` | Yes |
| `mainStep` | Yes |
| `attackStep` | Yes |
| `endStep` | Yes |
| `cardMoved` | Yes |
| `cardRefreshed` | Yes |
| `cardExhausted` | Yes |
| `bpBecameZero` | Yes |
| `coreMoved` | No — foundation only |
| `afterUltimateTrigger` | Yes |
| `ultimateTriggerHit` | Yes |
| `ultimateTriggerGuard` | Yes |
| `ultimateTriggerResolved` | Yes |
| `triggerCounter` | Yes |
| `xuTriggerHit` | Yes |
| `criticalHit` | Yes |

## Cards requiring work

The JSON report contains every entry and machine-readable reason. This table lists every non-automated/non-vanilla card for migration planning.

| Card | Set | Type | Status | Main gaps |
| --- | --- | --- | --- | --- |
| `BSC49-012` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-038` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-039` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-062` | BSC49 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-064` | BSC49 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-071` | BSC49 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-086` | BSC49 | nexus | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-091` | BSC49 | magic | `UNSUPPORTED_TRIGGER` | triggers: whenDiscardedFromHand; unresolved entries: 2 |
| `BSC49-092` | BSC49 | magic | `MANUAL` | unresolved entries: 2 |
| `BSC49-093` | BSC49 | magic | `UNSUPPORTED_TRIGGER` | triggers: whileInField; unresolved entries: 2 |
| `BSC49-094` | BSC49 | magic | `UNSUPPORTED_TRIGGER` | triggers: whileInHand; unresolved entries: 2 |
| `BSC49-095` | BSC49 | magic | `UNSUPPORTED_TRIGGER` | triggers: whenLifeReducedByOpponentEffect; unresolved entries: 2 |
| `BSC49-096` | BSC49 | magic | `UNSUPPORTED_TRIGGER` | triggers: whileInField, whileInFieldOrTrash; unresolved entries: 3 |
| `BSC49-097` | BSC49 | magic | `UNSUPPORTED_TRIGGER` | triggers: whenReturnedFromTrashByYellowEffect, whenYellowBravedSpiritAttacks; unresolved entries: 3 |
| `BSC49-098` | BSC49 | magic | `MANUAL` | unresolved entries: 2 |
| `BSC49-099` | BSC49 | magic | `MANUAL` | unresolved entries: 1 |
| `BSC49-100` | BSC49 | magic | `UNSUPPORTED_TRIGGER` | triggers: whenDiscardedByBlueEffect; unresolved entries: 3 |
| `BSC49-102` | BSC49 | magic | `UNSUPPORTED_TRIGGER` | triggers: whenBlueNexusExhausted; unresolved entries: 2 |
| `BSC49-CP01` | BSC49 | spirit | `UNSUPPORTED_TRIGGER` | triggers: whenSummonedOrAttacks, whileCardOrSpirit; unresolved entries: 3 |
| `BSC49-CP02` | BSC49 | nexus | `UNSUPPORTED_TRIGGER` | triggers: onEligibleSummonOrPlacement, whileLevel1; unresolved entries: 4 |
| `BSC49-CP03` | BSC49 | nexus | `UNSUPPORTED_TRIGGER` | triggers: afterDivineTrust, onEligibleSummonDescendOrPlacement, whileLevel2; unresolved entries: 4 |
| `BSC49-XV01` | BSC49 | spirit | `MANUAL` | unresolved entries: 3 |
| `BSC49-XV02` | BSC49 | spirit | `UNSUPPORTED_TRIGGER` | triggers: whileOnField; unresolved entries: 3 |
| `BSC49-XV03` | BSC49 | spirit | `UNSUPPORTED_TRIGGER` | triggers: whileLevel2Or3; unresolved entries: 4 |
| `BSC49-XV04` | BSC49 | spirit | `UNSUPPORTED_TRIGGER` | triggers: opposingUnitLeavesByYourEffect, yourSpiritLeavesByOpponentEffect; unresolved entries: 3 |
| `BSC49-XV05` | BSC49 | spirit | `UNSUPPORTED_TRIGGER` | triggers: whenDiscardedByGreenOnlyEffect; unresolved entries: 3 |
| `BSC49-XV06` | BSC49 | spirit | `UNSUPPORTED_TRIGGER` | triggers: whenAttacksOrBlocks, whenOpenedFromDeckByGreenEffect, whileLevel3; unresolved entries: 4 |
| `BSC49-XV07` | BSC49 | spirit | `UNSUPPORTED_TRIGGER` | triggers: whileLevel2Or3, whileOnField; unresolved entries: 3 |
| `BSC49-XV08` | BSC49 | spirit | `UNSUPPORTED_TRIGGER` | triggers: whenExhaustedEitherAttackStep, whileOnField; unresolved entries: 3 |
| `BSC49-XV09` | BSC49 | spirit | `UNSUPPORTED_TRIGGER` | triggers: whenDepletedOrDestroyedByOpponent; unresolved entries: 4 |
| `BSC49-XV10` | BSC49 | spirit | `UNSUPPORTED_TRIGGER` | triggers: afterCost4PlusMagicResolves, whenOtherEligibleSpiritSummoned; unresolved entries: 3 |
| `BSC49-XV11` | BSC49 | spirit | `UNSUPPORTED_TRIGGER` | triggers: whenBravedOrCombinedCardWouldLeave; unresolved entries: 3 |
| `BSC49-XV12` | BSC49 | spirit | `UNSUPPORTED_TRIGGER` | triggers: whenAttacksOrBlocks, whenOpponentSpiritUltimateMilled, whileAttackingAndRefreshed; unresolved entries: 4 |

## Phase 4 input

Effect Schema v2, Trigger Dispatcher, Effect Queue, Targeting Engine v2, and Condition Engine v2 are now available. This coverage report remains the migration contract for the next mechanics phases: migrate cards incrementally into the DSL while expanding the action library and trigger coverage without bypassing the dispatcher or queue.

