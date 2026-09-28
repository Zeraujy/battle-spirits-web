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

