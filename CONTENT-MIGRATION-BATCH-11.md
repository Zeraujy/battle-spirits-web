# Content Migration Batch 11 — BS13 Wave 3

Internal version: **5.0.3**  
Target release: **v5.1.0**

## Scope

Batch 11 continues BS13 from the Batch 10 baseline. This wave focuses on reusable runtime semantics for exhaustion observation, attack declaration costs, effect-driven Trash deployment, special-summon provenance, temporary forced levels, BP-comparison suppression and replacement/core movement behavior.

## BS13 progress

- Runtime cards: **90**
- No-effect cards: **6**
- Automated after Batch 11: **44**
- Automated/no-effect resolved: **50/90**
- Remaining unresolved: **40**
- Gate coverage: **55.6%**
- Set gate: **BLOCKED** until >=95%

Batch 11 migrates 10 additional BS13 cards: BS13-014, BS13-016, BS13-034, BS13-043, BS13-050, BS13-059, BS13-082, BS13-083, BS13-X02 and BS13-X04.

## Generic engine work

- canonical `cardExhausted` event for attacks, blocks and effect-driven exhaustion
- attack declaration Core tax via `attackReserveTrashCost`
- `deployFromTrash` for free effect-driven Nexus deployment
- `forceLevel` for temporary highest/explicit printed LV treatment
- Special Summon provenance (`specialSummonCause`) and optional suppression of When Summoned follow-ups
- `removeCore` can route regular Cores to the Void
- reusable battle-attacker Cost/combined-host conditions
- `skipBPComparison` battle restriction support
- self-move event condition for reactions to cards moving from Deck to Trash

## Global coverage

- Batch 10 manual fallback: **45.48% — 166/365**
- Batch 11 manual fallback: **42.74% — 156/365**
- Improvement: **10 cards removed from manual fallback**
- Phase 24 generated card scenarios: **199 → 209**
- Core Action Library: **69 → 71 action types**
- Complete content gates remain **9/11**

Remaining gated sets:
- BS13 — **40 unresolved**
- BSC49 — **116 unresolved**

## QA

- Main suite: **149/149 PASS**
- Effect Engine: **153/153 PASS**
- Batch 11 dedicated: **10/10 PASS**
- Full regression: **352/352 PASS**
- Phase 26 Mechanics QA: **PASS**
- `npm run verify`: **PASS**
- UI audit: **PASS**
- Release audit: **PASS**
- Security audit: **PASS**
- Phase 27: blocked only by the BS13/BSC49 set gate and `<10%` manual fallback gate

`npm run build` was attempted, but this source-only package does not contain `node_modules`; `vite` is unavailable. No dependencies were injected into the package.

## Next batch

**Batch 12 — BS13 Wave 4** should continue directly from the 40 unresolved BS13 cards.
