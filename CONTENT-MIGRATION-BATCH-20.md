# Content Migration Batch 20 — BSC49 Wave 5

Internal version: **5.0.3**  
Target release: **v5.1.0**

## Scope

Batch 20 continues BSC49 from the Batch 19 baseline and establishes the reusable **Advent / Advent-source foundation** while consuming additional Brave and Open Area interactions.

## BSC49 progress

- Runtime cards: **117**
- Resolved before Batch 20: **41/117**
- Newly automated in Batch 20: **10**
- Resolved after Batch 20: **51/117**
- Remaining unresolved: **66**
- Set gate coverage: **43.6%**
- Set gate: **IN_PROGRESS**

Cards migrated: `BSC49-008`, `BSC49-027`, `BSC49-040`, `BSC49-049`, `BSC49-056`, `BSC49-058`, `BSC49-066`, `BSC49-067`, `BSC49-068`, `BSC49-073`.

## Generic engine work

- canonical `whenAdvented` runtime event
- reusable `performAdvent` action
  - pays the Soul Core to Trash
  - preserves the qualifying Spirit's exhaustion/core state
  - retains the Advent source underneath the new Spirit
  - transfers Brave host and current battle references to the Advented Spirit
- reusable `specialSummonSelected` for selected cards in hand/Open Area/Trash
- reusable `revealUntilAndSummon` deck-routing action
- generic minimum/maximum symbol-count target filters
- Core Action Library: **80 → 83 action types**

## Global coverage

- Batch 19 manual fallback: **20.82% — 76/365**
- Batch 20 manual fallback: **18.08% — 66/365**
- Improvement: **10 cards removed from manual fallback**
- Phase 24 generated card scenarios: **289 → 299**
- Complete content gates: **10/11**

Remaining gated set:
- BSC49 — **66 unresolved**

## QA

- Main suite: **149/149 PASS**
- Effect Engine: **245/245 PASS**
- Batch 20 dedicated: **10/10 PASS**
- Full regression: **444/444 PASS**
- Phase 24 generated scenarios: **299**
- Phase 26 Mechanics QA: **PASS**
- `npm run verify`: **PASS**
- UI audit: **PASS**
- Release audit: **PASS**
- Security audit: **PASS**
- Web-only audit: **PASS**
- Phase 27: blocked only by the BSC49 set gate and `<10%` manual fallback gate

`npm run build` remains source-package dependent on local `node_modules`; `vite` is not bundled into migration packages.

## Next batch

**Batch 21 — BSC49 Wave 6** should continue from **66 unresolved cards**, prioritizing remaining Brave/Accel/Open Area cards that can reuse the new Advent and selected-zone summon primitives before moving into the more specialized XV/Contract interactions.
