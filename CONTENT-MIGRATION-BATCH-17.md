# Content Migration Batch 17 — BSC49 Wave 2

Internal version: **5.0.3**  
Target release: **v5.1.0**

## Scope

Batch 17 continues the final content block, BSC49 — Dream Booster: Stars Around, from the Batch 16 baseline. This wave migrates ten cards centered on reveal/search, Immortality, Trash recovery, summon/attack observers and destruction riders, while deliberately leaving Accel/Advent/Open Area for a later structural wave.

## BSC49 progress

- Runtime cards: **117**
- Resolved before Batch 17: **11/117**
- Newly automated in Batch 17: **10**
- Resolved after Batch 17: **21/117**
- Remaining unresolved: **96**
- Gate coverage: **17.9%**
- Set gate: **IN_PROGRESS**

Cards migrated: BSC49-003, BSC49-005, BSC49-006, BSC49-007, BSC49-010, BSC49-011, BSC49-014, BSC49-016, BSC49-017 and BSC49-018.

## Generic engine reuse

- reused controller-Trash observers for engine-native Immortality families
- reused canonical `cardMoved`, `whenDestroyed`, `whenSummoned` and `whenAttacks` observers
- reused reveal routing, once-per-turn gates, free Special Summon from Trash/hand, dynamic BP targeting and continuous symbol modifiers
- added no BSC49-specific Core Action types
- kept Accel, Advent and Open Area mechanics out of this wave so they can receive dedicated reusable semantics instead of card-specific stubs

## Global coverage

- Batch 16 manual fallback: **29.04% — 106/365**
- Batch 17 manual fallback: **26.30% — 96/365**
- Improvement: **10 cards removed from manual fallback**
- Phase 24 generated card scenarios: **259 → 269**
- Core Action Library: **78 action types**
- Complete content gates: **10/11**

Remaining gated set:
- BSC49 — **96 unresolved**

## QA

- Main suite: **149/149 PASS**
- Effect Engine: **212/212 PASS**
- Batch 17 dedicated: **9/9 PASS**
- Full regression: **411/411 PASS**
- Phase 26 Mechanics QA: **PASS**
- `npm run verify`: **PASS**
- UI audit: **PASS**
- Release audit: **PASS**
- Security audit: **PASS**
- Web-only audit: **PASS**
- Phase 27: blocked only by the BSC49 set gate and `<10%` manual fallback gate

`npm run build` was attempted, but this source-only package does not contain `node_modules`; `vite` is unavailable. No dependencies were injected into the package.

## Next batch

**Batch 18 — BSC49 Wave 3** should continue from 96 unresolved cards. The next logical target is another 10-card family block while preparing reusable Accel/Open Area and Advent semantics for the heavier later waves.
