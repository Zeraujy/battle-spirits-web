# Trigger Dispatcher — v5.1.0 Phase 3

`src/game/effectEngine/triggerDispatcher.js` is now the runtime entry point for card trigger events.

## Flow

```text
Game transition
  -> dispatchEffectEvent(event)
  -> canonical event normalization
  -> source-scoped effects
  -> Effect Schema v2 battlefield observers
  -> condition filtering
  -> existing action/effect resolver
  -> pending decision or resolved match state
```

## Safety model

The dispatcher is intentionally additive and compatibility-safe:

1. Legacy effects keep source-only behavior.
2. A card can observe another card's event only when its entry explicitly uses Effect Schema v2 with `trigger.scope = "controllerField"`.
3. `eventPlayer` relations are evaluated from server/game-state context, not from UI labels.
4. If an effect creates a pending player decision, remaining trigger dispatches are serialized into `continuationEvents` and resume after the decision.
5. The dispatcher mutates no state directly; it delegates resolution to the existing Effect Engine and Action Resolver.

## Runtime integration

Gameplay modules that previously called `resolveCardEvent()` directly now call `dispatchEffectEvent()`:

- summon/deploy
- attack/block/battle destruction
- Magic/Flash and other effect entry points
- manual-play compatibility paths
- special rules / Ultimate Trigger paths

`resolveCardEvent()` remains the lower-level resolver and is still used internally and by focused unit tests.

## Context contract

For observer effects the dispatcher keeps two identities distinct:

- `sourcePlayerId/sourceInstanceId/sourceCard`: the card whose effect is being resolved.
- `eventSourcePlayerId/eventSourceInstanceId/eventSourceCardId`: the card/action that generated the event.
- `eventPlayerId`: the player responsible for the event.

This distinction is the foundation for future conditions such as “when your opponent summons”, “when one of your Spirits is destroyed” and “when either player uses Magic”.
