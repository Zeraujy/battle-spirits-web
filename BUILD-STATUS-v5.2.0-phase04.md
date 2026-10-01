# Build Status — v5.2.0 Phase 4

Status: **PASS — Internal Repository Shape**

## Delivered

- Added machine-readable ownership map at `architecture/v5.2.0/internal-domains.json` for future Web, Server, Content and Shared extraction.
- Added stable public facades:
  - `src/arena/index.js`
  - `src/shared/index.js`
  - `src/content/index.js`
- `Simulator.jsx` now consumes Arena controller/ViewModel through the Arena public facade.
- ArenaViewModel now consumes contracts through the Shared public facade.
- Shop catalog, saga metadata and prebuilt deck recipe consumers now use the Content facade instead of direct `src/data` paths.
- Server-used pure online protocol/domain primitives are explicitly classified as Shared ownership while their paths remain stable.
- Added Phase 4 dependency audit and focused content-boundary tests.
- Updated the Phase 2 audit to recognize the new Arena public facade without weakening the original Game Engine boundary checks.
- Updated v5.2.0 Patch Notes and roadmap.

## QA

- Phase 4 focused tests: **2/2 PASS**.
- Main suite: **149/149 PASS**.
- `npm run verify`: **PASS**.
- UI audit: **PASS**.
- Release audit: **PASS**.
- Security audit: **PASS**.
- Phase 1 Shared Contract audit: **PASS**.
- Phase 2 Arena Controller audit: **PASS**.
- Phase 3 ArenaViewModel audit: **PASS**.
- Phase 4 Internal Repository Shape audit: **PASS**.
- Existing v4.9/v5.0 Arena and Online audits: **PASS**.

## Baseline integrity

Compared with Phase 3:

- `public/`: **UNCHANGED**
- `src/game/`: **UNCHANGED**
- `server/`: **UNCHANGED**
- `supabase/`: **UNCHANGED**

## Build note

This source package intentionally does not contain `node_modules`. The production Vite bundle is therefore left to the normal GERENCIAR_KAIHOU_WEB v1.6 dependency/build flow after update application.

## Gameplay / infrastructure impact

- Battle Spirits rules changed: **NO**
- Effect Engine changed: **NO**
- Online protocol behavior changed: **NO**
- Supabase schema/workflow changed: **NO**
- Cloudflare deployment model changed: **NO**
- Tailscale Funnel / Node hosting changed: **NO**
- Public/card assets changed: **NO**
- Physical Git repository split performed: **NO**

Phase 4 completes the internal domain shape required before the Architecture Foundation QA in Phase 5.
