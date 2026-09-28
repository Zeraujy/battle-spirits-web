# v5.1.0 — Phase 16: Ultimate Mechanics Expansion

Phase 16 consolidates Ultimate-exclusive timings inside the canonical Effect Engine flow.

## Canonical timings

- `ultimateTriggerHit`
- `ultimateTriggerGuard`
- `ultimateTriggerResolved`
- `triggerCounter`
- `xuTriggerHit`
- `criticalHit`

## Runtime behavior

Ultimate Trigger keeps its authoritative battle pause and reveal state, but GUARD and post-resolution effects now dispatch through the same event engine used by normal card abilities. Trigger Counter remains validated through the reducer. Critical Hit continues to use its structured condition/actions and is now part of the canonical event vocabulary. XU Trigger remains a second reveal sequence after the base U-Trigger and resolves its HIT through the shared action/decision system.

The phase preserves the existing rule that equal Cost is GUARD and that a Trigger Counter window must finish before U-Trigger resolution continues.
