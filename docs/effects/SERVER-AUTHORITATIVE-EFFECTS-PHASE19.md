# Phase 19 — Server Authoritative Effects

Online effect choices are treated as intents only. The Socket.IO server owns the authoritative match, validates the current `stateVersion`, verifies the pending decision owner and requires the client to echo the current decision id before `applyGameAction()` is called.

`validateServerEffectDecisionIntent()` rejects stale, missing, oversized or wrong-owner decision requests. The reducer remains the canonical mechanics validator for targets, options, ordering, BP totals and Core distribution.

Opponent snapshots redact candidates and option payloads from `pendingEffectDecision`; the non-owner only receives enough metadata to render the waiting state.
