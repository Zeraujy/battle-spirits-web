# Content Migration Batch 19 — BSC49 Wave 4

Internal version: **5.0.3**  
Target release: **v5.1.0**

## Scope

Batch 19 continues BSC49 — Dream Booster: Stars Around from the Batch 18 baseline and introduces the reusable **Accel / Open Area foundation**. The match state now owns a first-class Open Area zone, targeting can inspect it, Accel costs can be paid independently from printed summon cost, and Accel sources can be routed from hand into Open Area after resolution.

## BSC49 progress

- Runtime cards: **117**
- Resolved before Batch 19: **31/117**
- Newly automated in Batch 19: **10**
- Resolved after Batch 19: **41/117**
- Remaining unresolved: **76**
- Set gate coverage: **35.0%**
- Set gate: **IN_PROGRESS**

Cards migrated: `BSC49-001`, `BSC49-002`, `BSC49-009`, `BSC49-015`, `BSC49-026`, `BSC49-028`, `BSC49-032`, `BSC49-034`, `BSC49-044`, `BSC49-070`.

## Generic engine work

- added first-class `openArea` to player state and physical-card lookup
- added Open Area targeting support
- added reusable `payAccelCost` Core Action with independent Accel cost/reductions
- added reusable `moveSourceToOpenArea` Core Action
- added highest/lowest-cost selector filtering for future reusable effects
- added generic `eventInvolvesControllerSpirit` battle condition
- Core Action Library: **78 → 80 action types**

## Global coverage

- Batch 18 manual fallback: **23.56% — 86/365**
- Batch 19 manual fallback: **20.82% — 76/365**
- Improvement: **10 cards removed from manual fallback**
- Phase 24 generated card scenarios: **279 → 289**
- Complete content gates: **10/11**

Remaining gated set:
- BSC49 — **76 unresolved**

## QA

- Main suite: **149/149 PASS**
- Effect Engine: **235/235 PASS**
- Batch 19 dedicated: **12/12 PASS**
- Full regression: **434/434 PASS**
- Phase 26 Mechanics QA: **PASS**
- `npm run verify`: **PASS**
- UI audit: **PASS**
- Release audit: **PASS**
- Security audit: **PASS**
- Web-only audit: **PASS**
- Phase 27: blocked only by the BSC49 set gate and `<10%` manual fallback gate

`npm run build` remains source-package dependent on local `node_modules`; no dependencies are injected into migration packages.

## Next batch

**Batch 20 — BSC49 Wave 5** should continue from **76 unresolved cards**. With the reusable Accel/Open Area foundation established, the next structural priority is **Advent** and Advent-source state/timing semantics, while also consuming remaining Accel/Open Area interactions that can reuse Batch 19 primitives.
