# Build Status — v5.1.0 Final

Status: **RELEASE QA PASS**

- Application version: 5.1.0
- Effects audit: PASS
- Phase 23 set gate: PASS — 11/11 sets
- BSC49: PASS — 117/117 resolved by automation gate
- Phase 24 generated regressions: PASS — 365 scenarios
- Phase 25 manual fallback: PASS — 0% (0/365)
- Phase 26 mechanics QA: PASS
- Phase 27 release QA: PASS
- Main suite: 149/149 PASS
- Effect Engine suite: 346/346 PASS
- Full regression: 545/545 PASS
- Core Action Library: 95 action types
- UI audit: PASS
- Release audit: PASS
- Security audit: PASS
- Web-only audit: PASS
- `public/`: 1410/1410 files identical to Batch 34
- Source-only build probe: expected `vite: not found` because `node_modules` is not distributed

`npm run build` requires local dependencies (`node_modules`); source-only distribution intentionally does not bundle them.
