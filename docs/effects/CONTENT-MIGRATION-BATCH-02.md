# v5.1.0 Content Migration — Batch 02

## Scope

This batch continues the Phase 21/22 content migration campaign without promoting the application to v5.1.0 final. The internal application version remains **5.0.3**.

## SD20 — Ultimate Deck: Silver Zero

SD20 now passes the Starter Deck no-manual gate with **17/17 unique recipe cards** classified as `AUTOMATED` or `NO_EFFECT`.

New structured coverage includes:

- `SD20-004 Shield Mobile` — exhausted blocking and Heavy Armor: Red.
- `SD20-011 Rowgard North Command` — White Spirit/Ultimate BP bonus and per-turn Ultimate effect Life-loss cap while the condition is active.
- `SD20-012 The Falling World` — opponent-destruction observers returning opposing Nexus/Spirit cards.

## Reusable engine additions

- Exhausted blockers can be admitted by a continuous `allowExhaustedBlock` modifier.
- `effectImmunityColors` protects legal targets and continuous modifier application from opposing effects of matching colors.
- Structured Ultimate-effect Life damage respects a server-authoritative per-turn cap.
- Structured destruction can enqueue deferred canonical `whenDestroyed` events after the current effect item resolves.
- Target selectors can use `maximumBPFromSource` / `minimumBPFromSource`.
- Target selectors can filter by normalized card keywords such as Rush.
- New condition `eventDestroyedByOpponent` allows controller-field observers to distinguish opponent-caused destruction.

## SD17 progress

- `SD17-009 PiercingDragon Styragorn` now destroys only opposing Spirits whose effective BP does not exceed the source Spirit.
- `SD17-011 ArmedMachineDragon Silveed` now retrieves a Rush Spirit from Trash and has a structured Terra Dragon Combine condition.
- `SD17-X02 DarknessDemonSword Dark-Blade` now has its Cost 5+ Combine condition structured; its specified-attack text remains pending.

SD17 improves to **14/18 cards (77.8%)** on the current coverage gate.

## Coverage movement

- SD20: **82.4% → 100%**
- SD17: **66.7% → 77.8%**
- Sets meeting ≥95% gate: **1/11 → 2/11**
- Manual fallback: **77.26% (282/365) → 75.89% (277/365)**
- Generated Phase 24 scenarios: **83 → 88**

## QA

- Main test suite: **149/149**
- Effect Engine suite: **62/62**
- Batch 02 dedicated tests: **6/6**
- Complete regression: **261/261**
- `npm run verify`: **PASS**
- UI audit: **PASS**
- Release audit: **PASS**
- Security audit: **PASS**

The v5.1.0 final release gates remain intentionally blocked by the remaining catalog-wide content migration target.
