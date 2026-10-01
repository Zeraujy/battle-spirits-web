# v5.2.0 — Phase 0: Architecture & Repository Boundary Audit

## Baseline

The audit starts from the official **Battle Spirits: KAIHOU! Simulator v5.1.0 FINAL** build after completion of the Content Migration cycle.

Release baseline inherited from v5.1.0:

- 11/11 audited sets pass the automation gate.
- BSC49 is 117/117 resolved by the automation gate.
- 365 generated card regression scenarios.
- 0/365 Manual Resolution fallback.
- 95 reusable Core Action Library action types.
- Main suite: 149/149 PASS.
- Effect Engine: 346/346 PASS.
- Full regression: 545/545 PASS.

Phase 0 is intentionally architecture-only. It does **not** change Battle Spirits rules, card behavior, online protocol, matchmaking, Supabase schema, or the current Arena layout.

## Why this phase exists

The v5.2.0 target is a new Arena presentation inspired by the spatial efficiency of modern browser TCG simulators, especially Talishar, while preserving KAIHOU's own Battle Spirits identity and rules.

Before rebuilding the Arena, the project needs boundaries strong enough that the presentation can evolve without pulling rule implementation into React components.

The long-term architecture under evaluation is:

```text
kaihou-web
    ↕ shared protocol / schemas
kaihou-server
    ↕ content contract
kaihou-content
```

This phase does **not** split the Git repositories yet. It measures whether the current codebase is ready for that split.

## Current project layers

### Web / presentation

Primary locations:

- `src/pages/`
- `src/components/`
- `src/styles/`

The current Arena is already componentized around:

- `ArenaShell`
- `Battlefield`
- `PlayerHUD` / `OpponentHUD`
- `HandArea`
- `CardPreview`
- `ContextPanel`
- `ActionBar`
- `PhaseTracker`
- `TargetingUX`
- `CardMotionLayer`
- `ArenaOverlayLayer`
- `GameLogDrawer`

This is a strong base for the visual overhaul.

### Rules / game engine

Primary location:

- `src/game/`
- `src/game/effectEngine/`

This layer contains the reducer, legal actions, battle flow, costs, cores, zones, Burst, Brave, AI semantics and the structured Effect Engine.

### Online client

Primary location:

- `src/online/`

This layer contains online domain types, sync, connection state, public profile helpers and the Socket.IO client.

### Authoritative server

Primary location:

- `server/`

This layer contains MatchSession, matchmaking, reconnect, competitive policies, deck lock, security guards and result authority.

### Content

Content currently exists in multiple places:

- `public/cards-database/` — runtime card/catalog assets.
- `src/data/` — application-side set/product/recipe metadata.
- `public/assets/` and `public/images/` — static presentation assets.
- generated coverage/regression data in root/data locations.

This is the least isolated of the three future repository domains and should be normalized before any physical repository split.

## Dependency findings

The new audit command is:

```bash
npm run architecture:v520:boundaries
```

Phase 0 establishes two hard rules immediately:

1. `src/game` must never import presentation code from `src/components`, `src/pages` or `src/styles`.
2. `server` must never import presentation code.

The v5.1.0 FINAL baseline passes both rules.

The audit also records migration debt instead of pretending the project is already repository-ready:

- direct Web UI → Game Engine imports still exist;
- Server → Game Engine imports still exist;
- Web UI → Services coupling is significant;
- `Simulator.jsx` is still a large integration/controller surface and directly imports rule helpers.

These are expected findings and are the main targets of the next architecture phases.

## Most important coupling discovered

`src/pages/Simulator.jsx` currently participates in too many responsibilities at once. It imports presentation components and also directly imports pieces of the game engine such as the reducer, AI, selectors, adapters, battle helpers and Burst rules.

That is acceptable for the stable v5.1.0 architecture, but it is not the boundary we want for a Talishar-level presentation rewrite.

The new target is:

```text
Authoritative/local Game State
          ↓
Arena Controller / Adapter
          ↓
ArenaViewModel v2
          ↓
Presentational Arena components
```

React battlefield components should consume prepared presentation state and send intents. They should not decide Battle Spirits legality.

## Repository split readiness

### `kaihou-web`

**Readiness: MEDIUM-HIGH**

Reasons:

- Arena is already highly componentized.
- Vite/React deployment is naturally compatible with Cloudflare.
- Online client already has its own domain/sync modules.

Blockers:

- `Simulator.jsx` still reaches directly into the rule engine.
- services mix browser persistence, Supabase-facing logic and domain concerns.

### `kaihou-server`

**Readiness: HIGH with shared-engine extraction required**

Reasons:

- `server/` already exists as a coherent authoritative runtime.
- Match/session/matchmaking/security/results have clear module boundaries.

Blocker:

- the server imports selected modules directly from `src/game` and `src/online`.

This means a physical split today would either duplicate those modules or require a shared package. The correct next step is to define a shared domain/engine contract before moving repositories.

### `kaihou-content`

**Readiness: MEDIUM**

Reasons:

- card database has an obvious static content boundary.
- recipes, shop metadata and translations are suitable for independent content versioning.

Blockers:

- content is distributed across `public/`, `src/data/`, generated audit files and code-side assumptions.
- the web build currently expects many assets to exist directly under `public/`.

The content repository should therefore be the **last** physical split, after a content manifest/loader contract exists.

## Infrastructure mapping

The planned separation remains compatible with the current infrastructure:

```text
kaihou-web
  → Cloudflare (Vite build / static frontend / optional Workers)

kaihou-server
  → Node.js authoritative runtime
  → exposed during current development/testing through Tailscale Funnel

Supabase
  → Auth
  → profiles/social data
  → collection/decks/economy/persistence where applicable

kaihou-content
  → source-controlled catalog
  → initially synchronized into the web build
  → later eligible for CDN/R2-style publishing
```

No Cloudflare, Supabase or Tailscale migration is required for Phase 0.

## Decision

**Do not split into three Git repositories yet.**

First create clean internal boundaries and prove them with tests/audits. Physical repositories are a deployment decision; dependency boundaries are the architectural decision.

## Phase 0 exit criteria

- [x] v5.1.0 FINAL established as the immutable functional baseline.
- [x] current web/server/game/content areas mapped.
- [x] hard forbidden dependency directions defined.
- [x] automated repository-boundary audit added.
- [x] current repository split blockers documented.
- [x] Talishar-style Arena work explicitly prevented from changing gameplay during the architecture foundation.
- [x] next phases defined.

**Phase 0 status: PASS.**
