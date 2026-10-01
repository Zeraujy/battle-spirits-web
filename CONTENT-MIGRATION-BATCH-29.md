# Content Migration Batch 29 — BSC49 Wave 14

Internal version: **5.0.3**  
Target release: **v5.1.0**

## Scope
Batch 29 continues the final advanced-Magic cleanup before CP/Contract/GranWalker/XV. This wave closes Wig Bind LT and adds reusable targeting and hand-use restriction semantics without adding a new Core Action.

## BSC49 progress
- Runtime cards: **117**
- Resolved before Batch 29: **98/117**
- Newly automated in Batch 29: **1**
- Resolved after Batch 29: **99/117**
- Remaining unresolved: **18**
- Set gate: **IN_PROGRESS**

Card migrated: `BSC49-099`.

## Reusable engine work
- Added `hasEffectText` selector support for generic targeting and continuous modifiers.
- Added `familiesAny` alongside existing `familiesAll` so selectors can express rules such as Devotee AND (Astral Soul OR Galaxian).
- Added generic `handUseColorsOnly` turn protection enforcement at the reducer entry point for cards used from Hand/Hand Area.
- Reused generic multi-target decisions and `moveCard` with destination `removed` for the five-card Trash removal cost.
- Wig Bind LT now locks attack/block for opposing Spirits with effect text, and its optional additional cost restricts the opponent to Yellow-only hand use for the turn.

Core Action Library: **85** action types.

## Global coverage
- Batch 28 manual fallback: **5.21% — 19/365**
- Batch 29 manual fallback: **4.93% — 18/365**
- Phase 25 `<10%` gate: **PASS**
- Phase 24 generated scenarios: **346 → 347**
- Complete content gates: **10/11**

Remaining gated set:
- BSC49 — **18 unresolved**

## QA
- Main suite: **149/149 PASS**
- Effect Engine: **320/320 PASS**
- Batch 29 dedicated: **5/5 PASS**
- Full regression: **519/519 PASS**
- Phase 25: **PASS**
- Phase 26: **PASS**
- Phase 27: blocked only by BSC49 Phase 23 set gate.

## Next batch
**Batch 30 — BSC49 Wave 15** should continue BSC49-091, 095 and 096, then enter the remaining CP/Contract/GranWalker/XV block.
