# Battle Spirits: KAIHOU! Simulator — v5.0.0

## Online Matchmaking & Competitive Foundation

- Added server-authoritative MatchSession state, state versioning and reconnect recovery.
- Rebuilt Casual matchmaking with server-owned queues and Ready Check.
- Added server-side Pre-Match Deck Lock and integrated the VS transition.
- Rebuilt Ranked matchmaking on the shared queue foundation.
- Ranked winners, RP changes, concede outcomes and disconnect penalties are now resolved only by the server.
- Added Friend Challenges, private match rooms and server-controlled rematches.
- Added a unified Match Result Screen and server-authoritative Online/Ranked match history records.
- Standardized Online errors and cleaned up ambiguous lobby actions.
- Added final competitive security hardening: event rate limits, payload ceilings, constant-time reconnect-token checks, activity-conflict guards and tested hidden-information sanitation.
- Completed multiplayer, Ranked, UI, release, security and final QA regression passes.
- Preserved the Web-only architecture and the v4.9.1 Arena visual identity.
