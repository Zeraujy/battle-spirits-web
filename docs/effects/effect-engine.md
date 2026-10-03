# Effect Engine

The effect engine is the rule-processing layer used to automate supported Battle Spirits card effects.

## Core model

The implementation includes canonical events, structured effect schemas, trigger dispatch, effect queues, targeting and conditions, a core action library, continuous modifiers, duration handling, replacement/prevention handling, battle and phase triggers, Magic/Burst/Brave mechanics, advanced decisions, trigger ordering and server-authoritative effect decisions.

## Data boundary

Structured card-effect data and migration state live under `data/effects/`. Runtime rule logic lives under `src/game/effectEngine/`.

## Authority

Local games use the same rule primitives directly. Online matches keep authoritative effect decisions on the server-side match flow.

## Compatibility

Legacy card data may still be interpreted through explicit compatibility paths where required, but new validation should target the current structured engine contracts.
