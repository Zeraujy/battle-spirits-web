# v5.2.0 — Phase 5: Architecture Foundation QA

## Goal

Prove that the architectural work from Phases 0–4 did not change Battle Spirits gameplay semantics, online authority, Supabase schema/workflows or the canonical public content/assets before the Arena visual redesign begins.

## v5.1.0 semantic baseline lock

Phase 5 introduces `architecture/v5.2.0/v5.1.0-semantic-baseline.json`, generated from the official `battle-spirits-web-v5.1.0-FINAL` package. The lock covers:

- all `src/game/` engine files;
- all `src/online/` protocol/domain files;
- all `server/` files except `server/index.mjs`;
- all `supabase/` files;
- all `public/` assets/content.

`server/index.mjs` is compared after normalizing the expected v5.2.0 version-only health metadata and the Phase 0 boundary marker comment. Any other server entrypoint delta fails the audit.

## Regression discovery

The complete regression runner discovers every `*.test.js` beneath both `src/` and `server/`, rather than relying only on the shorter `npm test` suite. This caught one stale Phase 1 contract expectation: the contract had gained presentation metadata (`name`, `image`, `colors`, `symbols`, `cost`, `reduction`) while its exact-object assertion had not been updated. The test was corrected to match the established Phase 3 contract; no runtime behavior changed.

## Automated guard

New commands:

```bash
npm run architecture:v520:phase5:audit
npm run architecture:v520:phase5:regression
npm run architecture:v520:phase5:qa
```

The semantic parity audit is also part of `npm run verify`.

## Exit criteria

- [x] v5.1.0 Game Engine semantic tree unchanged.
- [x] v5.1.0 Online domain semantic tree unchanged.
- [x] authoritative Server implementation unchanged except version metadata/comment.
- [x] Supabase schema/scripts unchanged.
- [x] canonical `public/` assets unchanged.
- [x] complete discovered regression suite passes.
- [x] UI audit passes.
- [x] release audit passes.
- [x] security audit passes.
- [x] Phases 1–4 architecture audits remain active.

**Phase 5 status: PASS.**

With Block A proven stable, Phase 6 may begin the low-polish spatial prototype without mixing unresolved architecture migration risk into the visual redesign.
