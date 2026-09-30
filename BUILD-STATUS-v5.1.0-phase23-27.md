# Build Status — v5.1.0 Phase 23–27 Release Candidate

## Result

Technical QA: **PASS**  
Content release gate: **BLOCKED**  
v5.1.0 final promotion: **NO**

## Phase 23 — Set-by-Set Automation

A conservative migration pass was added:

- display effects can be linked to an existing structured ability only when the mapping is unambiguous;
- a safe text-pattern converter handles a small set of fully recognized recurring operations;
- unknown/compound effects remain visible as unresolved instead of being falsely labeled automated.

Current set gate: **1/11 PASS**. SD19 is the only set at or above the 95% target.

## Phase 24 — Card Effect Regression Suite

- Generated scenarios: **78**
- Generated regression tests: **3/3 PASS**
- Every card currently classified as `AUTOMATED` or `NO_EFFECT` is represented.

## Phase 25 — Manual Resolution Reduction Audit

- Phase 22 baseline: **80.00%** card-level fallback
- Current: **78.63%** (287/365)
- Reduction: **1.37 percentage points**
- Target: **<10%**
- Gate: **BLOCKED**

## Phase 26 — Final Mechanics QA

- `npm test`: **149/149 PASS**
- Effect Engine: **52/52 PASS**
- Full regression: **251/251 PASS**
- `npm run verify`: **PASS**
- UI audit: **PASS**
- Release audit: **PASS**
- Security audit: **PASS**

## Phase 27 — Release QA

7/9 release gates pass. The two failures are deliberate content gates:

- Phase 23 set automation target
- Phase 25 Manual Resolution target

The candidate is safe to test but must not be labeled v5.1.0 final yet.

## Build note

The source ZIP deliberately excludes `node_modules`. A clean dependency install could not complete inside the isolated execution environment, so `vite build` was not used as evidence for this RC. Existing structural, gameplay, online, UI, release and security checks all pass.
