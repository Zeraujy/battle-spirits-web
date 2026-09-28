# Phase 10 — Replacement & Prevention Effects

The v5.1.0 effect engine now exposes replacement windows for events that can be prevented or replaced before the underlying game mutation is committed.

## Canonical replacement events

- `wouldBeDestroyed`
- `wouldLoseLife`

## DSL actions

```json
{ "type": "preventEvent" }
```

prevents the currently active replacement event.

```json
{
  "type": "replaceEvent",
  "replacementType": "move",
  "destination": "hand"
}
```

replaces the original event with a structured alternative. Destruction replacement currently supports `hand`, `topDeck`, and `bottomDeck` destinations in the battle integration.

The active window is kept in `match.replacementWindow`. The client never decides whether the event was prevented; the rules engine resolves the window and commits the resulting authoritative match state.

Phase 10 intentionally keeps player-choice replacement ordering conservative. Automatic replacement/prevention is supported now; complex competing replacement choices remain part of the later decision/ordering work.
