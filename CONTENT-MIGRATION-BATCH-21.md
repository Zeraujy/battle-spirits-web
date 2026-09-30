# Content Migration Batch 21 — BSC49 Wave 6

Internal version: **5.0.3**  
Target release: **v5.1.0**

## Scope

Batch 21 continues BSC49 from the Batch 20 baseline and consumes a second Brave-heavy wave by reusing the existing generic action library rather than adding card-specific reducer behavior.

## BSC49 progress

- Runtime cards: **117**
- Resolved before Batch 21: **51/117**
- Newly automated in Batch 21: **10**
- Resolved after Batch 21: **61/117**
- Remaining unresolved: **56**
- Set gate coverage: **52.1%**
- Set gate: **IN_PROGRESS**

Cards migrated: `BSC49-052`, `BSC49-053`, `BSC49-054`, `BSC49-055`, `BSC49-057`, `BSC49-060`, `BSC49-061`, `BSC49-065`, `BSC49-069`, `BSC49-074`.

## Reused engine semantics

- deck-to-Trash recovery via canonical card movement observers
- paid conditional summon from hand/Trash
- generic Combine Conditions and combined-host modifiers
- BP-bounded destruction and multi-target removal
- reveal routing and Trash recovery
- field Core removal and battle-scoped symbol gain
- post-battle refresh through existing BP-comparison events
- refresh locks and Brave/Nexus immunity modifiers
- Nexus exhaustion/suppression and Sacred Life routing

No new Core Action type was required in this batch. Core Action Library remains **83 action types**.

## Global coverage

- Batch 20 manual fallback: **18.08% — 66/365**
- Batch 21 manual fallback: **15.34% — 56/365**
- Improvement: **10 cards removed from manual fallback**
- Phase 24 generated card scenarios: **299 → 309**
- Complete content gates: **10/11**

Remaining gated set:
- BSC49 — **56 unresolved**

## QA

- Dedicated Batch 21 tests: **12/12 PASS**
- Phase 24 generated scenarios: **309**
- Phase 25 manual fallback: **15.34% (56/365)** — final `<10%` target still blocked
- Phase 26 Mechanics QA: **PASS**

Final regression/audits are recorded in `BUILD-STATUS-v5.1.0-content-batch21.md`.

## Next batch

**Batch 22 — BSC49 Wave 7** should continue from **56 unresolved cards**, prioritizing the remaining straightforward Spirit/Nexus/Magic cards before the specialized XV/Contract/GranWalker cluster.
