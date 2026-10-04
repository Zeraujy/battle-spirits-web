# Arena Redesign Phase 13 — Burst, Flash and Effect Resolution UX

Base: `battle-spirits-web-v5.1.0-arena-redesign-phase12.zip`

## Scope

Phase 13 implements the Burst, Flash and Effect Resolution UX from the official Arena redesign roadmap while preserving the v5.1.0 Rules Engine as the only gameplay authority.

## Main changes

- Added `ArenaEffectResolutionLayer.jsx` as the presentation boundary for resolution-time UI.
- Added `BurstRevealOverlay.jsx` for active Burst opportunities and controller-owned Activate/Pass requests.
- Added `FlashWindow.jsx` for Flash Timing priority and Pass feedback.
- Added `EffectResolutionPanel.jsx` for pending Effect Engine decisions.
- Added `TargetSelectionPrompt.jsx` for target count/instruction feedback while the existing card interaction layer highlights legal candidates.
- Added `ChoicePrompt.jsx` for option, yes/no, ordering and Core-distribution decisions already exposed through legal action descriptors.
- Added `effectResolutionPresentation.js` as a pure presentation model.
- Pending effect decisions and Burst opportunities are sanitized by the Arena View Model before they enter React presentation.
- Added the optional controller bridge `onEffectActionRequest(action, context)`; Phase 13 never dispatches gameplay actions directly.
- Updated the in-game Patch Notes and Arena documentation.

## Authority boundary

Phase 13 does not validate targets, calculate Burst conditions, transfer Flash priority, resolve effects, calculate Core distributions, execute choices or mutate match state. React only displays authoritative state and emits controller-owned intents.

## Protected baseline

The redesign remains parallel and does not connect to the production Arena route. Protected gameplay, online, server, Supabase, public data and production Simulator paths are expected to remain byte-for-byte unchanged from Phase 12.

## QA

- Focused Phase 13 presentation tests: **3/3 PASS**.
- `npm test`: **180/180 PASS**.
- `npm run verify`: **PASS**, including the new Phase 13 effects UX audit and all earlier Arena redesign audits.
- `npm run regression:full`: **573/573 PASS**.
- `npm run ui:audit`: **PASS**.
- `npm run release:audit`: **PASS**.
- `npm run security:audit`: **PASS**.
- Protected baseline comparison against Phase 12: **1,655 files checked, 0 differences** across `src/game/`, `src/online/`, `server/`, `supabase/`, `public/`, `data/` and `src/features/arena/Simulator.jsx`.

## Build note

`npm run build` was attempted but cannot execute in this source-only environment because the Vite executable is not installed (`vite: not found`). The user's Windows manager/environment remains the final production build gate.
