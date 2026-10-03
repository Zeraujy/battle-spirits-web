# v4.9.0 Arena UX/UI Overhaul — Phase 0 Baseline Audit

Status: **Completed for Phase 0 / Phase 1 validation**

This document records the current Arena integration boundaries before the visual migration begins. It is intentionally descriptive: Phase 0 does not move gameplay logic.

## 1. Current Arena entry point

- Page: `src/features/arena/Simulator.jsx`
- Stable presentation root before Phase 1: `<main className="simulator-page">`
- Phase 1 replacement root: `src/components/game/arena/ArenaShell.jsx`
- Compatibility rule: `ArenaShell` preserves the `simulator-page` class so existing Arena CSS and DOM queries keep working unchanged.

## 2. Gameplay state ownership

`Simulator.jsx` currently owns the active `match` snapshot and presentation/interaction state around it.

### Gameplay-facing state

- `match`
- `roomState`
- `rankedResult`
- `matchEndedAt`
- `rematchPending`

### Presentation / interaction state

- `selectedId`
- `error`
- `notice`
- `aiDebugOpen`
- `aiDebugDecision`
- `showLog`
- `showChat`
- `chatText`
- `previewCard`
- `previewAnchor`
- `showInspectorDock`
- `showControlDock`
- `trashHover`
- `cardDrag`
- `pendingPlayAnchor`
- `effectDecisionSelection`
- `braveSeparationDialog`
- `turnClockNow`
- `postMatchActionNotice`

No state listed above is moved into `ArenaShell` in Phase 1.

## 3. Action routing boundary

The current `dispatch(action, asPlayerId)` function is the critical gameplay boundary.

### Local / AI

`dispatch` -> `applyGameAction(match, action, asPlayerId, cardIndex)` -> `setMatch(result.match)`

### Online / Ranked

`dispatch` -> `onlineClient.action({ action }, callback)` -> authoritative `room:state` event -> `setMatch(state.match)`

**Phase 1 rule:** `ArenaShell` must never import, wrap, replace, intercept, debounce, transform, or call `dispatch`, `applyGameAction`, `onlineClient`, reducers, selectors, or services.

## 4. Actor / player orientation mapping

Current derived identity/orientation values that must remain owned by `Simulator.jsx` during Phase 1:

- `actorId`
- `canControlActor`
- `bottomId`
- `topId`
- `bottom`
- `top`
- `online`
- `aiMode`
- `aiPlayerId`
- `humanPlayerId`

The shell does not decide player orientation.

## 5. Current gameplay render boundaries

The current Arena is still composed inside `Simulator.jsx` through these major render functions/sections:

- `renderHand(playerId)`
- `renderField(playerId)`
- `battleCenter()`
- `actionButtons()`
- `renderEffectDecisionOverlay()`
- `renderBraveSeparationOverlay()`
- `renderUltimateTriggerOverlay()`
- `PlayerHud`
- `PhaseBar`
- `BattleExperienceLayer`
- `BattleLinkOverlay`
- `CoreArea`
- `PaymentStatus`

These remain unchanged in Phase 1. Later phases will migrate presentation responsibilities incrementally.

## 6. Core interaction paths protected by the baseline

The following interaction paths were identified and must not change during Phase 1:

- Card selection and preview
- Pointer card drag
- Hand -> table play flow
- Core drag / drop
- Smart Core click movement
- Manual Core payment
- Summon / deploy confirmation
- Phase advancement
- Attack declaration
- Block declaration
- Flash priority flow
- Burst activation opportunity
- Brave combination / separation
- Ultimate Trigger resolution
- Manual resolution tools
- Effect decision queue
- AI decision dispatch
- Online room state synchronization
- Online chat / rematch events
- Match history recording

## 7. Protected gameplay modules

Phase 0 / Phase 1 must not modify gameplay behavior in:

- `src/game/**`
- `src/online/**`
- `src/services/**` gameplay/network services
- `server/**`

No such files are intentionally changed by Phase 1.

## 8. DOM / CSS compatibility risks

The existing Arena CSS heavily scopes rules through `.simulator-page`. Removing or renaming that class would create broad regressions.

Phase 1 therefore keeps:

```text
simulator-page
```

and adds:

```text
arena-shell
```

The shell adds layout isolation only. It does not change the current `sim-layout`, `table-area`, field, hand, HUD, inspector, control dock, modal, or overlay structure.

## 9. Phase 1 component contract

`ArenaShell` may:

- own the Arena root DOM node;
- expose stable shell data attributes for QA;
- establish layout isolation / box sizing;
- contain the current Arena tree as children.

`ArenaShell` may not:

- read game state;
- mutate game state;
- dispatch actions;
- own player orientation;
- communicate with the server;
- manage match lifecycle;
- implement Battlefield zones yet;
- add gameplay animations yet.

## 10. Phase 0 / Phase 1 acceptance gate

Before Phase 2 starts:

- `ArenaShell` is the root of `Simulator`.
- Legacy `simulator-page` styling remains compatible.
- `Simulator` still owns all current match and interaction state.
- No gameplay file is changed for the shell migration.
- Web-only audit passes.
- Project verification passes.
- Test suite passes where dependencies are available.
- Production Vite build passes where dependencies are available.
- Arena-specific Phase 1 audit passes.

Phase 2 (`Battlefield`) must not begin until this gate is accepted.
