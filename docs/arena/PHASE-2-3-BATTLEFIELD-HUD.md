# Arena UX/UI Overhaul — Phase 2 + Phase 3

## Scope

This block introduces presentation-only spatial containers and compact HUDs.
No gameplay rule, reducer, online protocol, action payload, selector, or persistence
contract is changed.

## Phase 2 components

- `Battlefield`
- `OpponentField`
- `CenterField`
- `PlayerField`

`Battlefield` preserves the legacy `table-area` class and the current table drop
attributes. Existing `renderHand`, `renderField`, `battleCenter`, drag/drop and combat
content remain owned by `Simulator.jsx` during this migration step.

## Phase 3 components

- `PlayerHUD`
- `OpponentHUD`
- internal presentation primitive: `ArenaHUD`

The HUDs consume the existing player object without writing to it. Counters shown:

- Life
- Deck
- Reserve
- Core Trash
- secondary Hand / Burst status

The existing `data-life-target` contract is preserved so direct-attack targeting
continues to use the same gameplay path.

## State boundaries preserved

- Local / AI actions continue through `applyGameAction`.
- Online / Ranked actions continue through `onlineClient.action`.
- Existing `renderField` and `renderHand` interaction callbacks are unchanged.
- No new game legality logic exists in the new Arena components.

## Deferred intentionally

- Hand redesign (`HandArea`) remains Phase 5.
- `ArenaViewModel` migration remains incremental; current state is passed directly
  to presentation wrappers in this block to minimize regression risk.
- Context actions, targeting redesign and motion layers remain later phases.
