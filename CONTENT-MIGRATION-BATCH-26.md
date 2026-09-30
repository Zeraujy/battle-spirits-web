# Content Migration Batch 26 — BSC49 Wave 11

Internal version: **5.0.3**  
Target release: **v5.1.0**

## Scope
Batch 26 continues the advanced Magic foundation while keeping Contract/GranWalker and XV isolated for later structural waves.

## BSC49 progress
- Runtime cards: **117**
- Resolved before Batch 26: **94/117**
- Newly automated in Batch 26: **2**
- Resolved after Batch 26: **96/117**
- Remaining unresolved: **21**
- Set gate: **IN_PROGRESS**

Cards migrated: `BSC49-093`, `BSC49-102`.

## Reusable engine work
- `placeSourceInField`: generic action for Magic/other source cards that remain in Field after resolving.
- `ignoreEffectImmunity` targeting flag for card text that explicitly states an effect cannot be prevented.
- Runtime enforcement of the existing `cannotRefresh` modifier inside the generic Refresh action.
- Reused canonical lowest-cost targeting, Trash observers, Nexus exhaustion events and card-move events.

Core Action Library: **85** action types.

## Global coverage
- Batch 25 manual fallback: **6.30% — 23/365**
- Batch 26 manual fallback: **5.75% — 21/365**
- Phase 25 `<10%` gate: **PASS**
- Phase 24 generated scenarios: **342 → 344**
- Complete content gates: **10/11**

Remaining gated set:
- BSC49 — **21 unresolved**

## QA
- Main suite: **149/149 PASS**
- Effect Engine: **306/306 PASS**
- Batch 26 dedicated: **5/5 PASS**
- Full regression: **505/505 PASS**
- Phase 25: **PASS**
- Phase 26: **PASS**
- Phase 27: blocked only by BSC49 Phase 23 set gate.

## Next batch
**Batch 27 — BSC49 Wave 12** should continue the unresolved advanced Magic cards (`091`, `094–096`, `099`, `100`) before moving into CP/Contract/GranWalker and XV.
