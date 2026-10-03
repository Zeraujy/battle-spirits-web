# Phase 22 — Starter Deck Priority Pass

The Starter Deck pass audits every recipe in `src/data/decks/prebuilt-decks.js` against the runtime catalog and the Effect Coverage report.

A deck is `READY_NO_MANUAL` only when every recipe card exists in the runtime catalog and every card is either `AUTOMATED` or explicitly `NO_EFFECT`.

The first completed migration batch is **SD19 — Ultimate Deck: Scorching Zero**. Its recipe is fully present in the runtime and all 17 unique cards pass the no-manual gate.

Other Starter Decks remain either `NEEDS_MIGRATION` or `BLOCKED_MISSING_RUNTIME_DATA`. Missing-data decks require actual gameplay metadata before effect migration can be truthful.
