# v5.0.0 — Phase 15–18 Social Match Flow

## Scope

This block completes the non-Ranked social match lifecycle without changing the game rules engine:

- Phase 15 — Friend Challenge
- Phase 16 — Private Match Rooms
- Phase 17 — Rematch
- Phase 18 — Match Result Screen

## Friend Challenge

Friend Challenge uses authenticated lobby identity plus the existing Social Hub friendship graph.

Flow:

```text
Friend visible in Online Lobby
→ challenge:send
→ server authenticates both lobby identities
→ server verifies accepted friendship
→ challenge:incoming
→ challenged player accepts using the currently selected valid deck
→ server locks both decks
→ new private MatchSession
→ VS presentation
→ Arena
```

The challenge snapshot sent to the opponent never contains the challenger's deck list.

The server is authoritative for challenge expiry, acceptance and room creation.

## Private Match Rooms

The existing room-code workflow is preserved and formalized as `MatchMode.PRIVATE` when a private room is created.

Private rooms continue to support:

- room code
- optional password
- custom first-player setting
- turn timer
- mulligan setting
- ruleset selection

Both decks are locked again on the server before `room:start` creates the match.

## Rematch

Rematch uses `RematchRequest` instead of an unstructured vote object.

Rules:

- available for non-Ranked Online matches
- both players must accept
- a completely new game state is created
- a new MatchSession replaces the finished session
- the previous match state is never reused
- locked deck snapshots are reused as the source deck lists

## Match Result Screen

Post-match presentation is now isolated in:

`src/components/match/MatchResultScreen.jsx`

The same screen is used for Local, AI, Casual/Friend/Private and Ranked outcomes.

The authoritative match still determines winner/reason. Ranked RP remains server-authored through `ranked:result`.

## Authority boundaries

The client may request:

- send challenge
- accept/decline challenge
- create/join private room
- request rematch
- leave/result actions

The server decides:

- whether two accounts are friends
- whether either player is available
- deck legality and deck lock
- challenge expiry
- room/match creation
- official winner/result
- whether a rematch can start
