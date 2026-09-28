# v5.0.0 Online Baseline Audit

## Scope

This audit documents the current Online architecture before the v5.0.0 authoritative-server migration. It is intentionally descriptive. Phase 0 does not change runtime behavior.

## Current runtime boundaries

### Client

Primary client transport: `src/online/socketClient.js`.

The browser client currently:

- opens the Socket.IO connection;
- creates/joins/resumes rooms;
- sends `game:action` intents;
- stores the current room resume tuple (`code`, `playerId`, `resumeToken`);
- reconnects and asks the server to resume the room session.

The client does **not** directly replace the Online match state after a gameplay action. It sends the action and receives room snapshots from the server.

### Server

Primary runtime: `server/index.mjs`.

Current server state is split between:

- `rooms` — room metadata, players, decks, chat, match state and timers;
- `matchmakingQueue` — casual quick-match sockets waiting for pairing;
- `matchmakingPairs` / `matchmakingSocketPair` — transitional casual pairing state;
- `rankedQueue` / `rankedBySocket` — ranked queue state;
- `lobbyPresence` — lobby-facing presence data;
- `socketRoomIndex` — socket-to-room lookup;
- per-room timer handles and ranked disconnect timers.

The current `game:action` flow is already server-applied:

1. server resolves the room and player from the socket;
2. server checks room/match availability;
3. server applies `applyGameAction(room.match, action, playerId, cardIndex)`;
4. server replaces `room.match` with the reducer result;
5. server settles Ranked if a winner exists;
6. server broadcasts a sanitized room snapshot.

This is a strong starting point for v5.0.0 because gameplay actions are already passed through the server reducer.

## Current Socket.IO request surface

The server currently accepts these request events:

- `lobby:identify`
- `lobby:list`
- `matchmaking:join`
- `matchmaking:roomReady`
- `matchmaking:joined`
- `matchmaking:cancel`
- `matchmaking:abort`
- `ranked:join`
- `ranked:cancel`
- `room:create`
- `room:join`
- `room:resume`
- `room:start`
- `room:chat`
- `room:rematch`
- `game:action`

## Existing server-authoritative behavior

The following behaviors are already server-controlled and should be preserved:

- deck validation when creating/joining a room;
- `createMatch(...)` execution on the server;
- gameplay reducer execution on the server;
- hidden-hand/deck sanitization before broadcasting opponent state;
- turn timeout winner assignment;
- Ranked disconnect timeout result;
- Ranked result persistence through the server service-role client;
- resume-token verification before reconnecting a player to a room.

## Current trust gaps and migration targets

### 1. Room object is overloaded

The room currently owns lobby metadata, player transport identity, raw decks, match state, timers, chat, rematch state and Ranked metadata. This makes room lifecycle and match lifecycle difficult to reason about independently.

**v5 target:** move match lifecycle into `MatchSession` while rooms remain a transport/lobby concept during migration.

### 2. No explicit match state version

Room snapshots do not expose an authoritative monotonic match version. Clients therefore cannot reliably distinguish a stale/out-of-order snapshot from the latest accepted server state.

**v5 target:** `stateVersion` on `MatchSession`.

### 3. Connection lifecycle is embedded in player room records

`socketId`, `resumeToken`, Ranked disconnect timers and room membership live together inside `room.players`.

**v5 target:** explicit `MatchPlayer` connection state, followed later by reconnect policy/session-token work.

### 4. Matchmaking state has multiple transient maps

Casual and Ranked use separate arrays/maps with different lifecycle rules. This is functional today but difficult to evolve into Ready Check, deck lock and reusable Friend/Private flows.

**v5 target:** shared matchmaking domain after the authoritative match foundation is stable.

### 5. Result finalization is tied to current room branches

Ranked result settlement is already server-side, but result lifecycle is not yet modeled as a reusable server domain independent from Ranked room handling.

**v5 target:** dedicated result finalization in later phases.

## Migration constraints

The v5.0.0 migration must preserve these behaviors while the new architecture is introduced:

- current Casual rooms continue to work;
- current Ranked queue continues to work;
- Local and AI remain independent from Online server architecture;
- `game:action` keeps using the existing reducer until the validation layer is deliberately introduced;
- hidden information sanitization must never move to the client;
- reconnect must continue to use server-owned state;
- the new `MatchSession` classes must not replace `rooms` during Phase 2.

## Phase 1 domain introduced

The first shared Online domain consists of:

- `MatchMode`
- `MatchStatus`
- `QueueType`
- `PlayerConnectionState`
- `MatchResult`
- `DisconnectReason`
- `OnlineErrorCode`
- Online constants such as player IDs and default reconnect windows.

These are additive contracts and do not change the current socket protocol.

## Phase 2 server foundation introduced

The initial server match domain consists of:

- `MatchPlayer`
- `MatchSession`
- `MatchRegistry`
- `createMatchSession`

`MatchSession` owns the future authoritative match boundary:

- `matchId`
- `mode`
- `status`
- `players`
- `gameState`
- `stateVersion`
- lifecycle timestamps
- match metadata

At this phase it is deliberately **not wired into `server/index.mjs`**. The existing Online flow remains the production path while the new server domain is tested in isolation.

## Authority rule

> The client requests. The server decides.

The client may own presentation and interaction state. Competitive state, legal actions, official match state, match result and reconnect recovery belong to the server-authoritative path.
