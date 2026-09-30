# Content Migration Batch 14 — BS13 Wave 6

Internal version: **5.0.3**  
Target release: **v5.1.0**

## Scope

Batch 14 continues BS13 from the Batch 13 baseline. This wave focuses on reusable Brave/Combine rules, post-battle reactions, return-to-hand replacement semantics, dynamic destruction budgets and continuous player/card restrictions.

## BS13 progress

- Runtime cards: **90**
- No-effect cards: **6**
- Automated after Batch 14: **74**
- Automated/no-effect resolved: **80/90**
- Remaining unresolved: **10**
- Gate coverage: **88.9%**
- Set gate: **BLOCKED** until >=95%

Batch 14 migrates 10 additional BS13 cards: BS13-007, BS13-008, BS13-053, BS13-057, BS13-060, BS13-064, BS13-078, BS13-079, BS13-X03 and BS13-X05.

## Generic engine work

- reusable `combineBraveFromField` action, including attack redispatch after an effect-driven Combine
- reusable `returnEventSourceToHand` action for event-source recovery
- dynamic multi-target BP budgets derived from selectors
- selector support for cards sharing a Family with the source
- source/combined-host battle context and Brave-attachment conditions
- Brave survival after host destruction with refreshed Spirit-form continuation
- top-deck mill follow-ups conditioned on Families found among moved cards
- own-effect return-to-hand replacement with top-deck placement
- Main Step summon-exhaustion rules driven by continuous player modifiers
- Core-removal locks with explicit Transmigration bypass
- Brave Combine-condition bypass through continuous modifiers
- continuous player battle rules for Dark Snake Life handling and per-symbol hand discard
- refresh-after-BP-destruction battle modifiers
- event-source physical-state preservation for level-dependent destruction triggers

## Global coverage

- Batch 13 manual fallback: **37.26% — 136/365**
- Batch 14 manual fallback: **34.52% — 126/365**
- Improvement: **10 cards removed from manual fallback**
- Phase 24 generated card scenarios: **229 → 239**
- Core Action Library: **75 → 77 action types**
- Complete content gates remain **9/11**

Remaining gated sets:
- BS13 — **10 unresolved**
- BSC49 — **116 unresolved**

## QA

- Main suite: **149/149 PASS**
- Effect Engine: **184/184 PASS**
- Batch 14 dedicated: **11/11 PASS**
- Full regression: **383/383 PASS**
- Phase 26 Mechanics QA: **PASS**
- `npm run verify`: **PASS**
- UI audit: **PASS**
- Release audit: **PASS**
- Security audit: **PASS**
- Web-only audit: **PASS**
- Phase 27: blocked only by the BS13/BSC49 set gate and `<10%` manual fallback gate

`npm run build` was attempted, but this source-only package does not contain `node_modules`; `vite` is unavailable. No dependencies were injected into the package.

## Next batch

**Batch 15 — BS13 Wave 7** should finish the 10 remaining BS13 cards and target the BS13 `READY_NO_MANUAL` gate.
