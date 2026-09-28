# Phase 14 — Burst Engine v2

Burst eligibility now uses explicit automatic event windows.

Recognized automatic windows in this phase:

- `burstLifeDecrease`
- `burstOpponentSummon`
- `burstOpponentMagic`
- `burstOwnSpiritDestroyed`

The engine opens `match.burstOpportunity` only when the set Burst matches the generated event and player relationship. Legacy/unknown Burst conditions still require the existing confirmation fallback instead of being guessed.
