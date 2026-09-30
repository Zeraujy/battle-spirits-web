# Content Migration Batch 09 — BS13 Wave 1

Internal version: **5.0.3**  
Target release: **v5.1.0**

## Scope

Batch 09 starts the large-set migration with **BS13 — Hoshizora no Ouja / King of the Starry Sky**. Unlike the Starter Deck batches, BS13 contains 90 runtime cards and entered this wave with 84 unresolved effect cards, so this batch intentionally ships as **Wave 1** rather than marking the set complete prematurely.

## BS13 progress

- Runtime cards: **90**
- No-effect cards: **6**
- Automated in Batch 09: **24**
- Remaining unresolved: **60**
- Automation gate coverage: **33.3%**
- Set gate: **BLOCKED** until >=95%

Batch 09 therefore moves BS13 from **6/90 resolved** to **30/90 resolved/no-effect**.

## Generic engine work

This batch expands reusable rule semantics instead of adding per-card execution branches:

- `controllerTrash` observer scope for effects that remain active while a card is in Trash
- dynamic event-source Core-count and level conditions
- dynamic event-source keyword conditions
- dynamic modifier targeting from event context
- dynamic Reserve gain from source level or selector count
- BP scaling from source Core count and selected target BP
- BP scaling from the opposing battler's symbol count
- continuous alternate-name support through the `names` modifier
- expanded generic keyword discovery and selector family matching

These primitives are used for mechanics such as **Immortality**, Trash recovery, Heavy Armor, Brave battle riders, Core-scaled BP, low-Core attack destruction, and Nexus battle restrictions.

## Global coverage

- Batch 08 manual fallback: **54.79% — 200/365**
- Batch 09 manual fallback: **48.22% — 176/365**
- Improvement: **24 cards removed from manual fallback**
- Phase 24 generated card scenarios: **165 → 189**
- Complete content gates remain **9/11**

Remaining gated sets:

- BS13 — **60 unresolved**
- BSC49 — **116 unresolved**

## QA

- Main suite: **149/149 PASS**
- Effect Engine: **133/133 PASS**
- Batch 09 dedicated: **10/10 PASS**
- Full regression: **332/332 PASS**
- Phase 26 Mechanics QA: **PASS**
- `npm run verify`: **PASS**
- UI audit: **PASS**
- Release audit: **PASS**
- Security audit: **PASS**
- Phase 27: correctly blocked only by the set gate and `<10%` manual fallback gate

`npm run build` was attempted, but this source-only package intentionally does not contain `node_modules`; `vite` is therefore unavailable in the packaging environment. No dependencies were injected into the source package.

## Next batch

**Batch 10 — BS13 Wave 2** should continue directly from the 60 unresolved BS13 cards before moving to BSC49.
