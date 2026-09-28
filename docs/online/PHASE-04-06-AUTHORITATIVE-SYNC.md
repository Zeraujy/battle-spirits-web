# v5.0.0 Phase 4–6 — Authoritative Sync & Reconnect Foundation

## Principle

> The client requests. The server decides.

Phases 4–6 connect the new `MatchSession` foundation to the existing Online runtime without replacing room transport, matchmaking, Ranked persistence or the Arena protocol.

## Phase 4 — State Versioning & Sync

Every active Online match now has a server-owned `MatchSession` with monotonic:

- `stateVersion`
- `serverSequence`
- `lastUpdatedAt`

`room:state` includes `matchSync`. The game state inside the room snapshot remains viewer-sanitized, while sync metadata is safe to share with both players.

The browser tracks only the last accepted sync metadata. It may send its expected `stateVersion` with `game:action`, but it never sends a replacement game state.

If an explicit client version is stale, the server rejects the action with `STALE_STATE` and returns a fresh authoritative room snapshot.

Compatibility rule during migration: clients that do not yet send `stateVersion` are still accepted. This avoids a hard protocol cutover while the v5.0.0 client/server migration is in progress.

## Phase 5 — Connection State Model

`MatchPlayer` owns Online connection state independently from gameplay state:

- `connected`
- `disconnected`
- `reconnecting`
- `timedOut`
- `left`

Room snapshots expose only safe connection metadata. Socket IDs, session tokens and decks remain private server-side data.

Presentation helpers live under `src/online/connection/` and cannot mutate the match.

## Phase 6 — Reconnect Foundation

The existing `resumeToken` remains supported as a transport compatibility alias for the new server-side `sessionToken` concept.

On disconnect during an active match:

1. the server marks the authoritative `MatchPlayer` as `reconnecting`;
2. the server defines `reconnectDeadline` using `DEFAULT_RECONNECT_WINDOW_MS`;
3. the `MatchSession` and authoritative `gameState` remain on the server;
4. a reconnecting client presents only the session token;
5. the server validates token + deadline;
6. the server reconnects the player and returns the authoritative room snapshot.

The client never uploads a saved match state during reconnect.

Ranked keeps its existing disconnect-forfeit policy. The new reconnect model feeds that policy but does not change its competitive timing in this phase.

## Runtime migration boundary

The room remains the transport/lobby container for v5.0.0 migration compatibility. For active matches:

```text
Room transport
    ↓
MatchSession (authoritative lifecycle + gameState)
    ↓
Server reducer
    ↓
stateVersion / serverSequence
    ↓
Sanitized room snapshot
    ↓
Browser client
```

`room.match` remains as a compatibility mirror of `MatchSession.gameState`. New gameplay actions are applied against the authoritative session state first.

## Explicit non-goals

These phases do not add:

- new matchmaking UI;
- Ready Check;
- new Ranked rating rules;
- abandon penalties;
- Friend Challenge;
- Private Match rooms;
- result-screen redesign.

Those remain later roadmap phases.
