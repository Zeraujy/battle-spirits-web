# Content Migration Batch 30 — BSC49 Wave 15

Internal version: **5.0.3**  
Target release: **v5.1.0**

## Scope
Batch 30 continues the final advanced-Magic cleanup before CP/Contract/GranWalker/XV. This wave closes Delta Barrier LT and adds reusable reactive Life-loss and Life-floor protection semantics without adding a new Core Action.

## BSC49 progress
- Runtime cards: **117**
- Resolved before Batch 30: **99/117**
- Newly automated in Batch 30: **1**
- Resolved after Batch 30: **100/117**
- Remaining unresolved: **17**
- Set gate: **IN_PROGRESS**

Card migrated: `BSC49-095`.

## Reusable engine work
- Effect-caused Life loss now emits the canonical `lifeDecreased` event, allowing hand observers and other reactive effects to respond consistently.
- `controllerHand` Schema v2 observers now also scan Open Area, matching the simulator's current Hand/Hand Area interaction model.
- Added generic `eventSourceIsOpponent` condition support.
- Added reusable turn protections that prevent Life from becoming 0 from opposing effects and from opposing Spirit/Ultimate attacks meeting a minimum cost threshold.
- Delta Barrier LT can react to opposing effect Life loss, relay its Flash without paying cost, and install both Life-floor protections for the turn.
- The simulator resolves triggered effects atomically, so the immediate-use source cannot be interrupted by another opposing effect before its Magic resolution completes.

Core Action Library: **85** action types.

## Global coverage
- Batch 29 manual fallback: **4.93% — 18/365**
- Batch 30 manual fallback: **4.66% — 17/365**
- Phase 25 `<10%` gate: **PASS**
- Phase 24 generated scenarios: **347 → 348**
- Complete content gates: **10/11**

Remaining gated set:
- BSC49 — **17 unresolved**

## QA
- Main suite: **149/149 PASS**
- Effect Engine: **326/326 PASS**
- Batch 30 dedicated: **6/6 PASS**
- Full regression: **525/525 PASS**
- Phase 25: **PASS**
- Phase 26: **PASS**
- Phase 27: blocked only by BSC49 Phase 23 set gate.

## Next batch
**Batch 31 — BSC49 Wave 16** should continue Triangle Trap LT / Lunatic Seal LT where full semantics can be introduced safely, then move into the final CP/Contract/GranWalker/XV block.
