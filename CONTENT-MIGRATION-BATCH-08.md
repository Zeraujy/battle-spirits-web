# v5.1.0 Content Migration — Batch 08

Base: **Content Migration Batch 07**  
Internal application version: **5.0.3**

## Target

Batch 08 completes **SD15 — Attribute Eye-Opening Deck: Topaz** without relying on Manual Resolution.

## Set gate

**SD15: 19/18 — READY_NO_MANUAL**

The global set gate advances from **8/11** to **9/11** complete sets:

- SD10 — READY_NO_MANUAL
- SD11 — READY_NO_MANUAL
- SD13 — READY_NO_MANUAL
- SD15 — READY_NO_MANUAL
- SD17 — READY_NO_MANUAL
- SD19 — READY_NO_MANUAL
- SD20 — READY_NO_MANUAL
- SD23 — READY_NO_MANUAL
- SD28 — READY_NO_MANUAL

Remaining content blocks: **BS13 and BSC49**.

## Reusable engine additions

Batch 08 adds reusable mechanics rather than card-specific shortcuts:

- canonical `cardRefreshed` runtime event and aliases for Life-decrease/refreshed observations;
- reusable **Strengthening** BP-reduction bonus aggregation;
- `moveCoreToLife` for effect-driven Core → Life movement;
- `specialSummonFromTrash` for effect-driven Trash summons;
- `revealTopAndSummonOrHand` and richer reveal routing/selectors;
- multi-target modifier application through selected-target sets;
- BP setters by absolute value and printed Level;
- configurable 0-BP exhaustion follow-up;
- continuous Life protection based on attacking Spirit BP;
- contextual conditions for source symbols, refresh source type, battle keywords and blocker BP;
- battle restriction support for effects that treat a battle as unblocked.

The Core Action Library advances from **66 → 69 action types**.

## Coverage

Manual fallback:

- Batch 07: **59.45% — 217/365**
- Batch 08: **54.79% — 200/365**

Since Phase 22:

- **80.00% → 54.79%**

Generated per-card regression scenarios:

- Batch 07: **148**
- Batch 08: **165**

## QA

- Main suite: **149/149**
- Effect Engine: **123/123**
- Batch 08 dedicated: **10/10**
- Full regression: **322/322**
- Phase 26 Mechanics QA: **PASS**
- `npm run verify`: **PASS**
- UI audit: **PASS**
- Release audit: **PASS**
- Security audit: **PASS**
- SD15 gate: **READY_NO_MANUAL**

Phase 27 was executed and remains blocked only by the global content gates: **BS13/BSC49 set coverage** and the global Manual Resolution target. All technical QA portions of Phase 27 pass.

`npm run build` was attempted, but this source-only package does not bundle `node_modules`; `vite` is therefore unavailable in this package environment. No dependency was added solely to make the package build locally.

## Release gate

Phase 27 remains blocked by the global content gates:

- Set gate: **9/11**
- Manual fallback: **54.79%**
- Final target: **< 10% manual fallback**

The internal application version remains **5.0.3**.
