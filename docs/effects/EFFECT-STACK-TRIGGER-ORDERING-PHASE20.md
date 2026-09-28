# Phase 20 — Effect Stack / Trigger Ordering

Simultaneous dispatcher sources now form a `TriggerBatch` before entering the Effect Queue.

- controller groups are ordered deterministically with the active player group first;
- a controller with one trigger requires no choice;
- a controller with multiple simultaneous triggers receives `chooseTriggerOrder`;
- the chosen order is validated as an exact permutation of the server-owned trigger ids;
- after all ambiguous groups are resolved, the ordered events are enqueued and normal Effect Queue resolution resumes.

This keeps ordering data-driven and avoids card-specific branches.
