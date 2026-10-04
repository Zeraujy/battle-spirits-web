# Arena Redesign Phase 12 — Right Utility Panel

Base: `battle-spirits-web-v5.1.0-arena-redesign-phase11.zip`

## Scope

Phase 12 implements the dedicated right-side utility region from the official Arena redesign roadmap. The panel consolidates turn state, phase tracking, contextual global actions, recent activity, game log and Arena chat without duplicating card-local controls.

## Components

- `ArenaUtilityPanel.jsx`
- `TurnStatusPanel.jsx`
- `PhaseTracker.jsx`
- `PrimaryActionPanel.jsx`
- `RecentActionPanel.jsx`
- `GameLogPanel.jsx`
- `ArenaChatPanel.jsx`

## Authority boundary

The utility panel is presentation-only. It consumes normalized Arena View Model data and optional presentation-safe feed data. Contextual buttons are derived only from already-legal action descriptors. Clicking a button emits `onUtilityActionRequest(action)` back to the controller; React does not dispatch or resolve game actions.

## Data safety

Game Log, Recent Action and Chat feeds are intentionally opt-in through `utilityData`. The redesign does not read raw engine logs, networking transports or server state directly, preventing the panel from accidentally exposing hidden card information.

## Visual behavior

The utility column remains monochromatic and compact, with independent scrolling. The Phase Tracker uses the seven canonical turn steps and collapses labels on constrained screens. Action slots are limited to contextual global actions to avoid duplicating card actions already available on Hand or Battlefield cards.
