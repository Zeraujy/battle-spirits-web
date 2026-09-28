# Arena UX/UI Overhaul — Phase 6 / Phase 7

## Scope

This block introduces a single reusable `CardPreview` presentation system and the new `ContextPanel` container.

## CardPreview

`CardPreview` supports two presentation modes:

- `selected`: selected-card presentation inside the Arena side context.
- `hover`: floating card preview used by existing hover behavior.

The component receives already-derived card information and does not query game state, dispatch actions, or import gameplay rules.

## ContextPanel

`ContextPanel` replaces the selected-card dock's structural markup while preserving the legacy CSS hooks required by the current Arena layout.

Current mode:

- `card`

Future modes can include `combat`, `effect`, `zone`, and `log` without changing gameplay state ownership.

## Safety boundary

Phase 6/7 does not modify:

- reducer logic
- legal action rules
- multiplayer protocol
- card selection behavior
- drag/drop behavior
- combat resolution
- effect resolution

The existing `actionButtons()` output is passed into the presentation layer unchanged.

## Deferred visual issue

The Life HUD layout-shift issue remains intentionally deferred to the final Visual cleanup pass. It is not part of Phase 6/7.
