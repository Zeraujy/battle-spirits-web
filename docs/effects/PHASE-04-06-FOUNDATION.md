# v5.1.0 — Phase 4–6 Foundation

This block adds deterministic effect sequencing plus generic targeting and condition evaluation without bulk-migrating card data.

## Architecture

`Canonical Event -> Trigger Dispatcher -> Effect Queue -> Condition Engine -> Targeting Engine -> Action Resolver`

A player choice pauses the Effect Queue. The queue resumes from authoritative match state after the decision is validated.

## Compatibility

- Effect Schema v2 remains optional per effect entry.
- Legacy target/condition shapes still resolve through facades.
- Existing card IDs are not hardcoded into the three new engines.
- This phase does not yet implement the Phase 7 action-library expansion or Phase 20 simultaneous-trigger ordering.
