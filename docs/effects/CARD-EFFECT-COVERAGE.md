# Card Effect Coverage — v5.1.0 Card Effects & Mechanics Engine (Phase 0–20)

> Scope: runtime gameplay catalog (`src/data/cards.json`). Artwork-only/public database records that are not loaded into the gameplay catalog are intentionally excluded.

## Baseline

- Runtime cards audited: **365**
- Sets audited: **11**
- Structured effect/ability entries inspected: **457**
- Effect Schema v2 entries: **0**
- Fully automated cards: **33 (9.0%)**
- Partially automated cards: **23**
- Unstructured effect text: **173**
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
| BS13 | 90 | 0 | 0 | 0 | 0 | 0 | 0 | 84 | 6 |
| BSC49 | 117 | 0 | 0 | 5 | 22 | 0 | 0 | 89 | 1 |
| SD10 | 18 | 5 | 6 | 6 | 0 | 0 | 0 | 0 | 1 |
| SD11 | 18 | 3 | 4 | 10 | 0 | 0 | 0 | 0 | 1 |
| SD13 | 18 | 6 | 3 | 5 | 1 | 0 | 0 | 0 | 3 |
| SD15 | 18 | 0 | 0 | 14 | 3 | 0 | 0 | 0 | 1 |
| SD17 | 18 | 5 | 2 | 10 | 0 | 0 | 0 | 0 | 1 |
| SD19 | 17 | 7 | 0 | 8 | 1 | 0 | 0 | 0 | 1 |
| SD20 | 17 | 6 | 1 | 8 | 1 | 0 | 0 | 0 | 1 |
| SD23 | 17 | 0 | 1 | 13 | 3 | 0 | 0 | 0 | 0 |
| SD28 | 17 | 1 | 6 | 8 | 2 | 0 | 0 | 0 | 0 |

## Structured entry baseline

- Automated executable entries: **70**
- Entries blocked by trigger coverage: **50**
- Entries blocked by condition coverage: **0**
- Entries blocked by action coverage: **0**
- Represented but non-executable/manual entries: **337**

## Highest-priority trigger gaps

| Trigger/timing | Entries |
| --- | ---: |
| `whileOnField` | 3 |
| `whenAttacksOrBlocks` | 2 |
| `whenOpponentSpiritBecomesZeroBP` | 2 |
| `whileInField` | 2 |
| `whileLevel2Or3` | 2 |
| `afterCost4PlusMagicResolves` | 1 |
| `afterDivineTrust` | 1 |
| `afterOpponentDestroysYourSpirit` | 1 |
| `onEligibleSummonDescendOrPlacement` | 1 |
| `onEligibleSummonOrPlacement` | 1 |
| `onOwnLowCostPurpleDestroyedBySpiritEffect` | 1 |
| `opponentHandIncrease` | 1 |
| `opponentTurn` | 1 |
| `opposingUnitLeavesByYourEffect` | 1 |
| `ownDivineSpiritReturnedByOpponent` | 1 |
| `ownLowCostSpiritDestroyedByOpponentEffect` | 1 |
| `ownSpiritOrUltimateDestroyedByOpponent` | 1 |
| `shellmanUltimateBattle` | 1 |
| `whenAttacksFlash` | 1 |
| `whenBlueNexusExhausted` | 1 |
| `whenBravedOrCombinedCardWouldLeave` | 1 |
| `whenDepletedOrDestroyedByOpponent` | 1 |
| `whenDestroyedByOpponent` | 1 |
| `whenDiscardedByBlueEffect` | 1 |
| `whenDiscardedByGreenOnlyEffect` | 1 |
| `whenDiscardedFromHand` | 1 |
| `whenExhaustedEitherAttackStep` | 1 |
| `whenLifeDecreases` | 1 |
| `whenLifeReducedByOpponentEffect` | 1 |
| `whenOpenedFromDeckByGreenEffect` | 1 |

## Unsupported action/condition gaps

- Unsupported action types: none
- Unsupported condition forms: none

## Engine additions — Phases 7–18

