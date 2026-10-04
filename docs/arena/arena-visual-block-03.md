# Arena Visual — Block 03 Primary Polish

## Scope

Block 03 implements Phase 07 and Phase 08 of the Photoshop-inspired visual roadmap. This pass prioritizes structural fidelity to the supplied mockup, especially the side-zone proportions requested after Block 02 validation.

### Photoshop reference metrics

The supplied mockup is treated as the desktop visual reference at 1650 × 928. Its major proportions are encoded in `arenaVisualMockupMetrics.js` instead of being left as unrelated ad-hoc CSS values.

- Utility column: approximately 23.3% of viewport width.
- Player left rail / opponent right rail: approximately 9.1% of viewport width.
- Player right rail / opponent left rail: approximately 6.1% of viewport width.
- Life: approximately 11.7% of viewport height.
- Burst: approximately 14.9% of viewport height and intentionally narrower inside the wide rail.
- Reserve: approximately 11.6% of viewport height.
- Deck: approximately 15.1% of viewport height.
- Trash: approximately 14.9% of viewport height.
- Core Trash: approximately 9.8% of viewport height.

These values use responsive clamps so the layout remains usable away from the reference resolution while preserving the same visual hierarchy.

## Phase 07 — Right Utility Panel Redesign

- Split the right panel into `UtilityTopActions`, `UtilityMainPanel` and `UtilityBottomActions`.
- Matched the mockup composition with four pale rounded slots above and below a large empty framed utility surface.
- Removed the previous visible `Utility Panel` placeholder copy so the panel reads like the Photoshop reference rather than a developer mockup.
- Kept this block presentation-only; no Rules Engine action was added to the visual branch.

## Phase 08 — Labeling, Typography and Visual Cleanup

- Rebalanced player/opponent side rails asymmetrically to mirror the Photoshop layout.
- Added zone-specific heights for Life, Burst, Reserve, Deck, Trash and Core Trash.
- Made Burst intentionally narrower than Life/Reserve in the wide rail, matching the supplied drawing.
- Reduced zone surface opacity so the playmat remains visually dominant.
- Reworked labels into compact high-contrast captions sitting on the zone edge, closer to the reference composition.
- Reduced Battlefield caption prominence and kept card artwork as the primary visual focus.

## Preview

Open the isolated visual branch with:

`?mode=arena-visual-preview`

The production Arena remains unchanged.
