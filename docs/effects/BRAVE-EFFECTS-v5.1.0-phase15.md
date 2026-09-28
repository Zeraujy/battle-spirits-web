# Phase 15 — Brave Effects

Brave combination is now integrated with the canonical Effect Engine.

- `whenBraved` is dispatched for the Brave when combination succeeds.
- `whenCombined` is dispatched for the host.
- Direct Combine uses the same trigger model.
- Combined Brave effects can be dispatched with host context (`isCombined`, `combinedHostInstanceId`, `inheritedFromBrave`).
- Existing effective BP, Cost, Color and Symbol inheritance remains centralized in selectors.
- Family/name inheritance remains intentionally excluded according to the existing Brave rule model.
