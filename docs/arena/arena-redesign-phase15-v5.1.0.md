# Arena Redesign Phase 15 — Release QA

Base: `battle-spirits-web-v5.1.0-arena-redesign-phase14.zip`

## Scope

Phase 15 closes the original 15-phase Arena redesign roadmap with permanent release-quality audits. It does not move the parallel Arena onto the production route and does not change Rules Engine authority.

## Permanent Arena QA

The release gate now includes dedicated audits for layout, zones, card visibility, Core presentation, interactions, Playmats, responsive behavior and the aggregate Arena release gate. The aggregate gate also reruns every completed Arena redesign audit from the foundation through Phase 14.

## Regression invariants

The final gate protects the following presentation invariants:

- Battlefield card artwork remains visible after entry, targeting, attack and Brave presentation.
- UI layers do not perform gameplay authority actions.
- Opponent hidden information remains protected by the Arena View Model.
- Core and Soul Core presentation stays separate from Rules Engine movement/cost authority.
- Secondary zones compact at smaller viewports instead of being removed.
- Default Playmat fallback remains available.
- Touch and pointer input use controller-owned intent bridges.

## Production boundary

The redesign remains under `src/features/arena-redesign/`. `src/features/arena/Simulator.jsx` remains the production Arena and is not replaced by Phase 15.
