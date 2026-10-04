# Arena Visual — Block 02 Identity

## Scope

Block 02 continues the Photoshop-inspired visual branch without moving gameplay authority into the presentation layer.

### Phase 04 — Core and Soul Core Integration

- Wired the user-provided `core.png` and `soul-core.png` artwork into dedicated presentation components.
- Life, Reserve and Core Trash can now render compact resource pools directly from presentation data.
- Battlefield cards can display their attached Cores in a compact strip outside the card artwork.
- Core remains blue and Soul Core remains red; no recoloring or generated replacement artwork is used.

### Phase 05 — Hand System Visual Alignment

- Replaced the placeholder Hand display with a reusable card-fan presentation.
- Local Hand cards can render official artwork supplied by the prepared Arena view model.
- Opponent Hand always renders the standard card back, preserving hidden information.
- Fan spacing and rotation adapt to the number of visible cards while keeping the composition centered.

### Phase 06 — Battlefield Presentation Pass

- Replaced the Battlefield count placeholder with actual presentation cards when card data is available.
- Battlefield cards use clean artwork-first rendering with Level/BP and Core information outside the artwork.
- Player and opponent fields remain mirrored while the center area stays open and visually light.
- No gameplay mutation, action validation, targeting logic or Rules Engine dependency was added.

## Preview

Open the isolated preview with:

`?mode=arena-visual-preview`

The preview now includes official local card artwork, the supplied Core/Soul Core assets, mirrored Battlefield cards and card-fan Hands.
