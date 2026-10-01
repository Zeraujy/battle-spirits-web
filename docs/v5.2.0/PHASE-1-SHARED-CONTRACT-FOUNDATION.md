# v5.2.0 — Phase 1: Shared Contract Foundation

## Goal

Create the first explicit, UI-safe boundary between the Battle Spirits runtime and the future Arena presentation layer without changing gameplay behavior.

Phase 1 does **not** move reducer logic, rewrite `Simulator.jsx`, change online messages, alter Supabase, or change the Arena layout. It defines the vocabulary that Phase 2 and Phase 3 will consume.

## New shared contract namespace

```text
src/shared/contracts/
└── arena/
    ├── constants.js
    ├── contracts.js
    ├── validation.js
    └── index.js
```

The namespace deliberately has no dependency on:

- `src/game/`
- React components/pages/styles
- application services
- `server/`
- the Socket.IO client implementation

That makes it eligible to become a future shared package if the physical repository split is approved after Phase 5.

## Contracts introduced

### Card presentation

`createArenaCardContract()` exposes stable presentation facts such as:

- instance/card id
- card type and zone
- controller/owner
- exhausted state
- Level / BP
- Core count / Soul Core presence
- Brave combination references
- visual interaction state

It intentionally does not expose reducer functions or rule helpers.

### Player presentation

`createArenaPlayerContract()` defines identity and compact HUD/resource facts:

- id/name/username/avatar/player color
- Life / Reserve / Core Trash
- Soul Core location
- Deck/Hand/Trash/Removed counts
- active-player and priority flags
- connection state

### Zone presentation

`createArenaZoneContract()` normalizes Battle Spirits Arena zones, including Hand, Deck, Trash, Life, Reserve, Core Trash, Void, Spirits, Nexuses, Burst and related auxiliary zones.

### Timing presentation

`createArenaTimingContract()` defines:

- turn number
- active player
- normal Battle Spirits phase
- battle sub-stage
- priority player
- consecutive passes
- battle-active state

### Available actions

`createArenaAvailableActionContract()` wraps a legal action produced by the authoritative/local rules layer.

The important rule is:

> The Arena may render and dispatch an available action, but it must not infer whether that action is legal.

This preserves the existing project principle: **The client requests. The server decides.** Local mode follows the same presentation boundary even though its authority is in-process.

## Validation

Added:

```bash
npm run architecture:v520:phase1:audit
npm run architecture:v520:phase1:test
```

The Phase 1 audit is also appended to `npm run verify`.

## Runtime impact

- Battle Spirits rules changed: **NO**
- Effect Engine changed: **NO**
- Online protocol changed: **NO**
- Supabase schema changed: **NO**
- Current Arena layout changed: **NO**
- Public/card assets changed: **NO**

## Exit criteria

- [x] Shared presentation contract namespace exists.
- [x] Player/card/zone/timing/action shapes are explicit.
- [x] Shared layer has no direct dependency on rule/UI/server implementation details.
- [x] Contract validation exists.
- [x] Focused Node tests exist.
- [x] Contract audit is part of project verification.

**Phase 1 status: PASS.**
