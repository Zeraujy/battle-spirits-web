# Arena Visual Block 04 — Phase 09 + Phase 10

## Scope

Block 04 completes the Photoshop-inspired visual roadmap with responsive adaptation and final fidelity validation. It also includes the requested correction that makes opponent mirroring strictly vertical.

## Vertical-only mirror correction

The Arena no longer swaps left and right zone rails for the opponent. Both sides now use the same horizontal structure:

- Left rail: Life, Burst, Reserve
- Right rail: Deck, Trash, Core Trash

The opponent remains visually inverted on the Y axis where appropriate, but horizontal zone placement is preserved exactly as in the supplied mockup.

## Phase 09 — Responsive Adaptation

The desktop Photoshop composition remains the master reference while the same structure adapts through explicit profiles:

- `desktop-wide`
- `desktop`
- `laptop`
- `tablet-landscape`
- `compact-landscape`

Secondary zones remain visible in every supported profile. The Utility Panel, side rails, Hands and Battlefield compress without changing the left/right structural identity.

## Phase 10 — Visual QA and Mockup Fidelity Review

Final automated checks enforce:

- strictly vertical opponent mirroring;
- matching player/opponent left rail widths;
- matching player/opponent right rail widths;
- Photoshop-derived zone proportions;
- visible secondary zones at every responsive profile;
- preserved isolated Arena Visual boundary;
- English-only new component, variable and file naming.

## Protected architecture

This visual pass does not move game authority into the presentation layer. `src/game`, `src/online`, `server`, `supabase`, `data`, and the production `src/features/arena/Simulator.jsx` remain protected.
