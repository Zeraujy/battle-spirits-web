# Content Migration Batch 12 — BS13 Wave 4

Internal version: **5.0.3**  
Target release: **v5.1.0**

## Scope

Batch 12 continues BS13 from the Batch 11 baseline. This wave focuses on reusable semantics for post-Magic resolution observers, automatic step ending, exhausted blocking windows, Core-removal protection, conditional cost/reduction modifiers, source-bound forced levels and event relays.

## BS13 progress

- Runtime cards: **90**
- No-effect cards: **6**
- Automated after Batch 12: **54**
- Automated/no-effect resolved: **60/90**
- Remaining unresolved: **30**
- Gate coverage: **66.7%**
- Set gate: **BLOCKED** until >=95%

Batch 12 migrates 10 additional BS13 cards: BS13-004, BS13-029, BS13-032, BS13-042, BS13-046, BS13-065, BS13-069, BS13-071, BS13-072 and BS13-084.

## Generic engine work

- canonical `magicResolved` event emitted after Magic resolution is fully finalized
- per-player resolved-Magic count for current turn
- reusable `endCurrentStep` action for effect-driven Main/Attack Step ending
- `handSizeCompare` and `eventMagicResolvedCount` conditions
- exhausted-block permissions based on opposing BP and Braved state
- `maximumBlockerBP` battle restriction
- source-bound forced-level cleanup when the source leaves the field
- Core-removal protection against effects controlled by another player
- modifier targeting for Braved cards
- selected-target event relay support for effects that re-fire another card's canonical event

## Global coverage

- Batch 11 manual fallback: **42.74% — 156/365**
- Batch 12 manual fallback: **40.00% — 146/365**
- Improvement: **10 cards removed from manual fallback**
- Phase 24 generated card scenarios: **209 → 219**
- Core Action Library: **71 → 72 action types**
- Complete content gates remain **9/11**

Remaining gated sets:
- BS13 — **30 unresolved**
- BSC49 — **116 unresolved**

## QA

- Main suite: **149/149 PASS**
- Effect Engine: **166/166 PASS**
- Batch 12 dedicated: **10/10 PASS**
- Full regression: **362/362 PASS**
- Phase 26 Mechanics QA: **PASS**
- `npm run verify`: **PASS**
- UI audit: **PASS**
- Release audit: **PASS**
- Security audit: **PASS**
- Phase 27: blocked only by the BS13/BSC49 set gate and `<10%` manual fallback gate

`npm run build` was attempted, but this source-only package does not contain `node_modules`; `vite` is unavailable. No dependencies were injected into the package.

## Next batch

**Batch 13 — BS13 Wave 5** should continue directly from the 30 unresolved BS13 cards.
