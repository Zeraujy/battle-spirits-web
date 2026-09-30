# Content Migration Batch 13 — BS13 Wave 5

Internal version: **5.0.3**  
Target release: **v5.1.0**

## Scope

Batch 13 continues BS13 from the Batch 12 baseline. This wave focuses on reusable semantics for dynamic reduction, attack/Life protection, destruction-event recovery, Brave direct-combine summons, block costs and limited-use-per-turn effects.

## BS13 progress

- Runtime cards: **90**
- No-effect cards: **6**
- Automated after Batch 13: **64**
- Automated/no-effect resolved: **70/90**
- Remaining unresolved: **20**
- Gate coverage: **77.8%**
- Set gate: **BLOCKED** until >=95%

Batch 13 migrates 10 additional BS13 cards: BS13-003, BS13-027, BS13-036, BS13-039, BS13-040, BS13-047, BS13-052, BS13-068, BS13-073 and BS13-X06.

## Generic engine work

- reusable `upToNTimesPerTurn` action for mechanics such as Assault N
- `specialSummonBraveCombinedFromHand` for free Brave summons that enter already combined
- `specialSummonEventSourceFromTrash` for destruction/recovery observers
- dynamic extra reduction symbols based on field-family counts
- Trash symbols as a reusable reduction pool when a card explicitly allows it
- source-symbol-driven Life gain
- source Special Summon can return exhausted and suppress When Summoned
- turn protection against attacks from specifically selected Spirit instances
- player-level protection against opposing Spirit-effect Life loss
- per-symbol-count attack caps used by two-symbol attack restrictions
- blocker Magic-discard costs enforced by blocker legality and declaration
- card-id-aware continuous card modifier selection

## Global coverage

- Batch 12 manual fallback: **40.00% — 146/365**
- Batch 13 manual fallback: **37.26% — 136/365**
- Improvement: **10 cards removed from manual fallback**
- Phase 24 generated card scenarios: **219 → 229**
- Core Action Library: **72 → 75 action types**
- Complete content gates remain **9/11**

Remaining gated sets:
- BS13 — **20 unresolved**
- BSC49 — **116 unresolved**

## QA

- Main suite: **149/149 PASS**
- Effect Engine: **173/173 PASS**
- Batch 13 dedicated: **10/10 PASS**
- Full regression: **372/372 PASS**
- Phase 26 Mechanics QA: **PASS**
- `npm run verify`: **PASS**
- UI audit: **PASS**
- Release audit: **PASS**
- Security audit: **PASS**
- Phase 27: blocked only by the BS13/BSC49 set gate and `<10%` manual fallback gate

`npm run build` was attempted, but this source-only package does not contain `node_modules`; `vite` is unavailable. No dependencies were injected into the package.

## Next batch

**Batch 14 — BS13 Wave 6** should continue directly from the 20 unresolved BS13 cards.
