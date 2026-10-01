# v5.2.0 — Phase 3: ArenaViewModel v2

## Goal

Introduce one explicit presentation-state builder between authoritative/local match state and the React Arena. The Arena can now consume normalized players, zones, timing, priority, cards and available actions without duplicating gameplay legality rules inside presentation components.

## New layer

`src/arena/viewModel/arenaViewModel.js` builds the Phase 1 presentation contract from current match state.

The data flow is now:

```text
Game / Server authoritative state
            ↓
      Arena Controller
            ↓
      ArenaViewModel v2
            ↓
         React Arena
```

## Presentation state

The ViewModel produces:

- viewer and opponent identity/status;
- Life, Reserve, Core Trash, Soul Core and zone counts;
- Battle Spirits zones for both players;
- normalized visible card metadata;
- current turn, phase, battle stage and priority holder;
- authoritative/local legal actions exposed as UI action descriptors;
- central visual states such as playable, attackable, blockable and targetable;
- winner state.

Opponent hidden hand identities are never copied into the presentation model; only the count is exposed. Opponent Burst is marked hidden.

## Rule ownership

The ViewModel is allowed to query rule/selectors and legal actions. It does not implement replacement rules, costs, timings or card legality independently.

React presentation remains responsible only for displaying state and dispatching action descriptors.

## Integration

`Simulator.jsx` now memoizes one `arenaViewModel` for the current bottom/top perspective and passes it to `ArenaShell`. The existing v4.9/v5.0 visual tree remains intact in Phase 3, so this is an architectural integration with zero intended layout change.

## QA

Phase 3 adds:

- `src/arena/viewModel/arenaViewModel.test.js`
- `scripts/audit-arena-viewmodel-v520-phase3.mjs`
- `npm run architecture:v520:phase3:test`
- `npm run architecture:v520:phase3:audit`

Phase 4 may now organize internal web/server/content/shared domains around this stable presentation boundary.
