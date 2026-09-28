# v5.0.0 — Phase 7–9: Casual Matchmaking Foundation

## Scope

This block replaces the legacy Casual quick-match handshake with a server-owned queue and Ready Check flow. Ranked matchmaking is intentionally unchanged.

## Authority rule

**The client requests. The server decides.**

The browser selects a deck and asks to enter the queue. The server validates the public profile and deck, creates the queue entry, pairs players, owns the Ready Check deadline, and creates the match only after both players confirm.

## Server modules

```text
server/matchmaking/
├── QueueEntry.js
├── MatchmakingQueue.js
├── Matchmaker.js
├── ReadyCheckSession.js
├── ReadyCheckRegistry.js
└── index.js
```

### QueueEntry

Canonical server-side queue record:

```text
entryId
socketId
queueType
profile
deck
deckId
deckName
joinedAt
rating
region
metadata
```

### MatchmakingQueue

Responsibilities:

- one queue entry per socket;
- FIFO ordering;
- removal on cancel/disconnect;
- no client-owned queue state.

### Matchmaker

Phase 7–9 uses deterministic FIFO pairing for Casual matches. Rating expansion is reserved for Ranked phases.

### ReadyCheckSession

Server-owned confirmation state:

```text
readyCheckId
createdAt
deadline
status
playerReady
opponentReady
```

The client can only submit `matchmaking:ready`. It cannot extend the deadline, mark the opponent ready, or start the match.

## Socket flow

```text
matchmaking:join
  ↓
server validates profile + deck
  ↓
MatchmakingQueue
  ↓
Matchmaker pairs two QueueEntry records
  ↓
matchmaking:readyCheck
  ↓
matchmaking:ready
  ↓
server verifies both confirmations
  ↓
server creates room + MatchSession + gameState
  ↓
matchmaking:matched
  ↓
room:state
```

## Ready Check timeout

The default window is defined by `DEFAULT_READY_CHECK_WINDOW_MS`.

If one player confirms and the other does not:

- the Ready Check expires on the server;
- the confirmed player is returned to the Casual queue when still connected;
- the unconfirmed player leaves the flow;
- no match is created.

If a player cancels or disconnects during Ready Check, the remaining connected player is returned to the queue.

## Client components

```text
src/components/online/
├── QueueStatus.jsx
└── ReadyCheck.jsx
```

These components render server state only. Countdown display is local presentation derived from the authoritative `deadline` timestamp.

## Legacy flow removed from Casual matchmaking

The following old quick-match handshake is no longer used:

```text
matchmaking:host
matchmaking:guest
matchmaking:roomReady
matchmaking:room
matchmaking:joined
matchmaking:start
```

Manual room creation/join remains untouched and continues to use `room:create`, `room:join`, and `room:start`.

## Out of scope

- Ranked queue migration;
- deck lock snapshots beyond the server-owned queued deck copy;
- VS Screen integration;
- rating-window matchmaking;
- penalties for failed Ready Checks;
- Friend Challenge / Private Match rooms.


## Ready Check clock authority hotfix

The Ready Check countdown is now derived from `remainingMs` calculated by the server. The browser clock is presentation-only and never decides whether a Ready Check has expired. The Ready button remains available until the server accepts or rejects the intent, preserving the rule: **The client requests. The server decides.**
