# Arena Architecture

The Arena is the gameplay presentation layer for Battle Spirits: KAIHOU! Simulator.

## Boundaries

- `src/features/arena/Simulator.jsx` coordinates local and online gameplay presentation.
- Components under `src/features/arena/components/` remain presentation-focused and do not own game-engine or network authority.
- Game rules remain under `src/game/`.
- Online authority remains under `src/online/` and `server/`.
- The client requests actions; authoritative online state is decided by the server.

## Main presentation areas

The Arena keeps separate presentation boundaries for battlefield zones, player and opponent HUDs, hand presentation, resources, contextual actions, phase/timing, targeting, motion, overlays, event feedback, and card inspection.

## Interaction contracts

The current implementation preserves the table drop contract, Life targeting, local action dispatch, online action requests, responsive presentation, and Battle Spirits zones such as Deck, Trash, Burst, Void, Reserve and Life.

## Visual identity

The Arena uses the project's monochrome interface language while preserving semantic game colors such as blue/red Cores and the red Soul Core. Card art remains the primary visual element.
