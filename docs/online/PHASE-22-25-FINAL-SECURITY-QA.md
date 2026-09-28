# v5.0.0 — Phase 22–25 Final Security & QA

## Phase 22 — Competitive Security Pass

The final competitive hardening pass keeps the server as the only authority for match state, deck locks, Ranked results, abandon penalties and reconnect expiration.

Additional protections:

- Per-socket/per-event rate limiting for Online actions.
- Per-event serialized payload ceilings before handlers run.
- Constant-time comparison for reconnect session tokens.
- Explicit one-activity-at-a-time guard for room entry and queue transitions.
- Opponent hand, deck and face-down Burst sanitation extracted into a tested server boundary.
- Ranked result settlement remains server-derived and never accepts winner/RP from the client.
- Hidden information remains filtered before every `room:state` broadcast.

## Phase 23 — Multiplayer Regression Testing

Regression scope includes:

- Casual queue and Ready Check.
- Deck Lock and VS handoff.
- State versioning and stale-state recovery.
- Reconnect and disconnect lifecycle.
- Friend challenges and private rooms.
- Rematch session replacement.
- Server-authoritative history records.
- Hidden-information boundary and Online event guard.

## Phase 24 — Ranked Regression Testing

Regression scope includes:

- Ranked queue and rating-window matchmaking.
- Duplicate-account queue protection.
- Official deck validation and server Deck Lock.
- Server-only result settlement and RP calculation.
- Concede authority.
- Disconnect timeout and dual-disconnect cancellation.
- Reconnect before timeout.
- Ranked history/result payload generation.

## Phase 25 — Final QA

Release gates:

1. Full structural verification.
2. All v4.9 Arena regression audits.
3. All v5.0 Online phase audits.
4. Multiplayer and Ranked regression suites.
5. UI, release and security audits.
6. Web-only architecture audit.
7. Version synchronization across package, frontend and server health endpoint.
8. Cleanup of temporary/build artifacts before packaging.

v5.0.0 is the first release where the complete Online competitive loop is built around the rule: **the client requests; the server decides.**
