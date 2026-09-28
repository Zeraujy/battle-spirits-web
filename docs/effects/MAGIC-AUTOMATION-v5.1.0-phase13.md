# Phase 13 — Magic Automation

Magic resolution is now staged across the Effect Engine.

- Main and Flash timings use canonical `magicMain` / `magicFlash` events.
- Cost is paid before effect resolution.
- A Magic with a structured player decision remains in `pendingMagicResolution` until the decision chain finishes.
- The card moves to Trash only after the effect queue/decision finishes.
- Flash priority is transferred only after the Magic finishes resolving.
- Existing legacy/manual fallback remains available for unstructured card text.
