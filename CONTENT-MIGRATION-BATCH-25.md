# Content Migration Batch 25 — BSC49 Wave 10

Internal version: **5.0.3**  
Target release: **v5.1.0**

## Scope
Batch 25 begins the advanced Magic/CP structural phase while intentionally leaving Contract/GranWalker and XV for isolated follow-up batches.

## BSC49 progress
- Runtime cards: **117**
- Resolved before Batch 25: **91/117**
- Newly automated in Batch 25: **3**
- Resolved after Batch 25: **94/117**
- Remaining unresolved: **23**
- Set gate: **IN_PROGRESS**

Cards migrated: `BSC49-092`, `BSC49-097`, `BSC49-098`.

## Reusable engine work
- `addCoreToTrashFromVoid`: generic Void -> Core Trash Core movement.
- `zoneCount`: generic structured condition for counting cards in arbitrary zones/selectors.
- `eventMovedByColor`: generic card-move observer condition derived from the effect source's card colors.
- Reused canonical `setBattleRestriction({ skipBPComparison: true })` from the original Pegasus Flap automation.
- Reused generic hand/trash observers, multi-target selection, removed-from-game routing, draw/discard and BP modifiers.

Core Action Library: **84** action types.

## Global coverage
- Batch 24 manual fallback: **7.12% — 26/365**
- Batch 25 manual fallback: **6.30% — 23/365**
- Phase 25 `<10%` gate: **PASS**
- Phase 24 generated scenarios: **339 → 342**
- Complete content gates: **10/11**

Remaining gated set:
- BSC49 — **23 unresolved**

## QA
- Main suite: **149/149 PASS**
- Effect Engine: **301/301 PASS**
- Batch 25 dedicated: **7/7 PASS**
- Full regression: **500/500 PASS**
- Phase 25: **PASS**
- Phase 26: **PASS**
- Phase 27: blocked only by BSC49 Phase 23 set gate.

## Next batch
**Batch 26 — BSC49 Wave 11** should continue the remaining advanced Magic foundation (`091`, `093–096`, `099`, `100`, `102`) where exact reusable semantics can be established before CP/Contract/GranWalker and XV.
