# Content Migration Batch 27 — BSC49 Wave 12

Internal version: **5.0.3**  
Target release: **v5.1.0**

## Scope
Batch 27 continues the advanced Magic cleanup before Contract/GranWalker/XV. The wave closes Reboot Code LT without adding a card-specific Core Action.

## BSC49 progress
- Runtime cards: **117**
- Resolved before Batch 27: **96/117**
- Newly automated in Batch 27: **1**
- Resolved after Batch 27: **97/117**
- Remaining unresolved: **20**
- Set gate: **IN_PROGRESS**

Card migrated: `BSC49-094`.

## Reusable engine work
- Extended generic targeting with `unaffectedByOpponentEffects` protection for non-Field zones while the modifier is active.
- Reused `printedCostOverride` for Reboot Code LT's opponent Attack Step cost 2 rule.
- Reused multi-target selection, Refresh and `cannotAttack` modifiers so only non-Braved Spirits actually refreshed by the Flash lose attack permission for the turn.

Core Action Library: **85** action types.

## Global coverage
- Batch 26 manual fallback: **5.75% — 21/365**
- Batch 27 manual fallback: **5.48% — 20/365**
- Phase 25 `<10%` gate: **PASS**
- Phase 24 generated scenarios: **344 → 345**
- Complete content gates: **10/11**

Remaining gated set:
- BSC49 — **20 unresolved**

## QA
- Main suite: **149/149 PASS**
- Effect Engine: **310/310 PASS**
- Batch 27 dedicated: **4/4 PASS**
- Full regression: **509/509 PASS**
- Phase 25: **PASS**
- Phase 26: **PASS**
- Phase 27: blocked only by BSC49 Phase 23 set gate.

## Next batch
**Batch 28 — BSC49 Wave 13** should continue `091`, `095`, `096`, `099` and `100`, then move into CP/Contract/GranWalker and XV.
