# v5.1.0 Content Migration — Batch 03

## Goal
Close the remaining SD17 automation gaps without card-id hacks in the reducer.

## SD17 result
- 18/18 runtime cards are `AUTOMATED` or `NO_EFFECT`.
- Status: `READY_NO_MANUAL`.
- SD17 joins SD19 and SD20 as fully automated Starter Deck sets.

## Migrated cards
- `SD17-008` Monoforcesaurus — Rush: Green refresh on that Spirit's first attack of the turn.
- `SD17-012` Primeval Forest — BP-comparison draw observer and Lv2 Terra Dragon recovery after destruction by an opposing Spirit.
- `SD17-X01` DarkDragon Dark-Tyrannosaura — source-relative BP destruction, Rush life movement, and Terra Dragon Attack Step aura.
- `SD17-X02` DarknessDemonSword Dark-Blade — structured specified attack while combined.

## Reusable engine work
- Added per-instance attack counters (`sourceAttackNumber`).
- Added battle outcome context describing cards destroyed by BP comparison.
- Added generic destruction-source card-type matching.
- Added `performSpecifiedAttack`, which establishes the selected opposing Spirit/Ultimate as blocker and advances directly to the post-block Flash Timing.

## Coverage movement
- Set gate: 2/11 -> 3/11 sets at >=95%.
- Manual fallback: 75.89% (277/365) -> 74.79% (273/365).
- Generated Phase 24 regression scenarios: 88 -> 92.
