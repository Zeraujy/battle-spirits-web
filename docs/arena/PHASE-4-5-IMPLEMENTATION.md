# Arena UX/UI Overhaul — Phase 4 + Phase 5

## Scope

This block is presentation-only. No gameplay rules, reducer behavior, online protocol, card legality, core payment rules, draw rules, or match persistence were changed.

## Phase 4 — Core System Presentation

Added:
- `CoreSystemDisplay`
- `ReserveCoreDisplay`
- `CoreTrashDisplay`
- `SoulCoreDisplay`
- `VoidCoreDisplay`
- `CoreStack` presentation boundary

The existing `CoreArea` remains the interaction engine for drag/drop and click behavior. The new components only wrap and present the same state and callbacks.

## Phase 5 — HandArea

Added:
- `HandArea`
- `HandFan` presentation boundary

The existing hand mapping, `CardTile`, pointer drag system, selection logic and card usability checks remain inside `Simulator.jsx`. `HandArea` only provides a stable visual boundary and smoother fan/hover behavior.

## Life layout-shift fix

The compact Life counter now has fixed geometry and layout containment. The previous resource pulse inherited a scale transform from an older Arena stylesheet; the Life counter now uses a brightness-only pulse so losing Life cannot temporarily resize or visually displace the HUD container.

## Safety boundaries

Unchanged:
- `applyGameAction`
- `onlineClient.action`
- reducer/rules modules
- core movement callbacks
- draw logic
- pointer drag payloads
- `data-card-drop-*` contracts
- `data-life-target`
