# v5.0.0 — Phase 12–14 Ranked Authority

## Scope

This block introduces the Ranked competitive foundation without changing Local or AI gameplay.

## Phase 12 — Ranked Queue Foundation

- Ranked now uses `MatchmakingQueue` with `QueueType.RANKED`.
- `RankedMatchmaker` selects the closest eligible rating inside a server-controlled search window.
- The same account cannot queue against itself.
- Ranked deck validation and deck locking happen on the server before a room is created.
- `RankedMatchContext` records the season, rating gap and server match time.

## Phase 13 — Ranked Result Authority

The client never submits a winner, RP delta or final result.

Result flow:

`game action / server policy -> authoritative match winner -> validateMatchResult -> finalizeMatchResult -> resultPersistence -> ranked:result`

`finalizeMatchResult` calculates RP changes on the server and persists them through the service-role Ranked RPC.

## Phase 14 — Abandon & Disconnect Handling

- `match:concede` is an intent only. `AbandonPolicy` decides winner and loser.
- Socket disconnect starts the existing server reconnect window.
- After the reconnect window expires, `DisconnectPolicy` can convert a single-player timeout into a Ranked loss.
- If both players time out disconnected, the server cancels the competitive result instead of awarding an arbitrary win.
- Reconnecting before the deadline cancels the pending disconnect loss.

## Authority Rule

**The client requests. The server decides.**

The client does not own:
- Ranked pairing
- deck validity
- deck lock
- winner selection
- disconnect outcome
- RP calculation
- Ranked persistence
