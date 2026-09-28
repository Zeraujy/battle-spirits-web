# v5.1.0 Phase 7 — Core Action Library

Phase 7 centralizes the generic effect vocabulary in `src/game/effectEngine/coreActionLibrary.js`.

## Goals

- One canonical action name per mechanic.
- Legacy aliases remain accepted during catalog migration.
- `Effect Schema v2` validates actions against the same registry used by the runtime.
- No card IDs or per-card branches belong in the action vocabulary.

## Current generic groups

### Card movement

- `draw`
- `discard`
- `moveCard`
- `destroy`
- `returnToHand`
- `returnToDeck`
- `returnToTopDeck`
- `returnToBottomDeck`
- `topDeckToTrash`
- `revealTop`

### Core and Life

- `addCoreToReserveFromVoid`
- `addCoreFromVoid`
- `addCore`
- `removeCore`
- `moveCore`
- `adjustLife`
- `healLife`
- `dealLifeDamage`
- `moveLifeToReserve`
- `moveLifeToTrash`

### State / modifiers

- `modifyBP`
- `modifyCost`
- `modifySymbols`
- `gainKeyword`
- `loseKeyword`
- `addModifier`
- `removeModifier`
- `refresh`
- `exhaust`

### Decisions and control flow

- `selectTarget`
- `selectTrashTarget`
- `selectMultipleTargets`
- `chooseOption`
- `conditional`

Existing Battle Spirits-specific generic operations such as battle restrictions, Ultimate Trigger negation and Burst removal remain registered as well.

## Design rule

A new card should first be expressible as Trigger + Conditions + Selector + Core Actions. Adding a new action type is reserved for a genuinely reusable game mechanic, not for a single card.
