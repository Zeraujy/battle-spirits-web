# Content Migration Batch 23 — BSC49 Wave 8

Internal version: **5.0.3**  
Target release: **v5.1.0**

## Scope
Batch 23 continues from the Batch 22 baseline and deliberately clears the remaining direct Spirit/Nexus/Magic cluster before the XV/Contract/GranWalker structural block.

## BSC49 progress
- Runtime cards: **117**
- Resolved before Batch 23: **72/117**
- Newly automated in Batch 23: **12**
- Resolved after Batch 23: **84/117**
- Remaining unresolved: **33**
- Set gate: **IN_PROGRESS**

Cards migrated: `BSC49-021`, `BSC49-029`, `BSC49-041`, `BSC49-042`, `BSC49-043`, `BSC49-075`, `BSC49-078`, `BSC49-080`, `BSC49-084`, `BSC49-088`, `BSC49-089`, `BSC49-090`.

## Reusable engine work
- Generic `controlsNameIncludes` condition.
- Generic `eventMovedByEffect` condition.
- Generic `eventSourceBraved` condition.
- Existing `draw` action can now draw from the bottom of the deck through `from: "bottom"`.
- No new Core Action type was required; library remains **83**.

## Global coverage
- Batch 22 manual fallback: **12.33% — 45/365**
- Batch 23 manual fallback: **9.04% — 33/365**
- Improvement: **12 cards removed from manual fallback**
- Phase 25 `<10%` gate: **PASS**
- Phase 24 generated card scenarios: **320 → 332**
- Complete content gates: **10/11**

Remaining gated set:
- BSC49 — **33 unresolved**

## Remaining BSC49 shape
- 7 direct unstructured cards remain.
- 4 manual cards remain.
- 22 cards remain blocked by unsupported triggers, concentrated in advanced Magic, CP Contract/GranWalker, and XV mechanics.

## Next batch
**Batch 24 — BSC49 Wave 9** should consume the final direct/unstructured cluster first (`012`, `038`, `039`, `062`, `064`, `071`, `086`) and then begin the reusable trigger foundation needed by the advanced Magic/CP/XV block.
