# v5.1.0 Phase 4 — Effect Queue

## Goal
Provide one deterministic FIFO queue for triggered effect events so chained effects no longer depend on nested ad-hoc `continuationEvents` loops.

## Runtime state
`match.effectQueue` contains:

- `status`: `idle | resolving | waitingForChoice | completed`
- `nextSequence`: monotonic queue sequence
- `items`: pending effect events
- `currentItemId`: item being resolved
- `completedCount`: number of resolved queue items

## Rules
1. Trigger Dispatcher enqueues all source/observer dispatches before resolution.
2. Items are resolved FIFO.
3. If an action creates `pendingEffectDecision`, the queue moves to `waitingForChoice` and stops.
4. When the decision is resolved, the same queue resumes before gameplay continues.
5. Legacy `continuationEvents` are imported into the new queue for backward compatibility.

The queue does not decide trigger ordering rules yet. Phase 20 remains responsible for simultaneous trigger ordering/priority.
