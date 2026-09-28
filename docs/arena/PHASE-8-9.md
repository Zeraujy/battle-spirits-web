# Arena UX/UI Overhaul — Phase 8 + Phase 9

## Scope

This block implements presentation-only foundations for contextual actions and turn progression.

### Phase 8 — ActionBar

New component:

- `ActionBar`

Responsibilities:

- render only actions already produced by the existing Arena action resolver;
- stay hidden when no contextual action exists;
- group primary/secondary contextual actions without introducing new gameplay rules;
- remain presentation-only.

The existing `actionButtons()` logic in `Simulator.jsx` is still the source of truth for which actions are available. The new component does not import rules, reducers, online clients, or services.

### Phase 9 — PhaseTracker

New component:

- `PhaseTracker`

Responsibilities:

- render the seven turn phases from the existing `match.phase` value;
- show the current phase and completed phases;
- expose the existing `ADVANCE_PHASE` intent through an `onAdvance` callback;
- display turn/player context without owning turn state.

The tracker has no direct access to `match`, reducers, online state, or gameplay modules.

## Gameplay boundary

No gameplay rule, reducer, online protocol, server path, battle resolver, cost resolver, or Core rule was changed in this phase.

`Simulator.jsx` still owns the existing dispatch boundary and only passes derived presentation props/callbacks into the new components.
