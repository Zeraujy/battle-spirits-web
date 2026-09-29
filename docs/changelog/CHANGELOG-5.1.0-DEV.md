# v5.1.0 — Card Effects & Mechanics Engine (Development)

## Phase 0–1

- Full card effect coverage audit.
- Canonical Effect Event model and legacy aliases.

## Phase 2 — Effect Schema v2

- Added the declarative Effect Schema v2 contract.
- Added machine-readable JSON Schema (`effect-schema-v2.schema.json`).
- Added explicit trigger scope and event-player relationship.
- Added runtime normalization/validation helpers.
- Kept legacy effects source-scoped for safe incremental migration.

## Phase 3 — Trigger Dispatcher

- Added `dispatchEffectEvent()` as the central runtime trigger entry point.
- Wired summon/deploy, battle, Magic/Flash, manual compatibility and special-rules trigger calls through the dispatcher.
- Added opt-in battlefield observer triggers for Schema v2 cards.
- Preserved pending effect decisions by queuing remaining dispatches as continuation events.
- No bulk card migration is included in this phase; current gameplay coverage remains the Phase 0 baseline.

## Phase 16 — Ultimate Mechanics Expansion

- Canonicalized Ultimate Trigger HIT/GUARD/resolved events, Critical Hit and XU Trigger integration.
- Preserved Trigger Counter and existing Ultimate battle flow while routing effect timings through the common dispatcher.

## Phase 17 — Complex Player Decisions

- Expanded structured decisions for Yes/No, card-zone selection, ordering and Core distribution.
- Kept the reducer authoritative for validating all submitted choices.

## Phase 18 — Effect Resolution UI

- Expanded the Arena effect panel for card selection, ordering and Core distribution.
- Reduced dependency on Manual Resolution for structured effects.

## Phase 19 — Server Authoritative Effects

- Online effect choices now require the current server-owned decision id in addition to `stateVersion`.
- Added server-side owner/payload validation before the gameplay reducer executes.
- Redacted private pending-decision candidates/options from opponent snapshots.

## Phase 20 — Effect Stack / Trigger Ordering

- Added `TriggerBatch` for simultaneous effect dispatches.
- Added deterministic controller grouping and player ordering for ambiguous same-controller triggers.
- Added `chooseTriggerOrder` using the existing Effect Resolution UI and Effect Queue continuation flow.


## Content Migration — Batch 05

- Closed SD10 at 18/18 `READY_NO_MANUAL` with reusable deferred Attack Step ending and free special-summon semantics.
- Closed SD11 at 18/18 `READY_NO_MANUAL`, including mandatory attack-if-able, Machine Beast block-trigger relaying, Rush Burst suppression, combined Heavy Armor and Rush condition bypass.
- Core Action Library expanded from 55 to 59 action types.
- Set gate improved from 4/11 to 6/11.
- Manual Resolution fallback improved from 70.96% (259/365) to 67.40% (246/365).
- Phase 24 generated regression scenarios increased from 106 to 119.
- Main suite 149/149, Effect Engine 93/93, Batch 05 13/13 and full regression 292/292 all pass.
- Internal application version remains 5.0.3 while the v5.1.0 final content gate remains open.

## v5.1.0 Content Migration — Batch 07

- SD28 — Ultimate Deck: Land of Deep Green reaches 17/17 READY_NO_MANUAL.
- Set gate advances from 7/11 to 8/11 complete sets.
- Added reusable High Speed support during Flash priority and activated field Flash actions.
- Added hand observers, opponent-hand-increase Burst timing, source special summon, dynamic target counts and new continuous modifiers for SD28 mechanics.
- Core Action Library advances from 64 to 66 action types.
- Manual fallback drops from 63.56% (232/365) to 59.45% (217/365).
- Per-card regression coverage advances from 133 to 148 scenarios.
- Internal application version remains 5.0.3 while the v5.1.0 final content gate remains open.

