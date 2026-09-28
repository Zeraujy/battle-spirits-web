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