- Core Action Library is centralized and currently exposes **51 generic action types** to Schema v2.
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
| `whenDestroyed` | Yes |
| `wouldBeDestroyed` | Yes |
| `wouldLoseLife` | Yes |
| `beforeBattleResolution` | Yes |
| `afterBattleResolution` | Yes |
| `lifeDecreased` | Yes |
| `magicMain` | Yes |
| `magicFlash` | Yes |
| `burstLifeDecrease` | Yes |
| `burstOpponentSummon` | Yes |
| `burstOpponentMagic` | Yes |
| `burstOwnSpiritDestroyed` | Yes |
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
| `cardMoved` | No — foundation only |
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
| `BS01-125` | SD13 | magic | `MANUAL` | unresolved entries: 1 |
| `BS05-037` | SD15 | spirit | `MANUAL` | unresolved entries: 1 |
| `BS06-023` | SD13 | spirit | `MANUAL` | unresolved entries: 1 |
| `BS08-042` | SD15 | spirit | `MANUAL` | unresolved entries: 2 |
| `BS09-015` | SD13 | spirit | `MANUAL` | unresolved entries: 2 |
| `BS10-074` | SD15 | brave | `MANUAL` | unresolved entries: 2 |
| `BS11-051` | SD13 | brave | `PARTIAL` | unresolved entries: 2 |
| `BS11-075` | SD13 | magic | `MANUAL` | unresolved entries: 1 |
| `BS12-035` | SD15 | spirit | `MANUAL` | unresolved entries: 1 |
| `BS12-037` | SD15 | spirit | `MANUAL` | unresolved entries: 2 |
| `BS12-038` | SD15 | spirit | `MANUAL` | unresolved entries: 2 |
| `BS12-063` | SD13 | nexus | `PARTIAL` | unresolved entries: 1 |
| `BS13-002` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-003` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-004` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-005` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-006` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-007` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-008` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-010` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-011` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-012` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-013` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-014` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-015` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-016` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-017` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-019` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-020` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-021` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-022` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-023` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-024` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-026` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-027` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-028` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-029` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-030` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-031` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-032` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-034` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-035` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-036` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-037` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-038` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-039` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-040` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-042` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-043` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-044` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-045` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-046` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-047` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-048` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-049` | BS13 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-050` | BS13 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-051` | BS13 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-052` | BS13 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-053` | BS13 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-054` | BS13 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-055` | BS13 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-056` | BS13 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-057` | BS13 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-058` | BS13 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-059` | BS13 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-060` | BS13 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-061` | BS13 | nexus | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-062` | BS13 | nexus | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-063` | BS13 | nexus | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-064` | BS13 | nexus | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-065` | BS13 | nexus | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-066` | BS13 | nexus | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-067` | BS13 | nexus | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-068` | BS13 | nexus | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-069` | BS13 | nexus | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-070` | BS13 | nexus | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-071` | BS13 | nexus | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-072` | BS13 | nexus | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-073` | BS13 | magic | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-074` | BS13 | magic | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-075` | BS13 | magic | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-076` | BS13 | magic | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-077` | BS13 | magic | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-078` | BS13 | magic | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-079` | BS13 | magic | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-080` | BS13 | magic | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-081` | BS13 | magic | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-082` | BS13 | magic | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-083` | BS13 | magic | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-084` | BS13 | magic | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-X01` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-X02` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-X03` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-X04` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-X05` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BS13-X06` | BS13 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC05-020` | SD15 | nexus | `UNSUPPORTED_TRIGGER` | triggers: opponentTurn, whenLifeDecreases; unresolved entries: 2 |
| `BSC49-001` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-002` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-003` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-004` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-005` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-006` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-007` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-008` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-009` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-010` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-011` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-012` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-013` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-014` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-015` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-016` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-017` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-018` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-019` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-020` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-021` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-022` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-023` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-024` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-025` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-026` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-027` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-028` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-029` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-030` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-031` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-032` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-033` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-034` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-035` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-036` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-037` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-038` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-039` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-040` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-041` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-042` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-043` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-044` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-045` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-046` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-047` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-048` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-049` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-050` | BSC49 | spirit | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-051` | BSC49 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-052` | BSC49 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-053` | BSC49 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-054` | BSC49 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-055` | BSC49 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-056` | BSC49 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-057` | BSC49 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-058` | BSC49 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-059` | BSC49 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-060` | BSC49 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-061` | BSC49 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-062` | BSC49 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-063` | BSC49 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-064` | BSC49 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-065` | BSC49 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-066` | BSC49 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-067` | BSC49 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-068` | BSC49 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-069` | BSC49 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-070` | BSC49 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-071` | BSC49 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-073` | BSC49 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-074` | BSC49 | brave | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-075` | BSC49 | nexus | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-076` | BSC49 | nexus | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-077` | BSC49 | nexus | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-078` | BSC49 | nexus | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-079` | BSC49 | nexus | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-080` | BSC49 | nexus | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-081` | BSC49 | nexus | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-082` | BSC49 | nexus | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-083` | BSC49 | nexus | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-084` | BSC49 | nexus | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-085` | BSC49 | nexus | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-086` | BSC49 | nexus | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-087` | BSC49 | magic | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-088` | BSC49 | magic | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-089` | BSC49 | magic | `UNSTRUCTURED_TEXT` | structured operations missing |
| `BSC49-090` | BSC49 | magic | `UNSTRUCTURED_TEXT` | structured operations missing |
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
| `BSC49-101` | BSC49 | magic | `MANUAL` | unresolved entries: 2 |
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
| `SD02-005` | SD15 | spirit | `MANUAL` | unresolved entries: 3 |
| `SD10-001` | SD10 | spirit | `MANUAL` | unresolved entries: 1 |
| `SD10-002` | SD10 | spirit | `PARTIAL` | unresolved entries: 1 |
| `SD10-005` | SD10 | spirit | `MANUAL` | unresolved entries: 1 |
| `SD10-008` | SD10 | spirit | `MANUAL` | unresolved entries: 2 |
| `SD10-009` | SD10 | spirit | `PARTIAL` | unresolved entries: 1 |
| `SD10-010` | SD10 | spirit | `PARTIAL` | unresolved entries: 2 |
| `SD10-011` | SD10 | brave | `PARTIAL` | unresolved entries: 1 |
| `SD10-012` | SD10 | nexus | `MANUAL` | unresolved entries: 2 |
| `SD10-013` | SD10 | nexus | `MANUAL` | unresolved entries: 2 |
| `SD10-015` | SD10 | magic | `MANUAL` | unresolved entries: 1 |
| `SD10-X01` | SD10 | spirit | `PARTIAL` | unresolved entries: 2 |
| `SD10-X02` | SD10 | brave | `PARTIAL` | unresolved entries: 3 |
| `SD11-001` | SD11 | spirit | `MANUAL` | unresolved entries: 2 |
| `SD11-004` | SD11 | spirit | `PARTIAL` | unresolved entries: 1 |
| `SD11-005` | SD11 | spirit | `PARTIAL` | unresolved entries: 1 |
| `SD11-006` | SD11 | spirit | `MANUAL` | unresolved entries: 1 |
| `SD11-007` | SD11 | spirit | `PARTIAL` | unresolved entries: 1 |
| `SD11-008` | SD11 | spirit | `MANUAL` | unresolved entries: 1 |
| `SD11-009` | SD11 | spirit | `MANUAL` | unresolved entries: 2 |
| `SD11-010` | SD11 | spirit | `MANUAL` | unresolved entries: 3 |
| `SD11-011` | SD11 | brave | `PARTIAL` | unresolved entries: 2 |
| `SD11-012` | SD11 | nexus | `MANUAL` | unresolved entries: 2 |
| `SD11-013` | SD11 | nexus | `MANUAL` | unresolved entries: 2 |
| `SD11-014` | SD11 | magic | `MANUAL` | unresolved entries: 2 |
| `SD11-X01` | SD11 | spirit | `MANUAL` | unresolved entries: 3 |
| `SD11-X02` | SD11 | brave | `MANUAL` | unresolved entries: 3 |
| `SD13-002` | SD13 | spirit | `UNSUPPORTED_TRIGGER` | triggers: onOwnLowCostPurpleDestroyedBySpiritEffect; unresolved entries: 1 |
| `SD13-007` | SD13 | brave | `PARTIAL` | unresolved entries: 1 |
| `SD13-X01` | SD13 | spirit | `MANUAL` | unresolved entries: 2 |
| `SD15-001` | SD15 | spirit | `MANUAL` | unresolved entries: 1 |
| `SD15-002` | SD15 | spirit | `UNSUPPORTED_TRIGGER` | triggers: whenOpponentSpiritBecomesZeroBP; unresolved entries: 2 |
| `SD15-003` | SD15 | spirit | `MANUAL` | unresolved entries: 2 |
| `SD15-004` | SD15 | spirit | `MANUAL` | unresolved entries: 2 |
| `SD15-005` | SD15 | spirit | `MANUAL` | unresolved entries: 3 |
| `SD15-006` | SD15 | brave | `MANUAL` | unresolved entries: 3 |
| `SD15-007` | SD15 | magic | `MANUAL` | unresolved entries: 1 |
| `SD15-008` | SD15 | magic | `MANUAL` | unresolved entries: 2 |
| `SD15-X01` | SD15 | spirit | `UNSUPPORTED_TRIGGER` | triggers: ownLowCostSpiritDestroyedByOpponentEffect, whenOpponentSpiritBecomesZeroBP; unresolved entries: 3 |
| `SD17-001` | SD17 | spirit | `MANUAL` | unresolved entries: 1 |
| `SD17-002` | SD17 | spirit | `MANUAL` | unresolved entries: 1 |
| `SD17-003` | SD17 | spirit | `MANUAL` | unresolved entries: 1 |
| `SD17-005` | SD17 | spirit | `MANUAL` | unresolved entries: 1 |
| `SD17-006` | SD17 | spirit | `PARTIAL` | unresolved entries: 1 |
| `SD17-008` | SD17 | spirit | `MANUAL` | unresolved entries: 2 |
| `SD17-009` | SD17 | spirit | `MANUAL` | unresolved entries: 2 |
| `SD17-011` | SD17 | brave | `MANUAL` | unresolved entries: 3 |
| `SD17-012` | SD17 | nexus | `MANUAL` | unresolved entries: 2 |
| `SD17-013` | SD17 | nexus | `MANUAL` | unresolved entries: 2 |
| `SD17-X01` | SD17 | spirit | `MANUAL` | unresolved entries: 3 |
| `SD17-X02` | SD17 | brave | `PARTIAL` | unresolved entries: 2 |
| `SD19-002` | SD19 | spirit | `MANUAL` | unresolved entries: 1 |
| `SD19-005` | SD19 | spirit | `MANUAL` | unresolved entries: 1 |
| `SD19-007` | SD19 | spirit | `MANUAL` | unresolved entries: 1 |
| `SD19-008` | SD19 | ultimate | `MANUAL` | unresolved entries: 2 |
| `SD19-009` | SD19 | ultimate | `MANUAL` | unresolved entries: 2 |
| `SD19-010` | SD19 | ultimate | `MANUAL` | unresolved entries: 3 |
| `SD19-011` | SD19 | nexus | `MANUAL` | unresolved entries: 2 |
| `SD19-012` | SD19 | nexus | `MANUAL` | unresolved entries: 2 |
| `SD19-X01` | SD19 | ultimate | `UNSUPPORTED_TRIGGER` | triggers: whenAttacksFlash; unresolved entries: 3 |
| `SD20-002` | SD20 | spirit | `MANUAL` | unresolved entries: 1 |
| `SD20-004` | SD20 | spirit | `MANUAL` | unresolved entries: 2 |
| `SD20-005` | SD20 | spirit | `PARTIAL` | unresolved entries: 1 |
| `SD20-007` | SD20 | spirit | `MANUAL` | unresolved entries: 2 |
| `SD20-008` | SD20 | ultimate | `MANUAL` | unresolved entries: 2 |
| `SD20-009` | SD20 | ultimate | `MANUAL` | unresolved entries: 2 |
| `SD20-010` | SD20 | ultimate | `MANUAL` | unresolved entries: 3 |
| `SD20-011` | SD20 | nexus | `MANUAL` | unresolved entries: 2 |
| `SD20-012` | SD20 | nexus | `UNSUPPORTED_TRIGGER` | triggers: whenYourSpiritOrUltimateDestroyed; unresolved entries: 2 |
| `SD20-X01` | SD20 | ultimate | `MANUAL` | unresolved entries: 4 |
| `SD23-001` | SD23 | spirit | `UNSUPPORTED_TRIGGER` | triggers: whenDestroyedByOpponent; unresolved entries: 1 |
| `SD23-002` | SD23 | spirit | `MANUAL` | unresolved entries: 1 |
| `SD23-003` | SD23 | spirit | `MANUAL` | unresolved entries: 1 |
| `SD23-004` | SD23 | spirit | `MANUAL` | unresolved entries: 1 |
| `SD23-005` | SD23 | spirit | `MANUAL` | unresolved entries: 1 |
| `SD23-006` | SD23 | spirit | `MANUAL` | unresolved entries: 2 |
| `SD23-007` | SD23 | spirit | `MANUAL` | unresolved entries: 2 |
| `SD23-008` | SD23 | ultimate | `MANUAL` | unresolved entries: 2 |
| `SD23-009` | SD23 | ultimate | `MANUAL` | unresolved entries: 3 |
| `SD23-010` | SD23 | ultimate | `MANUAL` | unresolved entries: 3 |
| `SD23-011` | SD23 | nexus | `UNSUPPORTED_TRIGGER` | triggers: ownDivineSpiritReturnedByOpponent; unresolved entries: 2 |
| `SD23-012` | SD23 | magic | `MANUAL` | unresolved entries: 1 |
| `SD23-013` | SD23 | magic | `UNSUPPORTED_TRIGGER` | triggers: afterOpponentDestroysYourSpirit; unresolved entries: 2 |
| `SD23-014` | SD23 | magic | `MANUAL` | unresolved entries: 2 |
| `SD23-015` | SD23 | magic | `MANUAL` | unresolved entries: 1 |
| `SD23-016` | SD23 | magic | `MANUAL` | unresolved entries: 1 |
| `SD23-X01` | SD23 | ultimate | `PARTIAL` | unresolved entries: 3 |
| `SD28-001` | SD28 | spirit | `MANUAL` | unresolved entries: 1 |
| `SD28-002` | SD28 | spirit | `PARTIAL` | unresolved entries: 1 |
| `SD28-003` | SD28 | spirit | `PARTIAL` | triggers: shellmanUltimateBattle; unresolved entries: 1 |
| `SD28-004` | SD28 | spirit | `MANUAL` | unresolved entries: 2 |
| `SD28-005` | SD28 | spirit | `MANUAL` | unresolved entries: 1 |
| `SD28-006` | SD28 | spirit | `PARTIAL` | unresolved entries: 2 |
| `SD28-007` | SD28 | ultimate | `MANUAL` | unresolved entries: 3 |
| `SD28-008` | SD28 | ultimate | `PARTIAL` | unresolved entries: 3 |
| `SD28-009` | SD28 | ultimate | `PARTIAL` | unresolved entries: 1 |
| `SD28-010` | SD28 | brave | `MANUAL` | unresolved entries: 3 |
| `SD28-011` | SD28 | brave | `PARTIAL` | unresolved entries: 3 |
| `SD28-012` | SD28 | nexus | `MANUAL` | unresolved entries: 2 |
| `SD28-014` | SD28 | magic | `UNSUPPORTED_TRIGGER` | triggers: opponentHandIncrease; unresolved entries: 2 |
| `SD28-015` | SD28 | magic | `MANUAL` | unresolved entries: 1 |
| `SD28-X01` | SD28 | ultimate | `UNSUPPORTED_TRIGGER` | triggers: ownSpiritOrUltimateDestroyedByOpponent; unresolved entries: 3 |
| `SD28-X02` | SD28 | brave | `MANUAL` | unresolved entries: 4 |

## Phase 4 input

Effect Schema v2, Trigger Dispatcher, Effect Queue, Targeting Engine v2, and Condition Engine v2 are now available. This coverage report remains the migration contract for the next mechanics phases: migrate cards incrementally into the DSL while expanding the action library and trigger coverage without bypassing the dispatcher or queue.

