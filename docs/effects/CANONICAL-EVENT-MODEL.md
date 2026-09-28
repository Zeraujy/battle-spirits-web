# Canonical Event Model — v5.1.0 Phase 1

`src/game/effectEngine/canonicalEvents.js` is the single vocabulary for effect timing names.

## Rules

1. Card data may temporarily keep legacy timing/event aliases.
2. `normalizeCanonicalEvent()` converts aliases before effect matching.
3. A canonical event being defined does **not** mean the runtime dispatches it yet.
4. `RUNTIME_DISPATCHED_EVENTS` documents the events that are actually emitted by the current engine.
5. The effect coverage audit treats a canonical-but-not-dispatched event as `UNSUPPORTED_TRIGGER` until a real server/gameplay dispatcher exists.

This separation prevents the audit from reporting false automation coverage simply because a timing name is recognized.
