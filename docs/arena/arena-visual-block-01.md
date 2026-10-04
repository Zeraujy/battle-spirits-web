# Arena Visual — Block 01 Structure

## Scope

Block 01 implements the visual-first foundation requested for the Photoshop-inspired Arena direction.

### Phase 01 — Visual Foundation Setup

- Added a fully isolated `src/features/arena-visual/` branch.
- Added dedicated visual tokens, playmat resolution and a presentation-only layout model.
- No Rules Engine, Online authority or production Arena module is imported by the new visual root.

### Phase 02 — Global Layout Matching the Mockup

- Added the macro two-player composition with opponent at the top and player at the bottom.
- Added centered Hand regions, open Battlefield space and a full-height right Utility Panel.
- Added a subtle center divider instead of heavy containers over the playmat.

### Phase 03 — Zone Positioning Pass

- Added mirrored left/right side rails for Life, Burst, Reserve, Deck, Trash and Core Trash.
- Zone frames use translucent surfaces and restrained borders so the playmat remains visually dominant.
- Opponent zone labels are mirrored to match the tabletop orientation of the reference mockup.

## Reserved resource artwork

The user-provided Core and Soul Core artwork is copied to:

- `public/assets/arena/resources/core.png`
- `public/assets/arena/resources/soul-core.png`

These assets are intentionally not wired into gameplay presentation until Phase 04.

## Preview

The isolated preview can be opened with:

`?mode=arena-visual-preview`

This preview uses presentation-only fixture data and does not replace the production Arena route.
