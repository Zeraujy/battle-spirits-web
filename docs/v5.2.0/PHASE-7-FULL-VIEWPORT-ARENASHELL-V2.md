# v5.2.0 — Phase 7: Full-Viewport ArenaShell v2

## Goal

Turn the Phase 6 spatial prototype into a true full-viewport Arena shell without changing Battle Spirits rules, online authority, persistence or content.

Phase 6 proved the region layout. Phase 7 removes page-level chrome cost so the battlefield receives the entire viewport budget.

## Delivered

### Full dynamic viewport

`ArenaShell` now marks the Phase 7 full-viewport mode and owns `100dvh` with a `100vh` fallback. The old dedicated header row is removed from the layout budget.

### Floating command strip

The existing top controls remain functional but now render as a compact floating command strip over the Arena. It keeps:

- current turn context;
- phase tracker;
- inspector toggle;
- control rail toggle;
- chat/log access;
- exit action;
- online turn clock / CPU indicator when applicable.

The strip is presentation-only. It does not derive or authorize gameplay actions.

### Battlefield-first geometry

The `sim-layout` now occupies the complete shell rectangle. The battlefield remains the primary surface and the utility rail consumes only its explicit right-side width.

Panel gaps, borders and radii were reduced to prevent the Arena from reading as a page made of nested cards.

### Overlay behavior

Notices and the selected-card inspector are bounded to the viewport and no longer create layout rows or permanent width loss.

## Responsive structure

- 1366-class desktop: smaller command strip and phase tracker scale.
- 1080p / ultrawide: the Phase 6 field allocation remains, now with additional vertical battlefield space.
- below the Phase 6 narrow breakpoint: the utility rail is removed and the command strip spans the usable width.

Final tablet/mobile transformation remains owned by Phase 15 and Phase 23.

## Guardrails

Phase 7 changes presentation only. It does not modify:

- `src/game/`;
- authoritative server behavior;
- Effect Engine semantics;
- Supabase schema/workflows;
- card/content data;
- public assets.

## Result

The Arena no longer spends a permanent horizontal row on page chrome. The shell now behaves like a game surface first, preparing Phase 8 for compact symmetric HUDs.

**Phase 7 status: PASS.**
