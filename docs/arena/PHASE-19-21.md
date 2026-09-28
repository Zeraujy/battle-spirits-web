# Arena UX/UI Overhaul — Phase 19 / 20 / 21

## Phase 19 — Responsive Arena

- `ArenaShell` now owns a presentation-only `data-arena-layout-mode` value: `wide`, `standard`, or `compact`.
- `useArenaLayout` uses `ResizeObserver` and writes the mode directly to the Arena root DOM node.
- Resizing therefore does not introduce React state into the gameplay tree.
- Compact mode collapses side docks and reduces expensive visual effects while keeping the battlefield central.

## Phase 20 — Performance pass

- `CardMotionLayer` DOM measurements are now gated by a stable `instanceId@zoneKey` signature. Life/Core/phase updates no longer trigger a full card-position measurement pass.
- `PhaseTracker` and `GameLogDrawer` use memoization for presentation-only work.
- Heavy Arena surfaces use CSS containment to reduce layout/paint propagation.
- Compact mode disables non-essential blur/shadow work.

## Phase 21 — Visual cleanup

- Life backlog bug received a full isolation fix: the new Life component no longer carries any legacy `life-core-display`, `life-core`, or `life-drop-target` classes.
- The Life outer box has fixed geometry and `contain: strict`; Life changes only toggle opacity on ten permanent internal slots.
- Direct-attack focus selectors now target `.arena-hud-life` explicitly.
- Battlefield/HUD/context borders and compact layout spacing were normalized.

## Safety contract

No gameplay rule, reducer, online protocol, server behavior, cost logic, battle resolution, or card legality rule is changed by these phases.
