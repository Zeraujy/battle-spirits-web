# Phase 11 — Battle Trigger Expansion

Battle events now carry a normalized `battleContext` and are routed through the central Trigger Dispatcher.

## Runtime events

- `whenAttacks`
- `whenBlocks`
- `whenBlocked`
- `whenBattles`
- `beforeBattleResolution`
- `afterBattleResolution`
- `wouldBeDestroyed`
- `wouldLoseLife`
- `whenDestroyed`
- `lifeDecreased`

## Battle context

The dispatcher exposes:

- `battleId`
- `stage`
- `attackerPlayerId`
- `defenderPlayerId`
- `attackerInstanceId`
- `blockerInstanceId`
- `directAttack`
- `blocked`
- `attackerBP`
- `blockerBP`
- attacker/blocker card types

`whenBattles` is emitted for both participants after a block is declared. `whenBlocked` is emitted for the attacker. Before/after resolution events wrap the actual battle result, allowing the new replacement/prevention layer to intervene before destruction or Life loss is committed.
