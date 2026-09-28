# v5.0.0 — Phase 10/11: Pre-Match Deck Lock & VS Screen

## Scope

This block adds a server-owned deck lock for Casual Matchmaking and a short pre-match VS presentation before the Arena handoff.

## Authority rule

> The client requests. The server decides.

The client submits a deck only when joining Casual Matchmaking. After both players pass Ready Check, the server creates immutable deck snapshots. No deck payload is accepted during `matchmaking:ready` or after the match has been created.

## Deck snapshot

Each locked snapshot contains:

- `snapshotId`
- `deckId`
- `deckName` (server-private match metadata)
- `coverCardId`
- `cardCount`
- `fingerprint`
- `lockedAt`
- immutable `cards`

The fingerprint is calculated from a canonical card/quantity representation. The snapshot is validated against the server card database before the match is created.

Only `locked` and `coverCardId` are exposed by `deckSnapshotPresentation()` for the Casual VS presentation. Deck name, card count, fingerprint and card list remain private.

## VS Screen flow

```text
Ready Check complete
        ↓
Server locks both decks
        ↓
Server creates authoritative MatchSession
        ↓
matchmaking:matched + preMatch presentation
        ↓
Client adopts session
        ↓
Short VS transition (~1.8s)
        ↓
Existing authoritative room:state is handed to Arena
```

The VS transition never creates or mutates `gameState`. It only delays the visual handoff on the client. The server match already exists and remains authoritative.

## Compatibility

- Manual rooms keep their existing start flow.
- Ranked is not migrated in this phase.
- Local and AI are untouched.
- Reconnect and state versioning remain unchanged.
