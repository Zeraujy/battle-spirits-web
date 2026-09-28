# v5.1.0 Content Migration — Batch 01

Base: **v5.1.0 RC Phase 23–27**  
Internal application version: **5.0.3**

## Applied migrations

- `SD20-007` White Jet Dragoon — Life <= 3 BP modifier and set-Burst discard.
- `SD20-X01` Ultimate-Odin — When Summoned return-to-hand effect.
- `SD17-005` FeatherDragon Pedpenner — Terra Dragon Attack Step +2000 BP aura.
- `SD17-013` Dark Galaxy of Dusk — Terra Dragon Attack Step +2000 BP aura and End Step refresh.
- `SD13-007` Shadow-Maiden — audit now recognizes its already structured `braveCondition`; no gameplay rule was fabricated.

## Coverage movement

| Set | Before | After | Remaining unresolved |
|---|---:|---:|---:|
| SD20 | 70.6% | 76.5% | 3 |
| SD17 | 55.6% | 61.1% | 6 |
| SD13 | 50.0% | 38.9% | 8 |

Manual Resolution fallback: **78.63% -> 77.26%** (282/365 cards).

Phase 24 generated regression scenarios: **83**.

## Conservative gate

This batch does **not** mark SD20, SD17 or SD13 complete. Heavy Armor, opponent-caused destruction observers, Rush/Confront-related interactions and other unresolved mechanics remain visible in the audit until they have executable structured rules.
