# v5.0.0 — Phase 19–21

## Scope

- Phase 19 — Match History Reliability
- Phase 20 — Online Error System
- Phase 21 — Online UX Cleanup

## Server-authoritative history

Online and Ranked history records are now derived from the authoritative `MatchSession` on the server after a terminal match state is committed. The client no longer builds or uploads an Online/Ranked result from its own match copy.

The server creates one viewer-specific history record per player and, when a service-role Supabase connection and authenticated account are available, persists those records directly to `bs_match_history`. The same server record is included in `room:state` as `matchHistoryRecord`, allowing the client to cache the official result locally and apply Card Mastery without becoming an authority for match outcome.

Local and AI matches keep the existing local result builder because there is no remote server authority in those modes.

## Online errors

`src/online/errors/onlineErrorMessages.js` is the single user-facing error translator for Online flows. Known error codes receive stable copy and technical/backend messages are filtered before reaching the interface.

`OnlineLobby`, `RankedLobby`, and Online Arena actions consume this translator.

## Lobby UX cleanup

The lobby follows one-action-per-decision:

- Searching exposes `Cancel search` only through `QueueStatus`.
- Ready Check owns Ready/Cancel actions.
- Root matchmaking actions require a valid selected deck before they become interactive.
- Room and challenge states retain only controls relevant to their current decision.

## Authority rule

**The client requests. The server decides.**

Match outcome, history result, Ranked result, disconnect outcome, and official persistence never use client-provided winner/result values.
