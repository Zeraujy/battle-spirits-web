# Content Migration Batch 28 — BSC49 Wave 13

Internal version: **5.0.3**  
Target release: **v5.1.0**

## Scope
Batch 28 continues the final advanced-Magic cleanup before CP/Contract/GranWalker/XV. The wave closes Orion Power LT and introduces a reusable attack-Life deck-discard hook without adding a card-specific Core Action.

## BSC49 progress
- Runtime cards: **117**
- Resolved before Batch 28: **97/117**
- Newly automated in Batch 28: **1**
- Resolved after Batch 28: **98/117**
- Remaining unresolved: **19**
- Set gate: **IN_PROGRESS**

Card migrated: `BSC49-100`.

## Reusable engine work
- Added generic `opponentDeckDiscardOnLifeDamage` modifier handling in battle resolution.
- The modifier is attached to matching attackers through normal selector semantics, so families/colors/card types can be reused by future cards.
- Deck discard respects the existing `maxDeckDiscardPerTurn` cap.
- Reused controller-Trash `cardMoved`, `eventMovedByColor`, `dispatchSourceEvent`, `oncePerTurn`, and standard BP-modification semantics for Orion Power LT.

Core Action Library: **85** action types.

## Global coverage
- Batch 27 manual fallback: **5.48% — 20/365**
- Batch 28 manual fallback: **5.21% — 19/365**
- Phase 25 `<10%` gate: **PASS**
- Phase 24 generated scenarios: **345 → 346**
- Complete content gates: **10/11**

Remaining gated set:
- BSC49 — **19 unresolved**

## QA
- Main suite: **149/149 PASS**
- Effect Engine: **315/315 PASS**
- Batch 28 dedicated: **5/5 PASS**
- Full regression: **514/514 PASS**
- Phase 25: **PASS**
- Phase 26: **PASS**
- Phase 27: blocked only by BSC49 Phase 23 set gate.

## Next batch
**Batch 29 — BSC49 Wave 14** should continue BSC49-091, 095, 096 and 099, then move into CP/Contract/GranWalker and XV.
