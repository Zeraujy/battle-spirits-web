# Arena UX/UI Overhaul — Phase 16/17/18

## Scope

This block implements presentation-only floating layers:

- `BurstPresentation`
- `GameLogDrawer`
- `GameEventToast`
- shared `ArenaOverlayLayer`

No rules, reducer behavior, online protocol, action legality, or server behavior is changed.

## ArenaOverlayLayer contract

`ArenaOverlayLayer` is the common stacking context for Arena presentation overlays.

The root uses `pointer-events: none` so cards, targeting, pointer drag, Core interaction, and battlefield clicks remain available underneath it.

Only explicit interactive surfaces may opt back into input using:

```text
arena-overlay-interactive
```

At this phase the main interactive overlay is `GameLogDrawer`.

## BurstPresentation

Burst presentation reads canonical post-action state only.

It observes `actionLog` for an existing `ACTIVATE_BURST` action and keeps only a previous visual snapshot of each set Burst so the activation animation can render after the real Game State has already moved the card to Trash.

It never dispatches `ACTIVATE_BURST`, never decides whether activation is legal, and never delays the state transition.

The open Burst timing window is also represented by a lightweight non-interactive cue derived from `burstOpportunity`.

## GameLogDrawer

The legacy modal game log is replaced by a side drawer inside the overlay layer.

It:

- reuses `match.log`;
- reuses the existing log classifier;
- is closed by default;
- is the only large overlay surface that captures pointer input;
- disables pointer input completely while closed;
- keeps the battlefield visible behind it.

## GameEventToast

`GameEventToast` derives lightweight notifications from newly appended entries in `match.log`.

Only high-signal categories are surfaced:

- battle
- timing
- life
- removal
- play

System noise and routine Core movement are intentionally suppressed.

The queue is visual only and cannot affect Game State.

## Motion and accessibility

Burst and toast animations honor `prefers-reduced-motion`.

All presentation layers are independent from reducer timing. Game State always updates first.
