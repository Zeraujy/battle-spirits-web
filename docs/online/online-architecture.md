# Online Architecture

Online play follows one authority rule: **the client requests; the server decides**.

## Client

`src/online/` contains client-side online domain definitions, connection state, synchronization, error handling and public-profile helpers. The client submits gameplay intents and consumes authoritative snapshots.

## Server

`server/` owns matchmaking, match sessions, deck lock, reconnection, social match flow, ranked result authority, competitive policies, security checks and sanitized match state.

## State synchronization

Authoritative match state is versioned and synchronized from server to clients. Reconnection and state replacement use server-owned match sessions rather than trusting browser state.

## Security boundary

Private information is sanitized before being sent to opponents. Ranked and competitive results are server-owned. Client-side state must not be treated as authoritative for online match outcomes.
