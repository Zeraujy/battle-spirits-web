# Content Migration Batch 31 — BSC49 Wave 16

## Scope
Close Triangle Trap LT and introduce reusable Heavy Exhaust semantics.

## Result
- BSC49: **101/117 resolved**, **16 pending**.
- Manual fallback: **4.38% (16/365)**.
- Phase 24: **349 generated scenarios**.
- Core Action Library: **86 action types**.

## Migrated
- `BSC49-091 — Triangle Trap LT`

## Reusable engine work
- New generic `heavyExhaust` Core Action.
- Heavy Exhaust persists through exactly the next Refresh Step, then clears.
- Structured cardMoved observer for recovery after a Green-only effect discards the card from Hand.

## QA
- Main suite: 149/149 PASS.
- Effect Engine: 330/330 PASS.
- Batch 31 dedicated: 4/4 PASS.
- Phase 25: PASS — 4.38%.
- Phase 26: PASS.
- verify/UI/release/security/web-only: PASS.
- Phase 27: blocked only by BSC49 set gate.
