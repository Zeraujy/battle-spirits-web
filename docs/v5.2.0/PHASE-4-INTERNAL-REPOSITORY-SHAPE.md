# v5.2.0 — Phase 4: Internal Repository Shape

## Goal

Make the monorepo behave like four explicit internal ownership domains — **web**, **server**, **content** and **shared** — before deciding whether a physical Git split is worthwhile.

Phase 4 deliberately avoids moving the whole project into new folders. Large physical moves would add path/deploy risk without improving the Arena. Instead, this phase introduces stable public facades, an ownership manifest and automated dependency rules. These are the same boundaries a future extraction would use.

## Internal ownership map

```text
battle-spirits-kaihou/
├── Web domain        → future kaihou-web
│   ├── src/pages
│   ├── src/components
│   ├── src/styles
│   ├── src/arena
│   ├── src/services
│   └── src/online
│
├── Server domain     → future kaihou-server
│   ├── server
│   └── src/game       (kept in-process for Local/CPU during v5.2.0)
│
├── Content domain    → future kaihou-content
│   ├── src/data
│   ├── public/cards-database
│   └── public/assets/shop-items
│
└── Shared domain     → future shared contract artifact/package
    └── src/shared
```

The machine-readable source of this ownership is:

`architecture/v5.2.0/internal-domains.json`

## Stable public facades

### Arena / Web

`src/arena/index.js` is now the public Arena application boundary. `Simulator.jsx` no longer imports controller and ViewModel internal paths separately.

### Shared

`src/shared/index.js` is the implementation-neutral shared contract entry point. ArenaViewModel uses this entry point instead of reaching into the internal contract folder hierarchy.

### Content

`src/content/index.js` is the first content-domain facade. Shop catalog, saga metadata and prebuilt deck recipes are consumed through this boundary rather than by direct web imports from `src/data`.

This is intentionally an adapter first. The canonical data files remain where they are in Phase 4, so Cloudflare/public asset behavior is unchanged.

## Dependency rules

The Phase 4 audit enforces:

- Shared cannot import React/Web, server, Game Engine or content implementations.
- Content cannot depend on Web or server implementation.
- Server-owned code cannot depend on Web.
- Web cannot import the authoritative `server/` implementation.
- Migrated structured shop/deck content must be consumed through `src/content/index.js`.
- `Simulator.jsx` must use `src/arena/index.js`.
- ArenaViewModel must use `src/shared/index.js`.

The existing Phase 0–3 audits remain active as additional guards.

## Why `src/game` is not physically moved yet

The Game Engine currently powers Local and Eternal CPU modes in-process while the Online server also reuses selected engine modules. Moving it into `server/` now would create a large mechanical diff and could force browser/server duplication before Phase 5 regression QA.

For repository ownership it is now classified as **server-owned engine code**, while its current path stays stable until a later extraction decision.

## Infrastructure impact

- Cloudflare deployment changed: **NO**
- Tailscale Funnel / Node server changed: **NO**
- Supabase changed: **NO**
- Public asset locations changed: **NO**
- Git repositories physically split: **NO**
- Battle Spirits gameplay semantics changed: **NO**

## Validation

```bash
npm run architecture:v520:phase4:audit
npm run architecture:v520:phase4:test
```

The Phase 4 audit is part of `npm run verify`.

## Exit criteria

- [x] Web/server/content/shared ownership is machine-readable.
- [x] Arena has a stable public entry point.
- [x] Shared contracts have a stable public entry point.
- [x] Structured shop/deck content has a stable public entry point.
- [x] Migrated consumers no longer import those content implementations directly.
- [x] Forbidden dependency directions are audited automatically.
- [x] No physical repository split or infrastructure migration was required.

**Phase 4 status: PASS.**
